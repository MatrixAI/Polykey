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

    getRootCertificate(): string;
    setRootCertificate(value: string): PeerInfoMessage;

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
        rootCertificate: string,
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

export class UDPAddressMessage extends jspb.Message { 
    getAddress(): string;
    setAddress(value: string): UDPAddressMessage;

    getToken(): string;
    setToken(value: string): UDPAddressMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): UDPAddressMessage.AsObject;
    static toObject(includeInstance: boolean, msg: UDPAddressMessage): UDPAddressMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: UDPAddressMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): UDPAddressMessage;
    static deserializeBinaryFromReader(message: UDPAddressMessage, reader: jspb.BinaryReader): UDPAddressMessage;
}

export namespace UDPAddressMessage {
    export type AsObject = {
        address: string,
        token: string,
    }
}

export class DirectConnectionMessage extends jspb.Message { 
    getPeerId(): string;
    setPeerId(value: string): DirectConnectionMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): DirectConnectionMessage.AsObject;
    static toObject(includeInstance: boolean, msg: DirectConnectionMessage): DirectConnectionMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: DirectConnectionMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): DirectConnectionMessage;
    static deserializeBinaryFromReader(message: DirectConnectionMessage, reader: jspb.BinaryReader): DirectConnectionMessage;
}

export namespace DirectConnectionMessage {
    export type AsObject = {
        peerId: string,
    }
}

export class HolePunchConnectionMessage extends jspb.Message { 
    getTargetPeerId(): string;
    setTargetPeerId(value: string): HolePunchConnectionMessage;

    getOriginPeerId(): string;
    setOriginPeerId(value: string): HolePunchConnectionMessage;

    getUdpAddress(): string;
    setUdpAddress(value: string): HolePunchConnectionMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): HolePunchConnectionMessage.AsObject;
    static toObject(includeInstance: boolean, msg: HolePunchConnectionMessage): HolePunchConnectionMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: HolePunchConnectionMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): HolePunchConnectionMessage;
    static deserializeBinaryFromReader(message: HolePunchConnectionMessage, reader: jspb.BinaryReader): HolePunchConnectionMessage;
}

export namespace HolePunchConnectionMessage {
    export type AsObject = {
        targetPeerId: string,
        originPeerId: string,
        udpAddress: string,
    }
}

export class RelayConnectionMessage extends jspb.Message { 
    getTargetPeerId(): string;
    setTargetPeerId(value: string): RelayConnectionMessage;

    getOriginPeerId(): string;
    setOriginPeerId(value: string): RelayConnectionMessage;

    getRelayAddress(): string;
    setRelayAddress(value: string): RelayConnectionMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): RelayConnectionMessage.AsObject;
    static toObject(includeInstance: boolean, msg: RelayConnectionMessage): RelayConnectionMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: RelayConnectionMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): RelayConnectionMessage;
    static deserializeBinaryFromReader(message: RelayConnectionMessage, reader: jspb.BinaryReader): RelayConnectionMessage;
}

export namespace RelayConnectionMessage {
    export type AsObject = {
        targetPeerId: string,
        originPeerId: string,
        relayAddress: string,
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

export class PeerDHTMessage extends jspb.Message { 
    getType(): PeerDHTMessageType;
    setType(value: PeerDHTMessageType): PeerDHTMessage;

    getIsResponse(): boolean;
    setIsResponse(value: boolean): PeerDHTMessage;

    getSubMessage(): Uint8Array | string;
    getSubMessage_asU8(): Uint8Array;
    getSubMessage_asB64(): string;
    setSubMessage(value: Uint8Array | string): PeerDHTMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PeerDHTMessage.AsObject;
    static toObject(includeInstance: boolean, msg: PeerDHTMessage): PeerDHTMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PeerDHTMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PeerDHTMessage;
    static deserializeBinaryFromReader(message: PeerDHTMessage, reader: jspb.BinaryReader): PeerDHTMessage;
}

export namespace PeerDHTMessage {
    export type AsObject = {
        type: PeerDHTMessageType,
        isResponse: boolean,
        subMessage: Uint8Array | string,
    }
}

export class PeerDHTPingNodeMessage extends jspb.Message { 
    getPeerId(): string;
    setPeerId(value: string): PeerDHTPingNodeMessage;

    getRandomChallenge(): string;
    setRandomChallenge(value: string): PeerDHTPingNodeMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PeerDHTPingNodeMessage.AsObject;
    static toObject(includeInstance: boolean, msg: PeerDHTPingNodeMessage): PeerDHTPingNodeMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PeerDHTPingNodeMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PeerDHTPingNodeMessage;
    static deserializeBinaryFromReader(message: PeerDHTPingNodeMessage, reader: jspb.BinaryReader): PeerDHTPingNodeMessage;
}

export namespace PeerDHTPingNodeMessage {
    export type AsObject = {
        peerId: string,
        randomChallenge: string,
    }
}

export class PeerDHTFindNodeMessage extends jspb.Message { 
    getPeerId(): string;
    setPeerId(value: string): PeerDHTFindNodeMessage;

    clearClosestPeersList(): void;
    getClosestPeersList(): Array<PeerInfoMessage>;
    setClosestPeersList(value: Array<PeerInfoMessage>): PeerDHTFindNodeMessage;
    addClosestPeers(value?: PeerInfoMessage, index?: number): PeerInfoMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PeerDHTFindNodeMessage.AsObject;
    static toObject(includeInstance: boolean, msg: PeerDHTFindNodeMessage): PeerDHTFindNodeMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PeerDHTFindNodeMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PeerDHTFindNodeMessage;
    static deserializeBinaryFromReader(message: PeerDHTFindNodeMessage, reader: jspb.BinaryReader): PeerDHTFindNodeMessage;
}

export namespace PeerDHTFindNodeMessage {
    export type AsObject = {
        peerId: string,
        closestPeersList: Array<PeerInfoMessage.AsObject>,
    }
}

export class MTPPacket extends jspb.Message { 
    getId(): number;
    setId(value: number): MTPPacket;

    getPeerid(): string;
    setPeerid(value: string): MTPPacket;

    getConnection(): number;
    setConnection(value: number): MTPPacket;

    getTimestamp(): number;
    setTimestamp(value: number): MTPPacket;

    getTimediff(): number;
    setTimediff(value: number): MTPPacket;

    getWindow(): number;
    setWindow(value: number): MTPPacket;

    getSeq(): number;
    setSeq(value: number): MTPPacket;

    getAck(): number;
    setAck(value: number): MTPPacket;

    getData(): Uint8Array | string;
    getData_asU8(): Uint8Array;
    getData_asB64(): string;
    setData(value: Uint8Array | string): MTPPacket;

    getSent(): number;
    setSent(value: number): MTPPacket;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): MTPPacket.AsObject;
    static toObject(includeInstance: boolean, msg: MTPPacket): MTPPacket.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: MTPPacket, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): MTPPacket;
    static deserializeBinaryFromReader(message: MTPPacket, reader: jspb.BinaryReader): MTPPacket;
}

export namespace MTPPacket {
    export type AsObject = {
        id: number,
        peerid: string,
        connection: number,
        timestamp: number,
        timediff: number,
        window: number,
        seq: number,
        ack: number,
        data: Uint8Array | string,
        sent: number,
    }
}

export enum SubServiceType {
    PING_PEER = 0,
    GIT = 1,
    NAT_TRAVERSAL = 2,
    CERTIFICATE_AUTHORITY = 3,
    PEER_DHT = 4,
}

export enum NatMessageType {
    UDP_ADDRESS = 0,
    DIRECT_CONNECTION = 1,
    HOLE_PUNCH_CONNECTION = 2,
    RELAY_CONNECTION = 3,
}

export enum CAMessageType {
    ROOT_CERT = 0,
    REQUEST_CERT = 1,
}

export enum PeerDHTMessageType {
    PING = 0,
    FIND_NODE = 1,
}
