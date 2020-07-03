/// <reference types="node" />
import PeerInfo from '../peers/PeerInfo';
declare type HandshakeMessage = {
    targetPubKey: Buffer;
    requestingPubKey: Buffer;
    message: Buffer;
    responsePeerInfo?: PeerInfo;
};
declare class RPCMessage {
    /**
     * Encode peer info into a protocol buffer
     * @param peerInfo The peerInfo to be encoded
     */
    static encodePeerInfo(peerInfo: PeerInfo): Uint8Array;
    /**
     * Deccode a protocol buffer into peer info
     * @param buffer
     */
    static decodePeerInfo(buffer: Uint8Array): PeerInfo;
    /**
     * Encode a handshake message into a protocol buffer
     * @param targetPubKey
     * @param requestingPubKey
     * @param message
     * @param responsePeerInfo
     */
    static encodeHandshakeMessage(targetPubKey: Buffer, requestingPubKey: Buffer, message: Buffer, responsePeerInfo?: PeerInfo): Uint8Array;
    /**
     * Deccode a protocol buffer into a handshake message
     * @param buffer
     */
    static decodeHandshakeMessage(buffer: Uint8Array): HandshakeMessage;
    private static loadProto;
}
export default RPCMessage;
