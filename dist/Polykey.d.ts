/// <reference types="node" />
import fs from 'fs';
import KeyManager from './keys/KeyManager';
import PeerManager from './peers/PeerManager';
import VaultManager from './vaults/VaultManager';
declare class Polykey {
    polykeyPath: string;
    vaultManager: VaultManager;
    keyManager: KeyManager;
    peerManager: PeerManager;
    private gitServer;
    constructor(polykeyPath: string | undefined, fileSystem: typeof fs, keyManager?: KeyManager, vaultManager?: VaultManager, peerManager?: PeerManager);
}
export default Polykey;
