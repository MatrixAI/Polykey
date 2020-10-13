import fs from 'fs';
import os from 'os';
import path from 'path';
import git from 'isomorphic-git';
import Vault from '../vaults/Vault';
import { EncryptedFS } from 'encryptedfs';
import GitBackend from '../git/GitBackend';
import KeyManager from '../keys/KeyManager';
import GitFrontend from '../git/GitFrontend';
import PeerManager from '../peers/PeerManager';

class VaultManager {
  polykeyPath: string;
  private fileSystem: typeof fs;
  private keyManager: KeyManager;
  private peerManager: PeerManager;

  private metadataPath: string;
  private vaults: Map<string, Vault>;
  private vaultKeys: Map<string, Buffer>;

  private gitBackend: GitBackend;
  private gitFrontend: GitFrontend;

  constructor(
    polykeyPath: string = `${os.homedir()}/.polykey`,
    fileSystem: typeof fs,
    keyManager: KeyManager,
    peerManager: PeerManager,
  ) {
    this.polykeyPath = polykeyPath;
    this.fileSystem = fileSystem;
    this.keyManager = keyManager;
    this.peerManager = peerManager;
    this.metadataPath = path.join(polykeyPath, '.vaultKeys');

    // Make polykeyPath if it doesn't exist
    this.fileSystem.mkdirSync(this.polykeyPath, { recursive: true });

    // Initialize stateful variables
    this.vaults = new Map();
    this.vaultKeys = new Map();

    this.gitBackend = new GitBackend(
      polykeyPath,
      ((repoName: string) => this.getVault(repoName).EncryptedFS).bind(this),
      this.getVaultNames.bind(this),
    );
    this.gitFrontend = new GitFrontend(peerManager);

    this.peerManager.setGitHandler(this.gitBackend.handleGitMessage.bind(this.gitBackend));

    // Read in vault keys
    this.loadEncryptedMetadata();
  }

  /**
   * Get the names of all vaults in memory
   */
  getVaultNames(publicKey?: string): string[] {
    const vaultNames = Array.from(this.vaults.keys());
    if (publicKey) {
      const allowedVaultNames: string[] = [];
      for (const vaultName of vaultNames) {
        if (this.getVault(vaultName).peerCanAccess(publicKey)) {
          allowedVaultNames.push(vaultName);
        }
      }
      return allowedVaultNames;
    } else {
      return vaultNames;
    }
  }

  /**
   * Get a vault from the vault manager
   * @param vaultName Name of desired vault
   */
  getVault(vaultName: string): Vault {
    if (this.vaults.has(vaultName)) {
      const vault = this.vaults.get(vaultName);
      return vault!;
    } else if (this.vaultKeys.has(vaultName)) {
      // vault not in map, create new instance
      this.validateVault(vaultName);

      const vaultKey = this.vaultKeys.get(vaultName);

      const vault = new Vault(vaultName, vaultKey!, this.polykeyPath, this.gitFrontend);
      this.vaults.set(vaultName, vault);
      return vault;
    } else {
      throw Error(`vault does not exist in memory: '${vaultName}'`);
    }
  }

  /**
   * Create a new vault
   * @param vaultName Unique name of new vault
   * @param key Optional key to use for the vault encryption, otherwise it is generated
   */
  async newVault(vaultName: string, key?: Buffer): Promise<Vault> {
    if (this.vaultExists(vaultName)) {
      throw Error('Vault already exists!');
    }

    try {
      const vaultPath = path.join(this.polykeyPath, vaultName);
      // Directory not present, create one
      this.fileSystem.mkdirSync(vaultPath, { recursive: true });
      // Create key if not provided
      let vaultKey: Buffer;
      if (!key) {
        // Generate new key
        vaultKey = await this.keyManager.generateKey(`${vaultName}-Key`, this.keyManager.getPrivateKey(), false);
      } else {
        // Assign key if it is provided
        vaultKey = key;
      }
      this.vaultKeys.set(vaultName, vaultKey);
      await this.writeEncryptedMetadata();

      // Create vault
      const vault = new Vault(vaultName, vaultKey, this.polykeyPath, this.gitFrontend);
      await vault.initializeVault();

      // Set vault
      this.vaults.set(vaultName, vault);
      return this.getVault(vaultName);
    } catch (err) {
      // Delete vault dir and garbage collect
      await this.deleteVault(vaultName);
      throw err;
    }
  }

  /**
   * Clone a vault from a peer
   * @param vaultName Name of vault to be cloned
   * @param address Address of polykey node that owns vault to be cloned
   * @param getSocket Function to get an active connection to provided address
   */
  async cloneVault(vaultName: string, publicKey: string): Promise<Vault> {
    // Confirm it doesn't exist locally already
    if (this.vaultExists(vaultName)) {
      throw Error('Vault name already exists locally, try pulling instead');
    }

    const vaultUrl = `http://0.0.0.0/${vaultName}`;

    // First check if it exists on remote
    const gitRequest = this.gitFrontend.connectToPeerGit(publicKey);
    const info = await git.getRemoteInfo({
      http: gitRequest,
      url: vaultUrl,
    });

    if (!info.refs) {
      throw Error(`Peer does not have vault: '${vaultName}'`);
    }

    // Create new efs first
    // Generate new key
    const vaultKey = await this.keyManager.generateKey(`${vaultName}-Key`, this.keyManager.getPrivateKey());

    // Set filesystem
    const vfsInstance = new (require('virtualfs').VirtualFS)();

    const newEfs = new EncryptedFS(vaultKey, vfsInstance, vfsInstance, this.fileSystem, process);

    // Clone vault from address
    await git.clone({
      fs: { promises: newEfs.promises },
      http: gitRequest,
      dir: path.join(this.polykeyPath, vaultName),
      url: vaultUrl,
      ref: 'master',
      singleBranch: true,
    });

    // Finally return the vault
    const vault = new Vault(vaultName, vaultKey, this.polykeyPath, this.gitFrontend);
    this.vaults.set(vaultName, vault);
    return vault;
  }

  async scanVaultNames(publicKey: string): Promise<string[]> {
    const gitRequest = this.gitFrontend.connectToPeerGit(publicKey);
    const vaultNameList = await gitRequest.scanVaults();
    return vaultNameList;
  }

  /**
   * Pull a vault from a specific peer
   * @param vaultName Name of vault to be pulled
   * @param publicKey Public key of polykey node that owns vault to be pulled
   */
  async pullVault(vaultName: string, publicKey: string) {
    const vault = this.getVault(vaultName);
    await vault.pullVault(publicKey);
  }

  /**
   * Determines whether the vault exists
   * @param vaultName Name of desired vault
   */
  vaultExists(vaultName: string): boolean {
    const vaultPath = path.join(this.polykeyPath, vaultName);
    const vaultExists = this.fileSystem.existsSync(vaultPath);

    return vaultExists;
  }

  /**
   * [WARNING] Destroys a certain vault and all its secrets
   * @param vaultName Name of vault to be destroyed
   */
  async deleteVault(vaultName: string) {
    // this is convenience function for removing all tags
    // and triggering garbage collection
    // destruction is a better word as we should ensure all traces are removed

    const vaultPath = path.join(this.polykeyPath, vaultName);
    // Remove directory on file system
    if (this.fileSystem.existsSync(vaultPath)) {
      this.fileSystem.rmdirSync(vaultPath, { recursive: true });
    }

    // Remove from maps
    this.vaults.delete(vaultName);
    this.vaultKeys.delete(vaultName);

    // Write to metadata file
    await this.writeEncryptedMetadata();

    const vaultPathExists = this.fileSystem.existsSync(vaultPath);
    if (vaultPathExists) {
      throw Error('Vault folder could not be deleted!');
    }
  }

  /* ============ HELPERS =============== */
  private validateVault(vaultName: string): void {
    if (!this.vaults.has(vaultName)) {
      throw Error(`vault does not exist in memory: '${vaultName}'`);
    }
    if (!this.vaultKeys.has(vaultName)) {
      throw Error(`vault key does not exist in memory: '${vaultName}'`);
    }
    const vaultPath = path.join(this.polykeyPath, vaultName);
    if (!this.fileSystem.existsSync(vaultPath)) {
      throw Error(`vault directory does not exist: '${vaultPath}'`);
    }
  }

  private async writeEncryptedMetadata(): Promise<void> {
    const metadata = JSON.stringify([...this.vaultKeys]);
    const encryptedMetadata = await this.keyManager.encryptData(Buffer.from(metadata));
    await this.fileSystem.promises.writeFile(this.metadataPath, encryptedMetadata);
  }

  async loadEncryptedMetadata(): Promise<void> {
    // Check if file exists
    if (this.fileSystem.existsSync(this.metadataPath) && this.keyManager.identityLoaded) {
      const encryptedMetadata = this.fileSystem.readFileSync(this.metadataPath);
      const metadata = (await this.keyManager.decryptData(encryptedMetadata)).toString();

      for (const [key, value] of new Map<string, any>(JSON.parse(metadata))) {
        this.vaultKeys.set(key, Buffer.from(value));
      }
      // Initialize vaults in memory
      for (const [vaultName, vaultKey] of this.vaultKeys.entries()) {
        const vaultPath = path.join(this.polykeyPath, vaultName);

        if (this.fileSystem.existsSync(vaultPath)) {
          const vault = new Vault(vaultName, vaultKey, this.polykeyPath, this.gitFrontend);
          this.vaults.set(vaultName, vault);
        }
      }
    }
  }
}

export default VaultManager;
