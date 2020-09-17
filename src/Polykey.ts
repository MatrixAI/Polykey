import os from 'os';
import fs from 'fs';
import PeerInfo from './peers/PeerInfo';
import KeyManager from './keys/KeyManager';
import PeerManager from './peers/PeerManager';
import VaultManager from './vaults/VaultManager';
import PolykeyAgent from './agent/PolykeyAgent';
import PolykeyClient from './agent/PolykeyClient';

class Polykey {
  polykeyPath: string;

  vaultManager: VaultManager;
  keyManager: KeyManager;
  peerManager: PeerManager;

  constructor(
    polykeyPath: string = `${os.homedir()}/.polykey`,
    fileSystem: typeof fs,
    keyManager?: KeyManager,
    peerManager?: PeerManager,
    vaultManager?: VaultManager,
  ) {
    this.polykeyPath = polykeyPath;

    // Set key manager
    this.keyManager = keyManager ?? new KeyManager(this.polykeyPath, fileSystem);

    // Initialize peer store and peer discovery classes
    this.peerManager = peerManager ?? new PeerManager(this.polykeyPath, fileSystem, this.keyManager);

    // Set or Initialize vaultManager
    this.vaultManager =
      vaultManager ?? new VaultManager(this.polykeyPath, fileSystem, this.keyManager, this.peerManager);
  }
}

export default Polykey;
export { KeyManager, VaultManager, PeerManager, PolykeyAgent, PolykeyClient, PeerInfo };
