// package: peerInterface
// file: Peer.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as Agent_pb from "./Agent_pb";

export class PingPeerMessage extends jspb.Message { 
    getChallenge(): string;
    setChallenge(value: string): PingPeerMessage;


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
        challenge: string,
    }
}

export class InfoRequest extends jspb.Message { 
    getVaultName(): string;
    setVaultName(value: string): InfoRequest;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): InfoRequest.AsObject;
    static toObject(includeInstance: boolean, msg: InfoRequest): InfoRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: InfoRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): InfoRequest;
    static deserializeBinaryFromReader(message: InfoRequest, reader: jspb.BinaryReader): InfoRequest;
}

export namespace InfoRequest {
    export type AsObject = {
        vaultName: string,
    }
}

export class InfoReply extends jspb.Message { 
    getVaultName(): string;
    setVaultName(value: string): InfoReply;

    getBody(): Uint8Array | string;
    getBody_asU8(): Uint8Array;
    getBody_asB64(): string;
    setBody(value: Uint8Array | string): InfoReply;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): InfoReply.AsObject;
    static toObject(includeInstance: boolean, msg: InfoReply): InfoReply.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: InfoReply, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): InfoReply;
    static deserializeBinaryFromReader(message: InfoReply, reader: jspb.BinaryReader): InfoReply;
}

export namespace InfoReply {
    export type AsObject = {
        vaultName: string,
        body: Uint8Array | string,
    }
}

export class PackRequest extends jspb.Message { 
    getVaultName(): string;
    setVaultName(value: string): PackRequest;

    getBody(): Uint8Array | string;
    getBody_asU8(): Uint8Array;
    getBody_asB64(): string;
    setBody(value: Uint8Array | string): PackRequest;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PackRequest.AsObject;
    static toObject(includeInstance: boolean, msg: PackRequest): PackRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PackRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PackRequest;
    static deserializeBinaryFromReader(message: PackRequest, reader: jspb.BinaryReader): PackRequest;
}

export namespace PackRequest {
    export type AsObject = {
        vaultName: string,
        body: Uint8Array | string,
    }
}

export class PackReply extends jspb.Message { 
    getVaultName(): string;
    setVaultName(value: string): PackReply;

    getBody(): Uint8Array | string;
    getBody_asU8(): Uint8Array;
    getBody_asB64(): string;
    setBody(value: Uint8Array | string): PackReply;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PackReply.AsObject;
    static toObject(includeInstance: boolean, msg: PackReply): PackReply.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PackReply, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PackReply;
    static deserializeBinaryFromReader(message: PackReply, reader: jspb.BinaryReader): PackReply;
}

export namespace PackReply {
    export type AsObject = {
        vaultName: string,
        body: Uint8Array | string,
    }
}

export class VaultNamesReply extends jspb.Message { 
    clearVaultNameListList(): void;
    getVaultNameListList(): Array<string>;
    setVaultNameListList(value: Array<string>): VaultNamesReply;
    addVaultNameList(value: string, index?: number): string;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): VaultNamesReply.AsObject;
    static toObject(includeInstance: boolean, msg: VaultNamesReply): VaultNamesReply.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: VaultNamesReply, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): VaultNamesReply;
    static deserializeBinaryFromReader(message: VaultNamesReply, reader: jspb.BinaryReader): VaultNamesReply;
}

export namespace VaultNamesReply {
    export type AsObject = {
        vaultNameListList: Array<string>,
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

export class PublicRelayRequest extends jspb.Message { 
    getTargetPeerId(): string;
    setTargetPeerId(value: string): PublicRelayRequest;

    getOriginPeerId(): string;
    setOriginPeerId(value: string): PublicRelayRequest;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PublicRelayRequest.AsObject;
    static toObject(includeInstance: boolean, msg: PublicRelayRequest): PublicRelayRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PublicRelayRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PublicRelayRequest;
    static deserializeBinaryFromReader(message: PublicRelayRequest, reader: jspb.BinaryReader): PublicRelayRequest;
}

export namespace PublicRelayRequest {
    export type AsObject = {
        targetPeerId: string,
        originPeerId: string,
    }
}

export class PublicRelayReply extends jspb.Message { 
    getRelayAddress(): string;
    setRelayAddress(value: string): PublicRelayReply;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PublicRelayReply.AsObject;
    static toObject(includeInstance: boolean, msg: PublicRelayReply): PublicRelayReply.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PublicRelayReply, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PublicRelayReply;
    static deserializeBinaryFromReader(message: PublicRelayReply, reader: jspb.BinaryReader): PublicRelayReply;
}

export namespace PublicRelayReply {
    export type AsObject = {
        relayAddress: string,
    }
}

export class NatUdpMessage extends jspb.Message { 
    getType(): NatUdpMessageType;
    setType(value: NatUdpMessageType): NatUdpMessage;

    getIsResponse(): boolean;
    setIsResponse(value: boolean): NatUdpMessage;

    getSubMessage(): Uint8Array | string;
    getSubMessage_asU8(): Uint8Array;
    getSubMessage_asB64(): string;
    setSubMessage(value: Uint8Array | string): NatUdpMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): NatUdpMessage.AsObject;
    static toObject(includeInstance: boolean, msg: NatUdpMessage): NatUdpMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: NatUdpMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): NatUdpMessage;
    static deserializeBinaryFromReader(message: NatUdpMessage, reader: jspb.BinaryReader): NatUdpMessage;
}

export namespace NatUdpMessage {
    export type AsObject = {
        type: NatUdpMessageType,
        isResponse: boolean,
        subMessage: Uint8Array | string,
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

    getIsResponse(): boolean;
    setIsResponse(value: boolean): HolePunchConnectionMessage;

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
        isResponse: boolean,
        udpAddress: string,
    }
}

export class PeerDHTFindNodeRequest extends jspb.Message { 
    getTargetPeerId(): string;
    setTargetPeerId(value: string): PeerDHTFindNodeRequest;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PeerDHTFindNodeRequest.AsObject;
    static toObject(includeInstance: boolean, msg: PeerDHTFindNodeRequest): PeerDHTFindNodeRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PeerDHTFindNodeRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PeerDHTFindNodeRequest;
    static deserializeBinaryFromReader(message: PeerDHTFindNodeRequest, reader: jspb.BinaryReader): PeerDHTFindNodeRequest;
}

export namespace PeerDHTFindNodeRequest {
    export type AsObject = {
        targetPeerId: string,
    }
}

export class PeerDHTFindNodeReply extends jspb.Message { 
    clearClosestPeersList(): void;
    getClosestPeersList(): Array<Agent_pb.PeerInfoReadOnlyMessage>;
    setClosestPeersList(value: Array<Agent_pb.PeerInfoReadOnlyMessage>): PeerDHTFindNodeReply;
    addClosestPeers(value?: Agent_pb.PeerInfoReadOnlyMessage, index?: number): Agent_pb.PeerInfoReadOnlyMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PeerDHTFindNodeReply.AsObject;
    static toObject(includeInstance: boolean, msg: PeerDHTFindNodeReply): PeerDHTFindNodeReply.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PeerDHTFindNodeReply, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PeerDHTFindNodeReply;
    static deserializeBinaryFromReader(message: PeerDHTFindNodeReply, reader: jspb.BinaryReader): PeerDHTFindNodeReply;
}

export namespace PeerDHTFindNodeReply {
    export type AsObject = {
        closestPeersList: Array<Agent_pb.PeerInfoReadOnlyMessage.AsObject>,
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

export enum NatUdpMessageType {
    DIRECT_CONNECTION = 0,
    HOLE_PUNCH_CONNECTION = 1,
    PUBLIC_RELAY_REQUEST = 2,
}
