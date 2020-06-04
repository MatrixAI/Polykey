/// <reference types="node" />
import { Root } from 'protobufjs';
import PeerInfo from '@polykey/PeerStore/PeerInfo';
declare type HandshakeMessage = {
    targetPubKey: Buffer;
    requestingPubKey: Buffer;
    message: Buffer;
    responsePeerInfo?: PeerInfo;
};
declare class RPCMessage {
    static loadProto(name: string): Root;
    static encodePeerInfo(peerInfo: PeerInfo): Uint8Array;
    static decodePeerInfo(buffer: Uint8Array): PeerInfo;
    static encodeHandshakeMessage(targetPubKey: Buffer, requestingPubKey: Buffer, messageBuf: Buffer, responsePeerInfo?: PeerInfo): Uint8Array;
    static decodeHandshakeMessage(buffer: Uint8Array): HandshakeMessage;
}
export default RPCMessage;
