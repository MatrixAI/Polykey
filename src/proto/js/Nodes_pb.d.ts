// package: node
// file: Nodes.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class Node extends jspb.Message { 
    getNodeId(): string;
    setNodeId(value: string): Node;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Node.AsObject;
    static toObject(includeInstance: boolean, msg: Node): Node.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Node, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Node;
    static deserializeBinaryFromReader(message: Node, reader: jspb.BinaryReader): Node;
}

export namespace Node {
    export type AsObject = {
        nodeId: string,
    }
}

export class Address extends jspb.Message { 
    getNodeId(): string;
    setNodeId(value: string): Address;
    getHost(): string;
    setHost(value: string): Address;
    getPort(): number;
    setPort(value: number): Address;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Address.AsObject;
    static toObject(includeInstance: boolean, msg: Address): Address.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Address, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Address;
    static deserializeBinaryFromReader(message: Address, reader: jspb.BinaryReader): Address;
}

export namespace Address {
    export type AsObject = {
        nodeId: string,
        host: string,
        port: number,
    }
}

export class Claim extends jspb.Message { 
    getNodeId(): string;
    setNodeId(value: string): Claim;
    getForceInvite(): boolean;
    setForceInvite(value: boolean): Claim;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Claim.AsObject;
    static toObject(includeInstance: boolean, msg: Claim): Claim.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Claim, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Claim;
    static deserializeBinaryFromReader(message: Claim, reader: jspb.BinaryReader): Claim;
}

export namespace Claim {
    export type AsObject = {
        nodeId: string,
        forceInvite: boolean,
    }
}
