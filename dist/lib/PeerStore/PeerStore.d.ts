import PeerInfo from "@polykey/PeerStore/PeerInfo";
/**
 * Responsible for managing known peers, as well as their addresses and metadata
 */
declare class PeerStore {
    localPeerInfo: PeerInfo;
    peers: Map<string, PeerInfo>;
    constructor(peerInfo: PeerInfo);
    /**
     * Stores the peerInfo of a new peer.
     * If already exist, its info is updated.
     */
    put(peerInfo: PeerInfo): void;
    /**
     * Add a new peer to the store.
     */
    add(peerInfo: PeerInfo): void;
    /**
     * Updates an already known peer.
     */
    update(peerInfo: PeerInfo): void;
    /**
     * Get the info to the given id.
     */
    get(pubKey: string): PeerInfo | null;
    /**
     * Has the info to the given id.
     */
    has(pubKey: string): boolean;
}
export default PeerStore;
