import os from 'os'
import fs from 'fs'
import GitServer from './git/GitServer'
import KeyManager from './keys/KeyManager'
import PeerManager from './peers/PeerManager'
import VaultManager from './vaults/VaultManager'

class Polykey {
  polykeyPath: string

  vaultManager: VaultManager
  keyManager: KeyManager
  peerManager: PeerManager
  private gitServer: GitServer

  constructor(
    polykeyPath: string = `${os.homedir()}/.polykey`,
    fileSystem: typeof fs,
    keyManager?: KeyManager,
    vaultManager?: VaultManager,
    peerManager?: PeerManager
  ) {
    this.polykeyPath = polykeyPath

    // Set key manager
    this.keyManager = keyManager ?? new KeyManager(this.polykeyPath, fileSystem)

    // Set or Initialize vaultManager
    this.vaultManager = vaultManager ?? new VaultManager(this.polykeyPath, fileSystem, this.keyManager)

    // Initialize peer store and peer discovery classes
    this.peerManager = peerManager ?? new PeerManager(this.polykeyPath, fileSystem, this.keyManager)

    // Start git server
    this.gitServer = new GitServer(this.polykeyPath, this.vaultManager)
    this.peerManager.connectLocalPeerInfo(this.gitServer.address)
  }
}

export default Polykey
