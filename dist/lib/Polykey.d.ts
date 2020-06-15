/// <reference types="node" />
import Vault from '@polykey/Vault';
import KeyManager from '@polykey/KeyManager';
import PeerStore from '@polykey/PeerStore/PeerStore';
import PeerDiscovery from '@polykey/P2P/PeerDiscovery';
declare class Polykey {
    polykeyPath: string;
    private fs;
    private vaults;
    private metadata;
    private metadataPath;
    keyManager: KeyManager;
    peerStore: PeerStore;
    peerDiscovery: PeerDiscovery;
    constructor(keyManager?: KeyManager, peerDiscovery?: PeerDiscovery, polykeyPath?: string);
    getVault(vaultName: string): Promise<Vault>;
    createVault(vaultName: string, key?: Buffer): Promise<Vault>;
    vaultExists(vaultName: string): Promise<boolean>;
    destroyVault(vaultName: string): Promise<void>;
    private validateVault;
    listVaults(): string[];
    tagVault(): void;
    untagVault(): void;
    shareVault(): void;
    unshareVault(): void;
    private writeMetadata;
}
export default Polykey;
