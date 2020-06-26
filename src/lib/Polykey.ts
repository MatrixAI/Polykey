import os from 'os'
import GitBackend from '@polykey/git/GitBackend'
import KeyManager from '@polykey/keys/KeyManager'
import PeerManager from '@polykey/peers/PeerManager'
import VaultManager from '@polykey/vaults/VaultManager'
import PublicKeyInfrastructure from './pki/PublicKeyInfrastructure'

class Polykey {
  polykeyPath: string

  vaultManager: VaultManager
  keyManager: KeyManager
  peerManager: PeerManager

  constructor(
    polykeyPath: string = `${os.homedir()}/.polykey`,
    keyManager?: KeyManager,
    vaultManager?: VaultManager,
    peerManager?: PeerManager,
    pki?: PublicKeyInfrastructure
  ) {
    this.polykeyPath = polykeyPath

    // Set key manager
    this.keyManager = keyManager ?? new KeyManager(this.polykeyPath)

    // Set or Initialize vaultManager
    this.vaultManager = vaultManager ?? new VaultManager(this.polykeyPath)

    // Initialize peer store and peer discovery classes
    this.peerManager = peerManager ?? new PeerManager(
      this.polykeyPath,
      this.keyManager,
      new GitBackend(this.polykeyPath, this.vaultManager),
      pki ?? new PublicKeyInfrastructure()
    )
  }
}

export default Polykey
