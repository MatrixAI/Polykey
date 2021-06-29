// package: agentInterface
// file: Agent.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class EmptyMessage extends jspb.Message { 

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): EmptyMessage.AsObject;
    static toObject(includeInstance: boolean, msg: EmptyMessage): EmptyMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: EmptyMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): EmptyMessage;
    static deserializeBinaryFromReader(message: EmptyMessage, reader: jspb.BinaryReader): EmptyMessage;
}

export namespace EmptyMessage {
    export type AsObject = {
    }
}

export class EchoMessage extends jspb.Message { 
    getChallenge(): string;
    setChallenge(value: string): EchoMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): EchoMessage.AsObject;
    static toObject(includeInstance: boolean, msg: EchoMessage): EchoMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: EchoMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): EchoMessage;
    static deserializeBinaryFromReader(message: EchoMessage, reader: jspb.BinaryReader): EchoMessage;
}

export namespace EchoMessage {
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

export class InfoResponse extends jspb.Message { 
    getVaultName(): string;
    setVaultName(value: string): InfoResponse;
    getBody(): Uint8Array | string;
    getBody_asU8(): Uint8Array;
    getBody_asB64(): string;
    setBody(value: Uint8Array | string): InfoResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): InfoResponse.AsObject;
    static toObject(includeInstance: boolean, msg: InfoResponse): InfoResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: InfoResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): InfoResponse;
    static deserializeBinaryFromReader(message: InfoResponse, reader: jspb.BinaryReader): InfoResponse;
}

export namespace InfoResponse {
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

export class PackResponse extends jspb.Message { 
    getVaultName(): string;
    setVaultName(value: string): PackResponse;
    getBody(): Uint8Array | string;
    getBody_asU8(): Uint8Array;
    getBody_asB64(): string;
    setBody(value: Uint8Array | string): PackResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PackResponse.AsObject;
    static toObject(includeInstance: boolean, msg: PackResponse): PackResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PackResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PackResponse;
    static deserializeBinaryFromReader(message: PackResponse, reader: jspb.BinaryReader): PackResponse;
}

export namespace PackResponse {
    export type AsObject = {
        vaultName: string,
        body: Uint8Array | string,
    }
}

export class PackChunk extends jspb.Message { 
    getChunk(): Uint8Array | string;
    getChunk_asU8(): Uint8Array;
    getChunk_asB64(): string;
    setChunk(value: Uint8Array | string): PackChunk;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PackChunk.AsObject;
    static toObject(includeInstance: boolean, msg: PackChunk): PackChunk.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PackChunk, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PackChunk;
    static deserializeBinaryFromReader(message: PackChunk, reader: jspb.BinaryReader): PackChunk;
}

export namespace PackChunk {
    export type AsObject = {
        chunk: Uint8Array | string,
    }
}

export class ConnectionMessage extends jspb.Message { 
    getAid(): string;
    setAid(value: string): ConnectionMessage;
    getBid(): string;
    setBid(value: string): ConnectionMessage;
    getAip(): string;
    setAip(value: string): ConnectionMessage;
    getBip(): string;
    setBip(value: string): ConnectionMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ConnectionMessage.AsObject;
    static toObject(includeInstance: boolean, msg: ConnectionMessage): ConnectionMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ConnectionMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ConnectionMessage;
    static deserializeBinaryFromReader(message: ConnectionMessage, reader: jspb.BinaryReader): ConnectionMessage;
}

export namespace ConnectionMessage {
    export type AsObject = {
        aid: string,
        bid: string,
        aip: string,
        bip: string,
    }
}

export class CertificateMessage extends jspb.Message { 
    getCert(): string;
    setCert(value: string): CertificateMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): CertificateMessage.AsObject;
    static toObject(includeInstance: boolean, msg: CertificateMessage): CertificateMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: CertificateMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): CertificateMessage;
    static deserializeBinaryFromReader(message: CertificateMessage, reader: jspb.BinaryReader): CertificateMessage;
}

export namespace CertificateMessage {
    export type AsObject = {
        cert: string,
    }
}

export class RelayMessage extends jspb.Message { 
    getSrcid(): string;
    setSrcid(value: string): RelayMessage;
    getTargetid(): string;
    setTargetid(value: string): RelayMessage;
    getEgressaddress(): string;
    setEgressaddress(value: string): RelayMessage;
    getSignature(): string;
    setSignature(value: string): RelayMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): RelayMessage.AsObject;
    static toObject(includeInstance: boolean, msg: RelayMessage): RelayMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: RelayMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): RelayMessage;
    static deserializeBinaryFromReader(message: RelayMessage, reader: jspb.BinaryReader): RelayMessage;
}

export namespace RelayMessage {
    export type AsObject = {
        srcid: string,
        targetid: string,
        egressaddress: string,
        signature: string,
    }
}

export class NodeIdMessage extends jspb.Message { 
    getNodeid(): string;
    setNodeid(value: string): NodeIdMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): NodeIdMessage.AsObject;
    static toObject(includeInstance: boolean, msg: NodeIdMessage): NodeIdMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: NodeIdMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): NodeIdMessage;
    static deserializeBinaryFromReader(message: NodeIdMessage, reader: jspb.BinaryReader): NodeIdMessage;
}

export namespace NodeIdMessage {
    export type AsObject = {
        nodeid: string,
    }
}

export class NodeAddressMessage extends jspb.Message { 
    getIp(): string;
    setIp(value: string): NodeAddressMessage;
    getPort(): number;
    setPort(value: number): NodeAddressMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): NodeAddressMessage.AsObject;
    static toObject(includeInstance: boolean, msg: NodeAddressMessage): NodeAddressMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: NodeAddressMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): NodeAddressMessage;
    static deserializeBinaryFromReader(message: NodeAddressMessage, reader: jspb.BinaryReader): NodeAddressMessage;
}

export namespace NodeAddressMessage {
    export type AsObject = {
        ip: string,
        port: number,
    }
}

export class NodeTableMessage extends jspb.Message { 

    getNodetableMap(): jspb.Map<string, NodeAddressMessage>;
    clearNodetableMap(): void;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): NodeTableMessage.AsObject;
    static toObject(includeInstance: boolean, msg: NodeTableMessage): NodeTableMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: NodeTableMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): NodeTableMessage;
    static deserializeBinaryFromReader(message: NodeTableMessage, reader: jspb.BinaryReader): NodeTableMessage;
}

export namespace NodeTableMessage {
    export type AsObject = {

        nodetableMap: Array<[string, NodeAddressMessage.AsObject]>,
    }
}

export class VaultPermMessage extends jspb.Message { 
    getNodeid(): string;
    setNodeid(value: string): VaultPermMessage;
    getVaultid(): string;
    setVaultid(value: string): VaultPermMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): VaultPermMessage.AsObject;
    static toObject(includeInstance: boolean, msg: VaultPermMessage): VaultPermMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: VaultPermMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): VaultPermMessage;
    static deserializeBinaryFromReader(message: VaultPermMessage, reader: jspb.BinaryReader): VaultPermMessage;
}

export namespace VaultPermMessage {
    export type AsObject = {
        nodeid: string,
        vaultid: string,
    }
}

export class PermissionMessage extends jspb.Message { 
    getPermission(): boolean;
    setPermission(value: boolean): PermissionMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PermissionMessage.AsObject;
    static toObject(includeInstance: boolean, msg: PermissionMessage): PermissionMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PermissionMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PermissionMessage;
    static deserializeBinaryFromReader(message: PermissionMessage, reader: jspb.BinaryReader): PermissionMessage;
}

export namespace PermissionMessage {
    export type AsObject = {
        permission: boolean,
    }
}
