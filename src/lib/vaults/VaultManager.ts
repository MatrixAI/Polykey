
import fs from 'fs'
import os from 'os'
import net from 'net'
import Path from 'path'
import crypto from 'crypto'
import git from 'isomorphic-git'
import { EncryptedFS } from 'encryptedfs'
import Vault from "@polykey/vaults/Vault";
import httpRequest from '@polykey/http/httpRequest';
import { Address } from '@polykey/peers/PeerInfo'
import { efsCallbackWrapper } from '@polykey/utils'

class VaultManager {
  polykeyPath: string
  metadataPath: string
  vaults: Map<string, Vault>
  vaultKeys: Map<string, Buffer>
  constructor(
    polykeyPath: string = `${os.homedir()}/.polykey`
  ) {
    this.polykeyPath = polykeyPath
    this.metadataPath = Path.join(polykeyPath, '.vaultKeys')

    // Make polykeyPath if it doesn't exist
    fs.mkdirSync(this.polykeyPath, {recursive: true})

    // Initialize stateful variables
    this.vaults = new Map()
    this.vaultKeys = new Map()

    // Read in vault keys
    this.loadMetadata()

    // Initialize vaults in memory
    for (const [vaultName, vaultKey] of this.vaultKeys.entries()) {
      const path = Path.join(this.polykeyPath, vaultName)
      if (fs.existsSync(path)) {
        const vault = new Vault(vaultName, vaultKey, this.polykeyPath)
        this.vaults.set(vaultName, vault)
      }
    }
  }

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

  async createVault(vaultName: string, key?: Buffer): Promise<Vault> {

    if (this.vaultExists(vaultName)) {
      throw Error('Vault already exists!')
    }

    try {
      const path = Path.join(this.polykeyPath, vaultName)
      // Directory not present, create one
      fs.mkdirSync(path, {recursive:true})
      // Create key if not provided
      let vaultKey: Buffer
      if (!key) {
        // Generate new key
        vaultKey = crypto.randomBytes(16)
      } else {
        // Assign key if it is provided
        vaultKey = key
      }
      this.vaultKeys.set(vaultName, vaultKey)
      this.writeMetadata()
      const vault = new Vault(vaultName, vaultKey, this.polykeyPath)
      await vault.initRepository()
      this.vaults.set(vaultName, vault)
      return await this.getVault(vaultName)
    } catch (err) {
      // Delete vault dir and garbage collect
      this.destroyVault(vaultName)
      throw err
    }
  }

  async cloneVault(vaultName: string, address: Address, getSocket: (address: Address) => net.Socket): Promise<Vault> {
    // Confirm it doesn't exist locally already
    if (this.vaultExists(vaultName)) {
      throw new Error('Vault name already exists locally, try pulling instead')
    }

    const vaultUrl = `http://${address.toString()}/${vaultName}`

    // const getSocket = this.peerManager.connectionManager.connect.bind(this.peerManager.connectionManager)
    // First check if it exists on remote
    const info = await git.getRemoteInfo({
      http: httpRequest(getSocket, address),
      url: vaultUrl
    })

    if (!info.refs) {
      throw new Error(`Peer does not have vault: '${vaultName}'`)
    }

    // Create new efs first
    const key = crypto.randomBytes(16)

    // Set filesystem
    const vfsInstance = new (require('virtualfs')).VirtualFS

    const newEfs = new EncryptedFS(
      key,
      vfsInstance,
      vfsInstance,
      fs,
      process
    )

    // Clone vault from address
    await git.clone({
      fs: efsCallbackWrapper(newEfs),
      http: httpRequest(getSocket, address),
      dir: Path.join(this.polykeyPath, vaultName),
      url: vaultUrl,
      ref: 'master',
      singleBranch: true
    })

    // Finally return the vault
    return new Vault(vaultName, key, this.polykeyPath)
  }

  vaultExists(vaultName: string): boolean {
    const path = Path.join(this.polykeyPath, vaultName)
    const vaultExists = fs.existsSync(path)

    return vaultExists
  }

  destroyVault(vaultName: string) {

    // this is convenience function for removing all tags
    // and triggering garbage collection
    // destruction is a better word as we should ensure all traces is removed

    const path = Path.join(this.polykeyPath, vaultName)
    // Remove directory on file system
    if (fs.existsSync(path)) {
      fs.rmdirSync(path, {recursive: true})
    }

    // Remove from maps
    this.vaults.delete(vaultName)
    this.vaultKeys.delete(vaultName)

    // Write to metadata file
    this.writeMetadata()

    const vaultPathExists = fs.existsSync(path)
    if (vaultPathExists) {
      throw new Error('Vault folder could not be destroyed!')
    }
  }

  /* Validates whether all the artefacts needed to operate
  * a Vault are present. Namely this the vault directory
  * and the metadata for the vault containg the key
  */
  private validateVault (vaultName: string): void {
    if (!this.vaults.has(vaultName)) {
      throw Error('Vault does not exist in memory')
    }
    if (!this.vaultKeys.has(vaultName)) {
      throw Error('Vault key does not exist in memory')
    }
    const vaultPath = Path.join(this.polykeyPath, vaultName)
    if (!fs.existsSync(vaultPath)) {
      throw Error('Vault directory does not exist')
    }
  }

  listVaults(): string[] {
    return Array.from(this.vaults.keys())
  }

  /* ============ HELPERS =============== */
  private writeMetadata(): void {
    const metadata = JSON.stringify([...this.vaultKeys])
    fs.writeFileSync(this.metadataPath, metadata)
  }
  private loadMetadata(): void {
    // Check if file exists
    if (fs.existsSync(this.metadataPath)) {
      const metadata = fs.readFileSync(this.metadataPath).toString()

      for (const [key, value] of new Map<string, any>(JSON.parse(metadata))) {
        this.vaultKeys[key] = Buffer.from(value)
      }
    }
  }
}

export default VaultManager
