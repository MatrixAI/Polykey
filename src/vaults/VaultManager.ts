import fs from 'fs';
import os from 'os';
import path from 'path';
import { VirtualFS } from 'virtualfs';
import git from 'isomorphic-git';
import Vault from '../vaults/Vault';
import { Mutex } from 'async-mutex';
import { EncryptedFS } from 'encryptedfs';
import GitBackend from '../git/GitBackend';
import KeyManager from '../keys/KeyManager';
import GitFrontend from '../git/GitFrontend';
import NodeConnection from '../nodes/node-connection/NodeConnection';
import Logger from '@matrixai/logger'

class VaultManager {
  polykeyPath: string;
  private fileSystem: typeof fs;
  private keyManager: KeyManager;
  private connectToNode: (nodeId: string) => NodeConnection;
  private setGitHandlers: (
    handleGitInfoRequest: (vaultName: string) => Promise<Uint8Array>,
    handleGitPackRequest: (
      vaultName: string,
      body: Buffer,
    ) => Promise<Uint8Array>,
    handleGetVaultNames: () => Promise<string[]>,
  ) => void;
  private metadataPath: string;
  private metadataBackupPath: string;
  private vaults: Map<string, Vault>;
  private vaultKeys: Map<string, Buffer>;

  private gitBackend: GitBackend;
  private gitFrontend: GitFrontend;

  private logger: Logger;

  // status
  private creatingVault = false;
  private cloningVault = false;
  private pullingVault = false;
  private deletingVault = false;

  // concurrency
  private metadataMutex: Mutex = new Mutex();

  constructor(
    polykeyPath = `${os.homedir()}/.polykey`,
    fileSystem: typeof fs,
    keyManager: KeyManager,
    connectToNode: (nodeId: string) => NodeConnection,
    setGitHandlers: (
      handleGitInfoRequest: (vaultName: string) => Promise<Uint8Array>,
      handleGitPackRequest: (
        vaultName: string,
        body: Buffer,
      ) => Promise<Uint8Array>,
      handleGetVaultNames: () => Promise<string[]>,
    ) => void,
    logger: Logger,
  ) {
    // class variables
    this.polykeyPath = polykeyPath;
    this.fileSystem = fileSystem;
    this.keyManager = keyManager;
    this.connectToNode = connectToNode;
    this.setGitHandlers = setGitHandlers;
    this.metadataPath = path.join(polykeyPath, '.vaultKeys');
    this.metadataBackupPath = path.join(polykeyPath, '.vaultKeysBackup');

    // Make polykeyPath if it doesn't exist
    this.fileSystem.mkdirSync(this.polykeyPath, { recursive: true });

    // Initialize stateful variables
    this.vaults = new Map();
    this.vaultKeys = new Map();

    this.logger = logger;

    this.gitBackend = new GitBackend(
      polykeyPath,
      ((repoName: string) => this.getVault(repoName).EncryptedFS).bind(this),
      this.getVaultNames.bind(this),
      // this.logger.getLogger('GitBackend'),
      this.logger,
    );
    this.gitFrontend = new GitFrontend(
      this.connectToNode.bind(this),
      // this.logger.getLogger('GitFrontend'),
      this.logger,
    );

    this.setGitHandlers(
      this.gitBackend.handleInfoRequest.bind(this.gitBackend),
      this.gitBackend.handlePackRequest.bind(this.gitBackend),
      this.getVaultNames.bind(this),
    );

    // Read in vault keys
    this.loadEncryptedMetadata();

    this.keyManager.addReencryptHandler(this.reencryptMetadata.bind(this));
  }

  public get Status() {
    return {
      creatingVault: this.creatingVault,
      cloningVault: this.cloningVault,
      pullingVault: this.pullingVault,
      deletingVault: this.deletingVault,
    };
  }

  /**
   * Get the names of all vaults in memory
   */
  getVaultNames(nodeId?: string): string[] {
    const vaultNames = Array.from(this.vaults.keys());
    if (nodeId) {
      const allowedVaultNames: string[] = [];
      for (const vaultName of vaultNames) {
        if (this.getVault(vaultName).nodeCanPull(nodeId)) {
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

      const vault = new Vault(
        vaultName,
        vaultKey!,
        this.polykeyPath,
        this.gitFrontend,
      );
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
    this.creatingVault = true;
    if (this.vaultExists(vaultName)) {
      this.creatingVault = false;
      throw Error('Vault already exists!');
    }

    try {
      const vaultPath = path.join(this.polykeyPath, vaultName);
      // Directory not present, create one
      this.fileSystem.rmdirSync(vaultPath, { recursive: true });
      this.fileSystem.mkdirSync(vaultPath, { recursive: true });
      // Create key if not provided
      let vaultKey: Buffer;
      if (!key) {
        // Generate new key
        vaultKey = await this.keyManager.generateKey(
          `${vaultName}-Key`,
          this.keyManager.getPrivateKeyString(),
          false,
        );
      } else {
        // Assign key if it is provided
        vaultKey = key;
      }
      this.vaultKeys.set(vaultName, vaultKey);
      await this.writeEncryptedMetadata();

      // Create vault
      const vault = new Vault(
        vaultName,
        vaultKey,
        this.polykeyPath,
        this.gitFrontend,
      );
      await vault.initializeVault();

      // Set vault
      this.vaults.set(vaultName, vault);
      const retrievedVault = this.getVault(vaultName);
      this.creatingVault = false;
      return retrievedVault;
    } catch (err) {
      // Delete vault dir and garbage collect
      await this.deleteVault(vaultName);
      this.creatingVault = false;
      throw err;
    }
  }

  /**
   * Get the stats for a particular vault
   * @param vaultName Name of vault to be renamed
   */
  async vaultStats(vaultName: string): Promise<fs.Stats> {
    if (!this.vaultExists(vaultName)) {
      throw Error('vault does not exist');
    }

    const vault = this.vaults.get(vaultName)!;
    return await vault.stats();
  }

  /**
   * Rename an existing new vault
   * @param vaultName Name of vault to be renamed
   * @param newName New name of vault
   */
  async renameVault(vaultName: string, newName: string): Promise<void> {
    if (!this.vaultExists(vaultName)) {
      throw Error('vault does not exist');
    } else if (this.vaultExists(newName)) {
      throw Error('new vault name already exists');
    }

    const vault = this.vaults.get(vaultName)!;
    await vault.rename(newName);
    this.vaults.set(newName, vault);
    this.vaults.delete(vaultName);

    await this.writeEncryptedMetadata();
  }

  /**
   * Clone a vault from a node
   * @param vaultName Name of vault to be cloned
   * @param nodeId NodeId of node that has the vault to be cloned
   */
  async cloneVault(vaultName: string, nodeId: string): Promise<Vault> {
    this.cloningVault = true;
    // Confirm it doesn't exist locally already
    if (this.vaultExists(vaultName)) {
      this.cloningVault = false;
      throw Error('Vault name already exists locally, try pulling instead');
    }

    const vaultPath = path.join(this.polykeyPath, vaultName);
    // Directory not present, create one
    this.fileSystem.rmdirSync(vaultPath, { recursive: true });
    this.fileSystem.mkdirSync(vaultPath, { recursive: true });

    const vaultUrl = `http://0.0.0.0/${vaultName}`;

    // First check if it exists on remote
    const gitRequest = this.gitFrontend.connectToNodeGit(nodeId);
    const info = await git.getRemoteInfo({
      http: gitRequest,
      url: vaultUrl,
    });

    if (!info.refs) {
      this.cloningVault = false;
      throw Error(`Node does not have vault: '${vaultName}'`);
    }

    // Create new efs first
    // Generate new key
    const vaultKey = await this.keyManager.generateKey(
      `${vaultName}-Key`,
      this.keyManager.getPrivateKeyString(),
    );

    // Set filesystem
    const vfsInstance = new VirtualFS();

    const newEfs = new EncryptedFS(
      vaultKey,
      vfsInstance,
      vfsInstance,
      this.fileSystem,
      process,
    );

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
    const vault = new Vault(
      vaultName,
      vaultKey,
      this.polykeyPath,
      this.gitFrontend,
    );
    this.vaults.set(vaultName, vault);
    this.vaultKeys.set(vaultName, vaultKey);
    await this.writeEncryptedMetadata();
    this.cloningVault = false;
    return vault;
  }

  /**
   * Scan vaults of a particulr node
   * @param vaultName Name of vault to be cloned
   * @param nodeId NodeId of node that has the vault to be cloned
   */
  async scanVaultNames(nodeId: string): Promise<string[]> {
    const gitRequest = this.gitFrontend.connectToNodeGit(nodeId);
    const vaultNameList = await gitRequest.scanVaults();
    return vaultNameList;
  }

  /**
   * Pull a vault from a specific node
   * @param vaultName Name of vault to be pulled
   * @param nodeId NodeId of polykey node that owns vault to be pulled
   */
  async pullVault(vaultName: string, nodeId: string) {
    this.pullingVault = true;
    const vault = this.getVault(vaultName);
    await vault.pullVault(nodeId);
    this.pullingVault = false;
  }

  /**
   * Determines whether the vault exists
   * @param vaultName Name of desired vault
   */
  vaultExists(vaultName: string): boolean {
    const vaultPath = path.join(this.polykeyPath, vaultName);
    const vaultExists =
      this.fileSystem.existsSync(vaultPath) && this.vaultKeys.has(vaultName);

    return vaultExists;
  }

  /**
   * [WARNING] Destroys a certain vault and all its secrets
   * @param vaultName Name of vault to be destroyed
   */
  async deleteVault(vaultName: string) {
    if (!this.vaults.has(vaultName) || !this.vaultKeys.has(vaultName)) {
      throw Error(`vault name does not exist: '${vaultName}'`);
    }

    this.deletingVault = true;
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
    this.deletingVault = false;
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
    const release = await this.metadataMutex.acquire();
    const metadata = JSON.stringify([...this.vaultKeys]);
    const encryptedMetadata = await this.keyManager.encryptData(metadata);
    await this.fileSystem.promises.writeFile(
      this.metadataPath,
      encryptedMetadata,
    );
    // write metadata using mnemonic provided by KeyManager
    await this.keyManager.writeFileWithMnemonic(
      this.metadataBackupPath,
      Buffer.from(metadata),
    );
    release();
  }

  async loadEncryptedMetadata(): Promise<void> {
    const release = await this.metadataMutex.acquire();
    // Check if file exists
    if (
      this.fileSystem.existsSync(this.metadataPath) &&
      this.keyManager.KeypairUnlocked
    ) {
      const encryptedMetadata = this.fileSystem
        .readFileSync(this.metadataPath)
        .toString();
      const metadata = await this.keyManager.decryptData(encryptedMetadata);

      for (const [key, value] of new Map<string, any>(JSON.parse(metadata))) {
        this.vaultKeys.set(key, Buffer.from(value));
      }
      // Initialize vaults in memory
      for (const [vaultName, vaultKey] of this.vaultKeys.entries()) {
        const vaultPath = path.join(this.polykeyPath, vaultName);

        if (
          this.fileSystem.existsSync(vaultPath) &&
          this.vaultKeys.has(vaultName)
        ) {
          const vault = new Vault(
            vaultName,
            vaultKey,
            this.polykeyPath,
            this.gitFrontend,
          );
          this.vaults.set(vaultName, vault);
        }
      }
    }

    release();
  }

  async reencryptMetadata(
    decryptOld: (data: Buffer) => Promise<Buffer>,
    encryptNew: (data: Buffer) => Promise<Buffer>,
  ) {
    // can only re-encrypt if metadata file exists
    if (this.fileSystem.existsSync(this.metadataPath)) {
      const release = await this.metadataMutex.acquire();
      // first decrypt with old keypair
      const decryptedData = await decryptOld(
        this.fileSystem.readFileSync(this.metadataPath),
      );

      // encrypt loaded data with new keypair
      const reencryptedData = await encryptNew(decryptedData);

      // write reencrypted data back to file
      fs.writeFileSync(this.metadataPath, reencryptedData);
      release();
      // reload new metadata
      await this.loadEncryptedMetadata();
    }
  }
}

export default VaultManager;
