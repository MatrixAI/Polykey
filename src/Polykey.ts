import os from 'os'
import fs from 'fs'
import Path from 'path'
import Vault from '@polykey/VaultStore/Vault'
import crypto from 'crypto'
import jsonfile from 'jsonfile'
import { KeyManager } from '@polykey/KeyManager'
import VaultStore from './VaultStore/VaultStore'
import GitServer from './GitServer/GitServer'

type Metadata = {
  vaults: {
    [vaultName: string]: {
      key: Buffer, tags: Array<string>
    }
  }
  publicKeyPath: string | null
  privateKeyPath: string | null
  passphrase: string | null
}

const vaultKeySize = 128/8 // in bytes

export default class Polykey {
  polykeyPath: string
  private fs: typeof fs
  private key: Buffer
  private keySize: number
  private metadata: Metadata
  private metadataPath: string
  km: KeyManager
  private vaultStore: VaultStore

  private gitServer: GitServer

  constructor(
    km?: KeyManager,
    polykeyPath: string = `${os.homedir()}/.polykey`
  ) {
    this.km = km || new KeyManager(this.polykeyPath)
    this.polykeyPath = polykeyPath
    this.metadataPath = Path.join(this.polykeyPath, 'metadata')
    // Set file system
    this.fs = fs
    // Initialize reamining members
    this.vaultStore = new VaultStore()
    this.gitServer = new GitServer(this.polykeyPath, this.vaultStore)
    this.metadata = {
      vaults: {},
      publicKeyPath: null,
      privateKeyPath: null,
      passphrase: null
    }
    // sync with polykey directory
    this.initSync()
  }

  static get KeyManager() {
    return KeyManager
  }
  private async fileExists(path: string): Promise<boolean> {
    return this.fs.existsSync(path)
  }
  private fileExistsSync(path: string): boolean {
    return this.fs.existsSync(path)
  }

  /////////////
  // Secrets //
  /////////////
  async secretExists(vaultName: string, secretName: string): Promise<boolean> {
    const vault = await this.getVault(vaultName)
    const secretExists = vault.secretExists(secretName)

    return secretExists
  }

  async addSecret(vaultName: string, secretName: string, secret: Buffer): Promise<void> {
    let vault: Vault
    try {
      vault = await this.getVault(vaultName)
      await vault.addSecret(secretName, secret)
    } catch(err) {
      throw err
    }
  }

  async updateSecret(vaultName: string, secretName: string, secret: Buffer): Promise<void> {
    let vault: Vault
    try {
      vault = await this.getVault(vaultName)
      await vault.updateSecret(secretName, secret)
    } catch(err) {
      throw err
    }
  }

  async removeSecret(vaultName: string, secretName: string): Promise<void> {
    let vault: Vault
    try {
      vault = await this.getVault(vaultName)
      await vault.removeSecret(secretName)
    } catch(err) {
      throw err
    }
  }

  async getSecret(vaultName: string, secretName: string): Promise<Buffer | string> {
    let vault: Vault
    let secret: string | Buffer
    try {
      vault = await this.getVault(vaultName)
      secret = vault.getSecret(secretName)
    } catch(err) {
      throw err
    }
    return secret
  }

  async copySecret(vaultName: string, secretName: string): Promise<Buffer | string> {
    let vault: Vault
    let secret: string | Buffer
    try {
      vault = await this.getVault(vaultName)
      secret = vault.getSecret(secretName)
    } catch(err) {
      throw err
    }
    return secret
  }

  /////////////
  // Vaults //
  /////////////
  async createVault(vaultName: string, key: Buffer | undefined = undefined): Promise<Vault> {
    const path = Path.join(this.polykeyPath, vaultName)
    let vaultExists: boolean
    try {
      vaultExists = await this.fileExists(path)
    } catch(err) {
      throw err
    }

    if (vaultExists) {
      throw Error('Vault already exists!')
    }

    try {
      // Directory not present, create one
      this.fs.mkdirSync(path, {recursive:true})
      // Create key if not provided
      let vaultKey: Buffer
      if (key === undefined) {
        // Generate new key
        vaultKey = Buffer.from(crypto.randomBytes(vaultKeySize))
      } else {
        // Assign key if it is provided
        vaultKey = key
      }
      this.metadata.vaults[vaultName] = { key: vaultKey, tags: []}
      await this.writeMetadata()
      const vault = new Vault(vaultName, vaultKey, this.polykeyPath)
      this.vaultStore.setVault(vaultName, vault)
      return await this.getVault(vaultName)
    } catch (err) {
      // Delete vault dir and garbage collect
      await this.destroyVault(vaultName)
      throw err
    }
  }

  async vaultExists(vaultName: string): Promise<boolean> {
    const path = Path.join(this.polykeyPath, vaultName)
    const vaultExists = this.fs.existsSync(path)

    return vaultExists
  }

  async destroyVault(vaultName: string) {

    // this is convenience function for removing all tags
    // and triggering garbage collection
    // destruction is a better word as we should ensure all traces is removed

    const path = Path.join(this.polykeyPath, vaultName)
    // Remove directory on file system
    if (this.fs.existsSync(path)) {
      this.fs.rmdirSync(path, {recursive: true})
    }
    // Remaining garbage collection:
    // Remove vault from vaults map
    if (this.vaultStore.hasVault(vaultName)) {
      this.vaultStore.deleteVault(vaultName)
    }
    // Remove from metadata
    if (this.metadata.vaults.hasOwnProperty(vaultName)) {
      delete this.metadata.vaults[vaultName]
      await this.writeMetadata()
    }

    const vaultPathExists = this.fs.existsSync(path)
    if (vaultPathExists) {
      throw(Error('Vault path could not be destroyed!'))
    }
    const vaultEntryExists = this.vaultStore.hasVault(vaultName)
    if (vaultEntryExists) {
      throw(Error('Vault could not be removed from PolyKey!'))
    }
    const metaDataHasVault = this.metadata.vaults.hasOwnProperty(vaultName)
    if (metaDataHasVault) {
      throw(Error('Vault metadata could not be destroyed!'))
    }
  }

  async importKeyPair(privateKeyPath: string, publicKeyPath: string, passphrase: string = '') {
    await this.km.loadKeyPair(privateKeyPath, publicKeyPath, passphrase)
    this.metadata.publicKeyPath = publicKeyPath
    this.metadata.privateKeyPath = privateKeyPath
    this.metadata.passphrase = passphrase
    this.writeMetadata()
  }

  /* Validates whether all the artefacts needed to operate
  * a Vault are present. Namely this the vault directory
  * and the metadata for the vault containg the key
  */
  private async validateVault (vaultName: string): Promise<void> {
    const existsMeta = this.metadata.vaults.hasOwnProperty(vaultName)
    if (!existsMeta) {
      throw Error('Vault metadata does not exist')
    }
    const vaultPath = Path.join(this.polykeyPath, vaultName)
    const existsFS = await this.fileExists(vaultPath)
    if (!existsFS) {
      throw Error('Vault directory does not exist')
    }
  }

  removeItem () {

  }

  listItems () {

  }

  listVaults(): string[] {
    return this.vaultStore.getVaultNames()
  }

  async listSecrets(vaultName: string): Promise<string[]> {
    const vault = await this.getVault(vaultName)
    return vault.listSecrets()
  }

  async verifyFile(filePath: string, signaturePath: string, publicKey: string | Buffer | undefined = undefined): Promise<string> {
    try {
      // Get key if provided
      let keyBuffer: Buffer | undefined
      if (publicKey !== undefined) {
        if (typeof publicKey === 'string') {  // Path
          // Read in from fs
          keyBuffer = Buffer.from(this.fs.readFileSync(publicKey))
        } else {  // Buffer
          keyBuffer = publicKey
        }
      } else {
        // Load keypair into KeyManager from metadata
        const publicKeyPath = this.metadata.publicKeyPath
        const privateKeyPath = this.metadata.privateKeyPath
        const passphrase = this.metadata.passphrase
        if (publicKeyPath !== null && privateKeyPath !== null && passphrase !== null) {
          await this.km.loadKeyPair(
            privateKeyPath,
            publicKeyPath,
            passphrase
          )
        }
      }
      // Read in file buffer and signature
      const fileBuffer = Buffer.from(this.fs.readFileSync(filePath, undefined))
      const signatureBuffer = Buffer.from(this.fs.readFileSync(signaturePath, undefined))
      const verified = await this.km.verifyData(fileBuffer, signatureBuffer, keyBuffer)
      return verified
    } catch (err) {
      throw(err)
    }
  }

  async signFile(path: string, privateKey: string | Buffer | undefined = undefined, privateKeyPassphrase: string | undefined = undefined): Promise<string> {
    try {
      // Get key if provided
      let keyBuffer: Buffer | undefined
      if (privateKey !== undefined) {
        if (typeof privateKey === 'string') {  // Path
          // Read in from fs
          keyBuffer = Buffer.from(this.fs.readFileSync(privateKey))
        } else {  // Buffer
          keyBuffer = privateKey
        }
      } else {
        // Load keypair into KeyManager from metadata
        const publicKeyPath = this.metadata.publicKeyPath
        const privateKeyPath = this.metadata.privateKeyPath
        const passphrase = this.metadata.passphrase
        if (publicKeyPath !== null && privateKeyPath !== null && passphrase !== null) {
          await this.km.loadKeyPair(
            privateKeyPath,
            publicKeyPath,
            passphrase
          )
        }
      }
      // Read file into buffer
      const buffer = Buffer.from(this.fs.readFileSync(path, undefined))
      // Sign the buffer
      const signedBuffer = await this.km.signData(buffer, keyBuffer, privateKeyPassphrase)
      // Write buffer to signed file
      const signedPath = `${path}.sig`
      this.fs.writeFileSync(signedPath, signedBuffer)
      return signedPath
    } catch (err) {
      throw(Error(`failed to sign file: ${err}`))
    }
  }

  tagVault() {

  }

  untagVault() {

  }

  shareVault() {

  }

  unshareVault() {

  }

  async start() {
    const gitAddress = this.gitServer.listen()
    return gitAddress
  }


  /* ============ HELPERS =============== */
  private async writeMetadata(): Promise<void> {
    try {
      await jsonfile.writeFile(this.metadataPath, this.metadata)
    } catch (err) {
      throw Error("Error writing vault key to config file")
    }
  }

  private async getVault(vaultName: string): Promise<Vault> {
    if (this.vaultStore.hasVault(vaultName)) {
      const vault = this.vaultStore.getVault(vaultName)
      if (vault) {
        return vault
      }
    }
    // vault not in map, create new instance
    try {
      await this.validateVault(vaultName)
    } catch(err) {
      throw err
    }
    const vaultKey = this.metadata.vaults[vaultName].key
    const vault = new Vault(vaultName, vaultKey, this.polykeyPath)
    this.vaultStore.setVault(vaultName, vault)
    return vault
  }

  initSync(): void {
    // check if .polykey exists
    //  make folder if doesn't
    if (!this.fs.existsSync(this.polykeyPath)) {
      this.fs.mkdirSync(this.polykeyPath, {recursive: true})
      const metadataTemplate = {
        vaults: {},
        publicKeyPath: null,
        privateKeyPath: null,
        passphrase: null
      }
      jsonfile.writeFileSync(this.metadataPath, metadataTemplate)
      this.metadata = metadataTemplate
    } else if (this.fs.existsSync(this.metadataPath)) {
      this.metadata = jsonfile.readFileSync(this.metadataPath)
    }

    // Load all of the vaults into memory
    for (const vaultName in this.metadata.vaults) {
      if (this.metadata.vaults.hasOwnProperty(vaultName)) {
        const path = Path.join(this.polykeyPath, vaultName)
        if (this.fileExistsSync(path)) {
          try {
            const vaultKey = Buffer.from(this.metadata.vaults[vaultName].key)
            const vault = new Vault(vaultName, vaultKey, this.polykeyPath)
            this.vaultStore.setVault(vaultName, vault)
          } catch (err) {
            throw(err)
          }
        }
      }
    }
  }

  loadKey(path: string | Buffer): Buffer {
    if (path instanceof Buffer) {
      return path
    }
    const keyBuf = Buffer.from(this.fs.readFileSync(path, undefined))
    return keyBuf
  }
}
