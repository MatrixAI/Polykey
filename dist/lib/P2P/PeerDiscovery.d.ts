import KeyManager from "@polykey/KeyManager";
import PeerInfo from "@polykey/PeerStore/PeerInfo";
import PeerStore from "@polykey/PeerStore/PeerStore";
import MulticastBroadcaster from "@polykey/P2P/MulticastBroadcaster";
interface SocialDiscovery {
    name: string;
    findUser(handle: string, service: string): Promise<string>;
}
declare class PeerDiscovery {
    peerStore: PeerStore;
    keyManager: KeyManager;
    multicastBroadcaster: MulticastBroadcaster;
    private socialDiscoveryServices;
    constructor(peerStore: PeerStore, keyManager: KeyManager, socialDiscoveryServices?: SocialDiscovery[]);
    findPubKey(pubKey: string): Promise<PeerInfo>;
    findSocialUser(handle: string, service: string): Promise<PeerInfo>;
}
export default PeerDiscovery;
export { SocialDiscovery };
