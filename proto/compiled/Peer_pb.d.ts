// package: peerInterface
// file: Peer.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class PeerMessage extends jspb.Message { 
    getPublicKey(): string;
    setPublicKey(value: string): PeerMessage;

    getType(): SubServiceType;
    setType(value: SubServiceType): PeerMessage;

    getSubMessage(): string;
    setSubMessage(value: string): PeerMessage;


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
        publicKey: string,
        type: SubServiceType,
        subMessage: string,
    }
}

export class PingPeerMessage extends jspb.Message { 
    getPublicKey(): string;
    setPublicKey(value: string): PingPeerMessage;

    getChallenge(): string;
    setChallenge(value: string): PingPeerMessage;


    hasPeerinfo(): boolean;
    clearPeerinfo(): void;
    getPeerinfo(): PeerInfoMessage | undefined;
    setPeerinfo(value?: PeerInfoMessage): PingPeerMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PingPeerMessage.AsObject;
    static toObject(includeInstance: boolean, msg: PingPeerMessage): PingPeerMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PingPeerMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PingPeerMessage;
    static deserializeBinaryFromReader(message: PingPeerMessage, reader: jspb.BinaryReader): PingPeerMessage;
}

export namespace PingPeerMessage {
    export type AsObject = {
        publicKey: string,
        challenge: string,
        peerinfo?: PeerInfoMessage.AsObject,
    }
}

export class PeerInfoMessage extends jspb.Message { 
    getPublicKey(): string;
    setPublicKey(value: string): PeerInfoMessage;

    getRelayPublicKey(): string;
    setRelayPublicKey(value: string): PeerInfoMessage;

    getPeerAddress(): string;
    setPeerAddress(value: string): PeerInfoMessage;

    getApiAddress(): string;
    setApiAddress(value: string): PeerInfoMessage;


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
        publicKey: string,
        relayPublicKey: string,
        peerAddress: string,
        apiAddress: string,
    }
}

export class PeerInfoListMessage extends jspb.Message { 
    clearPeerInfoListList(): void;
    getPeerInfoListList(): Array<PeerInfoMessage>;
    setPeerInfoListList(value: Array<PeerInfoMessage>): PeerInfoListMessage;
    addPeerInfoList(value?: PeerInfoMessage, index?: number): PeerInfoMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PeerInfoListMessage.AsObject;
    static toObject(includeInstance: boolean, msg: PeerInfoListMessage): PeerInfoListMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PeerInfoListMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PeerInfoListMessage;
    static deserializeBinaryFromReader(message: PeerInfoListMessage, reader: jspb.BinaryReader): PeerInfoListMessage;
}

export namespace PeerInfoListMessage {
    export type AsObject = {
        peerInfoListList: Array<PeerInfoMessage.AsObject>,
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

export class NatMessage extends jspb.Message { 
    getType(): NatMessageType;
    setType(value: NatMessageType): NatMessage;

    getIsResponse(): boolean;
    setIsResponse(value: boolean): NatMessage;

    getSubMessage(): Uint8Array | string;
    getSubMessage_asU8(): Uint8Array;
    getSubMessage_asB64(): string;
    setSubMessage(value: Uint8Array | string): NatMessage;


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
        isResponse: boolean,
        subMessage: Uint8Array | string,
    }
}

export class RelayConnectionRequest extends jspb.Message { 
    getPublicKey(): string;
    setPublicKey(value: string): RelayConnectionRequest;


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
        publicKey: string,
    }
}

export class RelayConnectionResponse extends jspb.Message { 
    getServerAddress(): string;
    setServerAddress(value: string): RelayConnectionResponse;


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
        serverAddress: string,
    }
}

export class PeerConnectionRequest extends jspb.Message { 
    getPublicKey(): string;
    setPublicKey(value: string): PeerConnectionRequest;


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
        publicKey: string,
    }
}

export class PeerConnectionResponse extends jspb.Message { 
    getPeerAddress(): string;
    setPeerAddress(value: string): PeerConnectionResponse;


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
        peerAddress: string,
    }
}

export class UDPAddressResponse extends jspb.Message { 
    getAddress(): string;
    setAddress(value: string): UDPAddressResponse;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): UDPAddressResponse.AsObject;
    static toObject(includeInstance: boolean, msg: UDPAddressResponse): UDPAddressResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: UDPAddressResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): UDPAddressResponse;
    static deserializeBinaryFromReader(message: UDPAddressResponse, reader: jspb.BinaryReader): UDPAddressResponse;
}

export namespace UDPAddressResponse {
    export type AsObject = {
        address: string,
    }
}

export class HolePunchRegisterRequest extends jspb.Message { 
    getPublicKey(): string;
    setPublicKey(value: string): HolePunchRegisterRequest;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): HolePunchRegisterRequest.AsObject;
    static toObject(includeInstance: boolean, msg: HolePunchRegisterRequest): HolePunchRegisterRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: HolePunchRegisterRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): HolePunchRegisterRequest;
    static deserializeBinaryFromReader(message: HolePunchRegisterRequest, reader: jspb.BinaryReader): HolePunchRegisterRequest;
}

export namespace HolePunchRegisterRequest {
    export type AsObject = {
        publicKey: string,
    }
}

export class HolePunchRegisterResponse extends jspb.Message { 
    getConnectedAddress(): string;
    setConnectedAddress(value: string): HolePunchRegisterResponse;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): HolePunchRegisterResponse.AsObject;
    static toObject(includeInstance: boolean, msg: HolePunchRegisterResponse): HolePunchRegisterResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: HolePunchRegisterResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): HolePunchRegisterResponse;
    static deserializeBinaryFromReader(message: HolePunchRegisterResponse, reader: jspb.BinaryReader): HolePunchRegisterResponse;
}

export namespace HolePunchRegisterResponse {
    export type AsObject = {
        connectedAddress: string,
    }
}

export class PeerUdpAddressRequest extends jspb.Message { 
    getPublicKey(): string;
    setPublicKey(value: string): PeerUdpAddressRequest;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PeerUdpAddressRequest.AsObject;
    static toObject(includeInstance: boolean, msg: PeerUdpAddressRequest): PeerUdpAddressRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PeerUdpAddressRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PeerUdpAddressRequest;
    static deserializeBinaryFromReader(message: PeerUdpAddressRequest, reader: jspb.BinaryReader): PeerUdpAddressRequest;
}

export namespace PeerUdpAddressRequest {
    export type AsObject = {
        publicKey: string,
    }
}

export class PeerUdpAddressResponse extends jspb.Message { 
    getAddress(): string;
    setAddress(value: string): PeerUdpAddressResponse;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PeerUdpAddressResponse.AsObject;
    static toObject(includeInstance: boolean, msg: PeerUdpAddressResponse): PeerUdpAddressResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PeerUdpAddressResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PeerUdpAddressResponse;
    static deserializeBinaryFromReader(message: PeerUdpAddressResponse, reader: jspb.BinaryReader): PeerUdpAddressResponse;
}

export namespace PeerUdpAddressResponse {
    export type AsObject = {
        address: string,
    }
}

export class CAMessage extends jspb.Message { 
    getType(): CAMessageType;
    setType(value: CAMessageType): CAMessage;

    getIsResponse(): boolean;
    setIsResponse(value: boolean): CAMessage;

    getSubMessage(): Uint8Array | string;
    getSubMessage_asU8(): Uint8Array;
    getSubMessage_asB64(): string;
    setSubMessage(value: Uint8Array | string): CAMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): CAMessage.AsObject;
    static toObject(includeInstance: boolean, msg: CAMessage): CAMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: CAMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): CAMessage;
    static deserializeBinaryFromReader(message: CAMessage, reader: jspb.BinaryReader): CAMessage;
}

export namespace CAMessage {
    export type AsObject = {
        type: CAMessageType,
        isResponse: boolean,
        subMessage: Uint8Array | string,
    }
}

export enum SubServiceType {
    PING_PEER = 0,
    GIT = 1,
    NAT_TRAVERSAL = 2,
    CERTIFICATE_AUTHORITY = 3,
}

export enum NatMessageType {
    ERROR = 0,
    RELAY_CONNECTION = 1,
    PEER_CONNECTION = 2,
    UDP_ADDRESS = 3,
    PEER_UDP_ADDRESS = 4,
}

export enum CAMessageType {
    ROOT_CERT = 0,
    REQUEST_CERT = 1,
}
