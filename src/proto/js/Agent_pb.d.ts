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
