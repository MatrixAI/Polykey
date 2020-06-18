import os from 'os'
import fs from 'fs'
import Path from 'path'
import crypto from 'crypto'
import jsonfile from 'jsonfile'
import git from 'isomorphic-git'
import { EncryptedFS } from 'encryptedfs'
import KeyManager from '@polykey/KeyManager'
import GitServer from '@polykey/git/GitServer'
import RPCMessage from '@polykey/rpc/RPCMessage'
import PeerManager from '@polykey/p2p/PeerManager'
import { efsCallbackWrapper } from '@polykey/utils'
import Vault, { customHttpRequest } from '@polykey/Vault'
import PeerInfo, { Address } from '@polykey/peer-store/PeerInfo'

type Metadata = {
  vaults: {
    [vaultName: string]: {
      key: Buffer, tags: Array<string>
    }
  }
  peerInfo: Uint8Array
  publicKeyPath?: string
  privateKeyPath?: string
}

class Polykey {
  polykeyPath: string
  private fs: typeof fs
  private metadata: Metadata
  private metadataPath: string

  keyManager: KeyManager
  vaults: Map<string, Vault>
  peerManager: PeerManager
  gitServer: GitServer

  constructor(
    keyManager?: KeyManager,
    peerManager?: PeerManager,
    polykeyPath: string = `${os.homedir()}/.polykey`
  ) {
    this.polykeyPath = polykeyPath
    this.metadataPath = Path.join(polykeyPath, 'metadata')
    // Set file system
    this.fs = fs

    // Set key manager
    this.keyManager = keyManager ?? new KeyManager(polykeyPath)


    // Make polykey path if doesn't exist
    if (!this.fs.existsSync(this.polykeyPath)) {
      this.fs.mkdirSync(this.polykeyPath, {recursive: true})
    } else if (this.fs.existsSync(this.metadataPath)) {
      const fileContents = jsonfile.readFileSync(this.metadataPath)
      this.metadata = {
        vaults: fileContents.vaults,
        peerInfo: fileContents.peerInfo,
        publicKeyPath: fileContents.publicKeyPath,
        privateKeyPath: fileContents.privateKeyPath
      }
    } else {
      // Create a new peerInfo
      const peerInfo = new PeerInfo(this.keyManager.getPublicKey())
      const metadataTemplate = {
        vaults: {},
        peerInfo: RPCMessage.encodePeerInfo(peerInfo)
      }
      jsonfile.writeFileSync(this.metadataPath, metadataTemplate)
      this.metadata = metadataTemplate
    }

    // Initialize peer store and peer discovery classes
    this.peerManager = peerManager ?? new PeerManager(RPCMessage.decodePeerInfo(this.metadata.peerInfo), this.keyManager)

    // Load all of the vaults into memory
    this.vaults = new Map()
    for (const vaultName in this.metadata.vaults) {
      if (this.metadata.vaults.hasOwnProperty(vaultName)) {
        const path = Path.join(this.polykeyPath, vaultName)
        if (this.fs.existsSync(path)) {
          const vaultKey = Buffer.from(this.metadata.vaults[vaultName].key)
          const vault = new Vault(vaultName, vaultKey, this.polykeyPath)
          this.vaults.set(vaultName, vault)
        }
      }
    }

    // Start git server
    this.gitServer = new GitServer(this.polykeyPath, this.vaults)
    const addressInfo = this.gitServer.listen()
    const ip = (addressInfo.address == '::') ? "localhost" : addressInfo.address
    this.peerManager.peerStore.localPeerInfo.connect(new Address(ip, addressInfo.port.toString()))
  }

  ////////////
  // Vaults //
  ////////////
  async getVault(vaultName: string): Promise<Vault> {
    if (this.vaults.has(vaultName)) {
      const vault = this.vaults.get(vaultName)
      if (vault) {
        return vault
      }
    }
    // vault not in map, create new instance
    await this.validateVault(vaultName)

    const vaultKey = this.metadata.vaults[vaultName].key
    const vault = new Vault(vaultName, vaultKey, this.polykeyPath)
    this.vaults.set(vaultName, vault)
    return vault
  }

  async createVault(vaultName: string, key?: Buffer): Promise<Vault> {

    if (await this.vaultExists(vaultName)) {
      throw Error('Vault already exists!')
    }

    try {
      const path = Path.join(this.polykeyPath, vaultName)
      // Directory not present, create one
      this.fs.mkdirSync(path, {recursive:true})
      // Create key if not provided
      let vaultKey: Buffer
      if (!key) {
        // Generate new key
        vaultKey = crypto.randomBytes(16)
      } else {
        // Assign key if it is provided
        vaultKey = key
      }
      this.metadata.vaults[vaultName] = { key: vaultKey, tags: []}
      await this.writeMetadata()
      const vault = new Vault(vaultName, vaultKey, this.polykeyPath)
      await vault.initRepository()
      this.vaults.set(vaultName, vault)
      return await this.getVault(vaultName)
    } catch (err) {
      // Delete vault dir and garbage collect
      await this.destroyVault(vaultName)
      throw err
    }
  }

  async cloneVault(vaultName: string, address: Address): Promise<Vault> {
    // Confirm it doesn't exist locally already
    if (await this.vaultExists(vaultName)) {
      throw new Error('Vault name already exists locally, try pulling instead')
    }

    // First check if it exists on remote
    const info = await git.getRemoteInfo({
      http: customHttpRequest,
      url: `http://${address.toString()}/${vaultName}`
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
      http: customHttpRequest,
      dir: Path.join(this.polykeyPath, vaultName),
      url: "http://" + address.toString() + '/' + vaultName,
      ref: 'master',
      singleBranch: true
    })

    // Finally return the vault
    return new Vault(vaultName, key, this.polykeyPath)
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
    if (this.vaults.has(vaultName)) {
      this.vaults.delete(vaultName)
    }
    // Remove from metadata
    if (this.metadata.vaults.hasOwnProperty(vaultName)) {
      delete this.metadata.vaults[vaultName]
      await this.writeMetadata()
    }

    const vaultPathExists = this.fs.existsSync(path)
    if (vaultPathExists) {
      throw new Error('Vault path could not be destroyed!')
    }
    const vaultEntryExists = this.vaults.has(vaultName)
    if (vaultEntryExists) {
      throw new Error('Vault could not be removed from PolyKey!')
    }
    const metaDataHasVault = this.metadata.vaults.hasOwnProperty(vaultName)
    if (metaDataHasVault) {
      throw new Error('Vault metadata could not be destroyed!')
    }
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
    const existsFS = this.fs.existsSync(vaultPath)
    if (!existsFS) {
      throw Error('Vault directory does not exist')
    }
  }

  listVaults(): string[] {
    return Array.from(this.vaults.keys())
  }


  tagVault() {

  }

  untagVault() {

  }

  shareVault() {

  }

  unshareVault() {

  }

  /* ============ HELPERS =============== */
  private async writeMetadata(): Promise<void> {
    try {
      await jsonfile.writeFile(this.metadataPath, this.metadata)
    } catch (err) {
      throw Error("Error writing vault key to config file")
    }
  }
}

export default Polykey
