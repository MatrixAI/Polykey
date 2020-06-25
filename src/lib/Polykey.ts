import os from 'os'
import GitServer from '@polykey/git/GitServer'
import KeyManager from '@polykey/keys/KeyManager'
import PeerManager from '@polykey/peers/PeerManager'
import PeerInfo, { Address } from '@polykey/peers/PeerInfo'
import VaultManager from '@polykey/vaults/VaultManager'

class Polykey {
  polykeyPath: string

  vaultManager: VaultManager
  keyManager: KeyManager
  peerManager: PeerManager
  private gitServer: GitServer

  constructor(
    polykeyPath: string = `${os.homedir()}/.polykey`,
    keyManager?: KeyManager,
    vaultManager?: VaultManager,
    peerManager?: PeerManager
  ) {
    this.polykeyPath = polykeyPath

    // Set key manager
    this.keyManager = keyManager ?? new KeyManager(this.polykeyPath)

    // Set or Initialize vaultManager
    this.vaultManager = vaultManager ?? new VaultManager(this.polykeyPath)

    // Initialize peer store and peer discovery classes
    this.peerManager = peerManager ?? new PeerManager(this.polykeyPath, this.keyManager)

    // Start git server
    this.gitServer = new GitServer(this.polykeyPath, this.vaultManager)
    this.gitServer.listen(this.peerManager.server)
  }
}

export default Polykey
