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

export class PeerMessage extends jspb.Message { 
    getPublickey(): string;
    setPublickey(value: string): PeerMessage;

    getType(): SubServiceType;
    setType(value: SubServiceType): PeerMessage;

    getSubmessage(): string;
    setSubmessage(value: string): PeerMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PeerMessage.AsObject;
    static toObject(includeInstance: boolean, msg: PeerMessage): PeerMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PeerMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PeerMessage;
    static deserializeBinaryFromReader(message: PeerMessage, reader: jspb.BinaryReader): PeerMessage;
}

export namespace PeerMessage {
    export type AsObject = {
        publickey: string,
        type: SubServiceType,
        submessage: string,
    }
}

export class NatMessage extends jspb.Message { 
    getType(): NatMessageType;
    setType(value: NatMessageType): NatMessage;

    getIsresponse(): boolean;
    setIsresponse(value: boolean): NatMessage;

    getSubmessage(): Uint8Array | string;
    getSubmessage_asU8(): Uint8Array;
    getSubmessage_asB64(): string;
    setSubmessage(value: Uint8Array | string): NatMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): NatMessage.AsObject;
    static toObject(includeInstance: boolean, msg: NatMessage): NatMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: NatMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): NatMessage;
    static deserializeBinaryFromReader(message: NatMessage, reader: jspb.BinaryReader): NatMessage;
}

export namespace NatMessage {
    export type AsObject = {
        type: NatMessageType,
        isresponse: boolean,
        submessage: Uint8Array | string,
    }
}

export class ErrorMessage extends jspb.Message { 
    getError(): string;
    setError(value: string): ErrorMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ErrorMessage.AsObject;
    static toObject(includeInstance: boolean, msg: ErrorMessage): ErrorMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ErrorMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ErrorMessage;
    static deserializeBinaryFromReader(message: ErrorMessage, reader: jspb.BinaryReader): ErrorMessage;
}

export namespace ErrorMessage {
    export type AsObject = {
        error: string,
    }
}

export class RelayConnectionRequest extends jspb.Message { 
    getPublickey(): string;
    setPublickey(value: string): RelayConnectionRequest;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): RelayConnectionRequest.AsObject;
    static toObject(includeInstance: boolean, msg: RelayConnectionRequest): RelayConnectionRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: RelayConnectionRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): RelayConnectionRequest;
    static deserializeBinaryFromReader(message: RelayConnectionRequest, reader: jspb.BinaryReader): RelayConnectionRequest;
}

export namespace RelayConnectionRequest {
    export type AsObject = {
        publickey: string,
    }
}

export class RelayConnectionResponse extends jspb.Message { 
    getIncomingaddress(): string;
    setIncomingaddress(value: string): RelayConnectionResponse;

    getOutgoingaddress(): string;
    setOutgoingaddress(value: string): RelayConnectionResponse;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): RelayConnectionResponse.AsObject;
    static toObject(includeInstance: boolean, msg: RelayConnectionResponse): RelayConnectionResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: RelayConnectionResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): RelayConnectionResponse;
    static deserializeBinaryFromReader(message: RelayConnectionResponse, reader: jspb.BinaryReader): RelayConnectionResponse;
}

export namespace RelayConnectionResponse {
    export type AsObject = {
        incomingaddress: string,
        outgoingaddress: string,
    }
}

export class PeerConnectionRequest extends jspb.Message { 
    getPublickey(): string;
    setPublickey(value: string): PeerConnectionRequest;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PeerConnectionRequest.AsObject;
    static toObject(includeInstance: boolean, msg: PeerConnectionRequest): PeerConnectionRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PeerConnectionRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PeerConnectionRequest;
    static deserializeBinaryFromReader(message: PeerConnectionRequest, reader: jspb.BinaryReader): PeerConnectionRequest;
}

export namespace PeerConnectionRequest {
    export type AsObject = {
        publickey: string,
    }
}

export class PeerConnectionResponse extends jspb.Message { 
    getAddress(): string;
    setAddress(value: string): PeerConnectionResponse;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PeerConnectionResponse.AsObject;
    static toObject(includeInstance: boolean, msg: PeerConnectionResponse): PeerConnectionResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PeerConnectionResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PeerConnectionResponse;
    static deserializeBinaryFromReader(message: PeerConnectionResponse, reader: jspb.BinaryReader): PeerConnectionResponse;
}

export namespace PeerConnectionResponse {
    export type AsObject = {
        address: string,
    }
}

export enum SubServiceType {
    PING_PEER = 0,
    GIT = 1,
    NAT_TRAVERSAL = 2,
}

export enum NatMessageType {
    ERROR = 0,
    RELAY_CONNECTION = 1,
    PEER_CONNECTION = 2,
}
