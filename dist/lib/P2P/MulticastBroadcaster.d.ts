/// <reference types="node" />
import dgram from 'dgram';
import { EventEmitter } from 'events';
import KeyManager from '@polykey/KeyManager';
import PeerStore from '@polykey/PeerStore/PeerStore';
declare type PeerMessage = {
    encryptedLocalPubKey: Buffer;
    encryptedPeerPubKey: Buffer;
    rawRandomMessage: Buffer;
    encryptedRandomMessage: Buffer;
};
declare class MulticastBroadcaster extends EventEmitter {
    peerStore: PeerStore;
    keyManager: KeyManager;
    socket: dgram.Socket;
    interval: number;
    queryInterval: NodeJS.Timeout | null;
    peerPubKeyMessages: Map<string, PeerMessage>;
    constructor(peerStore: PeerStore, keyManager: KeyManager);
    queryLAN(): NodeJS.Timeout;
    private handleHandshakeMessages;
    requestPeerContact(pubKey: string): Promise<void>;
}
export default MulticastBroadcaster;
