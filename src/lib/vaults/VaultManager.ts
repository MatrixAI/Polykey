
import fs from 'fs'
import os from 'os'
import net from 'net'
import Path from 'path'
import git from 'isomorphic-git'
import { EncryptedFS } from 'encryptedfs'
import Vault from '../vaults/Vault'
import HttpRequest from '../HttpRequest'
import KeyManager from '../keys/KeyManager'
import { Address } from '../peers/PeerInfo'

class VaultManager {
  polykeyPath: string
  fileSystem: typeof fs
  keyManager: KeyManager

  metadataPath: string
  vaults: Map<string, Vault>
  vaultKeys: Map<string, Buffer>
  constructor(
    polykeyPath: string = `${os.homedir()}/.polykey`,
    fileSystem: typeof fs,
    keyManager: KeyManager
  ) {
    this.polykeyPath = polykeyPath
    this.fileSystem = fileSystem
    this.keyManager = keyManager
    this.metadataPath = Path.join(polykeyPath, '.vaultKeys')

    // Make polykeyPath if it doesn't exist
    this.fileSystem.mkdirSync(this.polykeyPath, { recursive: true })

    // Initialize stateful variables
    this.vaults = new Map()
    this.vaultKeys = new Map()

    // Read in vault keys
    this.loadMetadata()

    // Initialize vaults in memory
    for (const [vaultName, vaultKey] of this.vaultKeys.entries()) {
      const path = Path.join(this.polykeyPath, vaultName)
      if (this.fileSystem.existsSync(path)) {
        const vault = new Vault(vaultName, vaultKey, this.polykeyPath)
        this.vaults.set(vaultName, vault)
      }
    }
  }

  /**
   * Get a vault from the vault manager
   * @param vaultName Name of desired vault
   */
  getVault(vaultName: string): Vault {
    if (this.vaults.has(vaultName)) {
      const vault = this.vaults.get(vaultName)
      return vault!
    } else if (this.vaultKeys.has(vaultName)) {
      // vault not in map, create new instance
      this.validateVault(vaultName)

      const vaultKey = this.vaultKeys.get(vaultName)

      const vault = new Vault(vaultName, vaultKey!, this.polykeyPath)
      this.vaults.set(vaultName, vault)
      return vault
    } else {
      throw new Error('Vault does not exist in memory')
    }
  }

  /**
   * Get a vault from the vault manager
   * @param vaultName Unique name of new vault
   * @param key Optional key to use for the vault encryption, otherwise it is generated
   */
  async createVault(vaultName: string, key?: Buffer): Promise<Vault> {

    if (this.vaultExists(vaultName)) {
      throw Error('Vault already exists!')
    }

    try {
      const path = Path.join(this.polykeyPath, vaultName)
      // Directory not present, create one
      this.fileSystem.mkdirSync(path, { recursive: true })
      // Create key if not provided
      let vaultKey: Buffer
      if (!key) {
        // Generate new key
        vaultKey = await this.keyManager.generateKey(`${vaultName}-Key`, this.keyManager.getPrivateKey())
      } else {
        // Assign key if it is provided
        vaultKey = key
      }
      this.vaultKeys.set(vaultName, vaultKey)
      this.writeMetadata()
      const vault = new Vault(vaultName, vaultKey, this.polykeyPath)
      await vault.initRepository()
      this.vaults.set(vaultName, vault)
      return this.getVault(vaultName)
    } catch (err) {
      // Delete vault dir and garbage collect
      this.destroyVault(vaultName)
      throw err
    }
  }

  /**
   * Get a vault from the vault manager
   * @param vaultName Name of vault to be cloned
   * @param address Address of polykey node that owns vault to be cloned
   * @param getSocket Function to get an active connection to provided address
   */
  async cloneVault(vaultName: string, address: Address, getSocket: (address: Address) => net.Socket): Promise<Vault> {
    // Confirm it doesn't exist locally already
    if (this.vaultExists(vaultName)) {
      throw new Error('Vault name already exists locally, try pulling instead')
    }

    const vaultUrl = `http://${address.toString()}/${vaultName}`

    const httpRequest = new HttpRequest(address, getSocket)
    // First check if it exists on remote
    const info = await git.getRemoteInfo({
      http: httpRequest,
      url: vaultUrl
    })

    if (!info.refs) {
      throw new Error(`Peer does not have vault: '${vaultName}'`)
    }

    // Create new efs first
    // Generate new key
    const vaultKey = await this.keyManager.generateKey(`${vaultName}-Key`, this.keyManager.getPrivateKey())

    // Set filesystem
    const vfsInstance = new (require('virtualfs')).VirtualFS

    const newEfs = new EncryptedFS(
      vaultKey,
      vfsInstance,
      vfsInstance,
      this.fileSystem,
      process
    )

    // Clone vault from address
    await git.clone({
      fs: { promises: newEfs.promises },
      http: httpRequest,
      dir: Path.join(this.polykeyPath, vaultName),
      url: vaultUrl,
      ref: 'master',
      singleBranch: true
    })

    // Finally return the vault
    const vault = new Vault(vaultName, vaultKey, this.polykeyPath)
    this.vaults.set(vaultName, vault)
    return vault
  }

  /**
   * Determines whether the vault exists
   * @param vaultName Name of desired vault
   */
  vaultExists(vaultName: string): boolean {
    const path = Path.join(this.polykeyPath, vaultName)
    const vaultExists = this.fileSystem.existsSync(path)

    return vaultExists
  }

  /**
   * [WARNING] Destroys a certain vault and all its secrets
   * @param vaultName Name of vault to be destroyed
   */
  destroyVault(vaultName: string) {

    // this is convenience function for removing all tags
    // and triggering garbage collection
    // destruction is a better word as we should ensure all traces is removed

    const path = Path.join(this.polykeyPath, vaultName)
    // Remove directory on file system
    if (this.fileSystem.existsSync(path)) {
      this.fileSystem.rmdirSync(path, { recursive: true })
    }

    // Remove from maps
    this.vaults.delete(vaultName)
    this.vaultKeys.delete(vaultName)

    // Write to metadata file
    this.writeMetadata()

    const vaultPathExists = this.fileSystem.existsSync(path)
    if (vaultPathExists) {
      throw new Error('Vault folder could not be destroyed!')
    }
  }

  /**
   * List the names of all vaults in memory
   */
  listVaults(): string[] {
    return Array.from(this.vaults.keys())
  }

  /* ============ HELPERS =============== */
  private validateVault(vaultName: string): void {
    if (!this.vaults.has(vaultName)) {
      throw Error('Vault does not exist in memory')
    }
    if (!this.vaultKeys.has(vaultName)) {
      throw Error('Vault key does not exist in memory')
    }
    const vaultPath = Path.join(this.polykeyPath, vaultName)
    if (!this.fileSystem.existsSync(vaultPath)) {
      throw Error('Vault directory does not exist')
    }
  }
  private async writeMetadata(): Promise<void> {
    const metadata = JSON.stringify([...this.vaultKeys])
    const encryptedMetadata = await this.keyManager.encryptData(Buffer.from(metadata))
    await this.fileSystem.promises.writeFile(this.metadataPath, encryptedMetadata)
  }
  private async loadMetadata(): Promise<void> {
    // Check if file exists
    if (this.fileSystem.existsSync(this.metadataPath)) {
      const encryptedMetadata = this.fileSystem.readFileSync(this.metadataPath)
      const metadata = (await this.keyManager.decryptData(encryptedMetadata)).toString()

      for (const [key, value] of new Map<string, any>(JSON.parse(metadata))) {
        this.vaultKeys[key] = Buffer.from(value)
      }
    }
  }
}

export default VaultManager
