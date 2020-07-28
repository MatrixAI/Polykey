import os from 'os';
import fs from 'fs';
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
    vaultManager?: VaultManager,
    peerManager?: PeerManager,
  ) {
    this.polykeyPath = polykeyPath;

    // Set key manager
    this.keyManager = keyManager ?? new KeyManager(this.polykeyPath, fileSystem);

    // Set or Initialize vaultManager
    this.vaultManager = vaultManager ?? new VaultManager(this.polykeyPath, fileSystem, this.keyManager);

    // Initialize peer store and peer discovery classes
    this.peerManager = peerManager ?? new PeerManager(this.polykeyPath, fileSystem, this.keyManager, this.vaultManager);
  }
}

export default Polykey;
export { KeyManager, VaultManager, PeerManager, PolykeyAgent, PolykeyClient };
