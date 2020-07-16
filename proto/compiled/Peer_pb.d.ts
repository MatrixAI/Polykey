// package: peer
// file: Peer.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class HandshakeMessage extends jspb.Message { 
    getTargetPubKey(): Uint8Array | string;
    getTargetPubKey_asU8(): Uint8Array;
    getTargetPubKey_asB64(): string;
    setTargetPubKey(value: Uint8Array | string): HandshakeMessage;

    getRequestingPubKey(): Uint8Array | string;
    getRequestingPubKey_asU8(): Uint8Array;
    getRequestingPubKey_asB64(): string;
    setRequestingPubKey(value: Uint8Array | string): HandshakeMessage;

    getMessage(): Uint8Array | string;
    getMessage_asU8(): Uint8Array;
    getMessage_asB64(): string;
    setMessage(value: Uint8Array | string): HandshakeMessage;

    getResponsePeerInfo(): Uint8Array | string;
    getResponsePeerInfo_asU8(): Uint8Array;
    getResponsePeerInfo_asB64(): string;
    setResponsePeerInfo(value: Uint8Array | string): HandshakeMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): HandshakeMessage.AsObject;
    static toObject(includeInstance: boolean, msg: HandshakeMessage): HandshakeMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: HandshakeMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): HandshakeMessage;
    static deserializeBinaryFromReader(message: HandshakeMessage, reader: jspb.BinaryReader): HandshakeMessage;
}

export namespace HandshakeMessage {
    export type AsObject = {
        targetPubKey: Uint8Array | string,
        requestingPubKey: Uint8Array | string,
        message: Uint8Array | string,
        responsePeerInfo: Uint8Array | string,
    }
}

export class PeerInfoMessage extends jspb.Message { 
    getPubKey(): string;
    setPubKey(value: string): PeerInfoMessage;

    clearAddressesList(): void;
    getAddressesList(): Array<string>;
    setAddressesList(value: Array<string>): PeerInfoMessage;
    addAddresses(value: string, index?: number): string;

    getConnectedAddr(): string;
    setConnectedAddr(value: string): PeerInfoMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PeerInfoMessage.AsObject;
    static toObject(includeInstance: boolean, msg: PeerInfoMessage): PeerInfoMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PeerInfoMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PeerInfoMessage;
    static deserializeBinaryFromReader(message: PeerInfoMessage, reader: jspb.BinaryReader): PeerInfoMessage;
}

export namespace PeerInfoMessage {
    export type AsObject = {
        pubKey: string,
        addressesList: Array<string>,
        connectedAddr: string,
    }
}
