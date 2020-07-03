/// <reference types="node" />
import fs from 'fs';
import net from 'net';
import tls from 'tls';
import KeyManager from '../keys/KeyManager';
import PeerInfo, { Address } from '../peers/PeerInfo';
import MulticastBroadcaster from '../peers/MulticastBroadcaster';
interface SocialDiscovery {
    name: string;
    findUser(handle: string, service: string): Promise<string>;
}
declare class PeerManager {
    private fileSystem;
    private metadataPath;
    private metadata;
    private localPeerInfo;
    private peerStore;
    private keyManager;
    multicastBroadcaster: MulticastBroadcaster;
    private socialDiscoveryServices;
    keyPem: string;
    certPem: string;
    server: tls.Server;
    peerConnections: Map<string, tls.TLSSocket>;
    constructor(polykeyPath: string | undefined, fileSystem: typeof fs, keyManager: KeyManager, peerInfo?: PeerInfo, socialDiscoveryServices?: SocialDiscovery[]);
    /**
     * Get the peer info of the current keynode
     */
    getLocalPeerInfo(): PeerInfo;
    /**
     * Set the address of the active server
     * @param adress Address of active server
     */
    connectLocalPeerInfo(address: Address): void;
    /**
     * Add a peer's info to the peerStore
     * @param peerInfo Info of the peer to be added
     */
    addPeer(peerInfo: PeerInfo): void;
    /**
     * Retrieves a peer for the given public key
     * @param publicKey Public key of the desired peer
     */
    getPeer(publicKey: string): PeerInfo | null;
    /**
     * Determines if the peerStore contains the desired peer
     * @param publicKey Public key of the desired peer
     */
    hasPeer(pubKey: string): boolean;
    /**
     * Finds an existing peer using multicast peer discovery
     * @param publicKey Public key of the desired peer
     */
    findPubKey(publicKey: string): Promise<PeerInfo>;
    /**
     * Finds an existing peer given a social service and handle
     * @param handle Username or handle of the user (e.g. @john-smith)
     * @param service Service on which to search for the user (e.g. github)
     */
    findSocialUser(handle: string, service: string): Promise<PeerInfo>;
    /**
     * Get a secure connection to the peer
     * @param peer Public key of an existing peer or address of new peer
     */
    connectToPeer(peer: string | Address): net.Socket;
    private writeMetadata;
    private loadMetadata;
}
export default PeerManager;
export { SocialDiscovery };
