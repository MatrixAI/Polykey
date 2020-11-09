import fs from 'fs';
import os from 'os';
import path from 'path';
import git from 'isomorphic-git';
import * as opentelemetry from '@opentelemetry/api'
import { getTracer } from '../tracing/Tracer';
import Vault from '../vaults/Vault';
import { EncryptedFS } from 'encryptedfs';
import GitBackend from '../git/GitBackend';
import KeyManager from '../keys/KeyManager';
import GitFrontend from '../git/GitFrontend';
import PeerConnection from '../peers/peer-connection/PeerConnection';

class VaultManager {
  polykeyPath: string;
  private fileSystem: typeof fs;
  private keyManager: KeyManager;
  private connectToPeer: (peerId: string) => PeerConnection;
  private setGitHandler: (handler: (request: Uint8Array, publicKey: string) => Promise<Uint8Array>) => void;

  private metadataPath: string;
  private vaults: Map<string, Vault>;
  private vaultKeys: Map<string, Buffer>;

  private gitBackend: GitBackend;
  private gitFrontend: GitFrontend;

  // status
  private creatingVault: boolean = false;
  private cloningVault: boolean = false;
  private pullingVault: boolean = false;
  private deletingVault: boolean = false;

  constructor(
    polykeyPath: string = `${os.homedir()}/.polykey`,
    fileSystem: typeof fs,
    keyManager: KeyManager,
    connectToPeer: (peerId: string) => PeerConnection,
    setGitHandler: (handler: (request: Uint8Array, publicKey: string) => Promise<Uint8Array>) => void,
  ) {
    const span = getTracer('vault_manager').startSpan('vault_manager_construction')

    // class variables
    this.polykeyPath = polykeyPath;
    this.fileSystem = fileSystem;
    this.keyManager = keyManager;
    this.connectToPeer = connectToPeer;
    this.setGitHandler = setGitHandler;
    this.metadataPath = path.join(polykeyPath, '.vaultKeys');

    // Make polykeyPath if it doesn't exist
    this.fileSystem.mkdirSync(this.polykeyPath, { recursive: true });
    span.setAttribute('polykey path created', this.polykeyPath)

    // Initialize stateful variables
    this.vaults = new Map();
    this.vaultKeys = new Map();

    this.gitBackend = new GitBackend(
      polykeyPath,
      ((repoName: string) => this.getVault(repoName).EncryptedFS).bind(this),
      this.getVaultNames.bind(this),
    );
    span.setAttribute('git backend initialized')
    this.gitFrontend = new GitFrontend(this.connectToPeer.bind(this));
    span.setAttribute('git frontend initialized')

    this.setGitHandler(this.gitBackend.handleGitMessage.bind(this.gitBackend));
    span.setAttribute('git handler set')

    // Read in vault keys
    this.loadEncryptedMetadata(span);
    span.end()
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
  getVaultNames(peerId?: string): string[] {
    const vaultNames = Array.from(this.vaults.keys());
    if (peerId) {
      const allowedVaultNames: string[] = [];
      for (const vaultName of vaultNames) {
        if (this.getVault(vaultName).peerCanAccess(peerId)) {
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
    const span = getTracer('vault_manager').startSpan('get_vault')
    span.setAttribute('retrieving vault name', vaultName)
    try {
      if (this.vaults.has(vaultName)) {
        span.setAttribute('vault exists')
        const vault = this.vaults.get(vaultName);
        span.setAttribute('returning existing vault from memory')
        return vault!;
      } else if (this.vaultKeys.has(vaultName)) {
        span.setAttribute('vault key exists')
        // vault not in map, create new instance
        this.validateVault(vaultName);
        span.setAttribute('vault validated')

        const vaultKey = this.vaultKeys.get(vaultName);
        span.setAttribute('retrieved vault key')

        const vault = new Vault(vaultName, vaultKey!, this.polykeyPath, this.gitFrontend);
        span.setAttribute('vault instance created')
        this.vaults.set(vaultName, vault);
        span.setAttribute('returning existing vault from key')
        return vault;
      } else {
        const error = Error(`vault does not exist in memory: '${vaultName}'`)
        span.setAttribute('error', error.toString())
        throw error;
      }
    } catch (error) {
      span.setAttribute('error', error.toString())
      throw error
    } finally {
      span.end()
    }
  }

  /**
   * Create a new vault
   * @param vaultName Unique name of new vault
   * @param key Optional key to use for the vault encryption, otherwise it is generated
   */
  async newVault(vaultName: string, key?: Buffer): Promise<Vault> {
    const span = getTracer('vault_manager').startSpan('new_vault')
    span.setAttribute('creating new vault', vaultName)
    span.setAttribute('key was provided', key != undefined)
    this.creatingVault = true;
    if (this.vaultExists(vaultName)) {
      span.setAttribute('vault exists')
      span.end()
      this.creatingVault = false;
      throw Error('Vault already exists!');
    }

    try {
      const vaultPath = path.join(this.polykeyPath, vaultName);
      // Directory not present, create one
      this.fileSystem.mkdirSync(vaultPath, { recursive: true });
      span.setAttribute('vault path was created')
      // Create key if not provided
      let vaultKey: Buffer;
      if (!key) {
        // Generate new key
        vaultKey = await this.keyManager.generateKey(`${vaultName}-Key`, this.keyManager.getPrivateKey(), false);
        span.setAttribute('vault key was created')
      } else {
        // Assign key if it is provided
        vaultKey = key;
        span.setAttribute('vault key was assigned')
      }
      this.vaultKeys.set(vaultName, vaultKey);
      await this.writeEncryptedMetadata(span);
      span.setAttribute('encrypted metadata was written')

      // Create vault
      const vault = new Vault(vaultName, vaultKey, this.polykeyPath, this.gitFrontend);
      await vault.initializeVault();
      span.setAttribute('vault instance was initialized')

      // Set vault
      this.vaults.set(vaultName, vault);
      const retrievedVault = this.getVault(vaultName);
      this.creatingVault = false;
      span.setAttribute('returning new vault instance')
      return retrievedVault;
    } catch (err) {
      span.setAttribute('error', err.toString())
      // Delete vault dir and garbage collect
      await this.deleteVault(vaultName);
      span.setAttribute('vault deleted')
      this.creatingVault = false;
      throw err;
    } finally {
      span.end()
    }
  }

  /**
   * Clone a vault from a peer
   * @param vaultName Name of vault to be cloned
   * @param address Address of polykey node that owns vault to be cloned
   * @param getSocket Function to get an active connection to provided address
   */
  async cloneVault(vaultName: string, publicKey: string): Promise<Vault> {
    this.cloningVault = true;
    // Confirm it doesn't exist locally already
    if (this.vaultExists(vaultName)) {
      this.cloningVault = false;
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
      this.cloningVault = false;
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
    this.vaultKeys.set(vaultName, vaultKey);
    await this.writeEncryptedMetadata();
    this.cloningVault = false;
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
    this.pullingVault = true;
    const vault = this.getVault(vaultName);
    await vault.pullVault(publicKey);
    this.pullingVault = false;
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

  private async writeEncryptedMetadata(span?: opentelemetry.Span): Promise<void> {
    const childSpan = getTracer('vault_manager').startSpan('write_encrypted_metadata', { parent: span })
    try {
      const metadata = JSON.stringify([...this.vaultKeys]);
      const encryptedMetadata = await this.keyManager.encryptData(Buffer.from(metadata));
      await this.fileSystem.promises.writeFile(this.metadataPath, encryptedMetadata);
      childSpan.setAttribute('metadata written', undefined)
    } catch (error) {
      childSpan.setAttribute('error', error)
    } finally {
      childSpan.end()
    }
  }

  async loadEncryptedMetadata(span?: opentelemetry.Span): Promise<void> {
    const childSpan = getTracer('vault_manager').startSpan('load_encrypted_metadata', { parent: span })
    try {
      // Check if file exists
      if (this.fileSystem.existsSync(this.metadataPath) && this.keyManager.KeypairUnlocked) {
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
      } else {
        childSpan.setAttributes({
          'metadata not loaded': undefined,
          'metapath exists boolean': this.fileSystem.existsSync(this.metadataPath),
          'keypair unlocked boolean': this.keyManager.KeypairUnlocked,
        })
      }
    } catch (error) {
      childSpan.setAttribute('error', error)
    } finally {
      childSpan.end()
    }
  }
}

export default VaultManager;
