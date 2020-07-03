/// <reference types="node" />
import dgram from 'dgram';
import PeerInfo from './PeerInfo';
import { EventEmitter } from 'events';
import KeyManager from '../keys/KeyManager';
declare type PeerMessage = {
    encryptedLocalPubKey: Buffer;
    encryptedPeerPubKey: Buffer;
    rawRandomMessage: Buffer;
    encryptedRandomMessage: Buffer;
};
declare class MulticastBroadcaster extends EventEmitter {
    addPeer: (peerInfo: PeerInfo) => void;
    localPeerInfo: PeerInfo;
    keyManager: KeyManager;
    socket: dgram.Socket;
    interval: number;
    queryInterval: NodeJS.Timeout | null;
    peerPubKeyMessages: Map<string, PeerMessage>;
    constructor(addPeer: (peerInfo: PeerInfo) => void, localPeerInfo: PeerInfo, keyManager: KeyManager);
    /**
     * Request a peer contact for the multicast peer discovery to check for
     * @param publicKey Public key of the desired peer
     */
    requestPeerContact(publicKey: string): Promise<void>;
    private queryLAN;
    private handleHandshakeMessages;
}
export default MulticastBroadcaster;
