// package: polykey.v1.nodes
// file: polykey/v1/nodes/nodes.proto

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
        host: string,
        port: number,
    }
}

export class NodeAddress extends jspb.Message { 
    getNodeId(): string;
    setNodeId(value: string): NodeAddress;

    hasAddress(): boolean;
    clearAddress(): void;
    getAddress(): Address | undefined;
    setAddress(value?: Address): NodeAddress;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): NodeAddress.AsObject;
    static toObject(includeInstance: boolean, msg: NodeAddress): NodeAddress.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: NodeAddress, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): NodeAddress;
    static deserializeBinaryFromReader(message: NodeAddress, reader: jspb.BinaryReader): NodeAddress;
}

export namespace NodeAddress {
    export type AsObject = {
        nodeId: string,
        address?: Address.AsObject,
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

export class NodeAdd extends jspb.Message { 
    getNodeId(): string;
    setNodeId(value: string): NodeAdd;

    hasAddress(): boolean;
    clearAddress(): void;
    getAddress(): Address | undefined;
    setAddress(value?: Address): NodeAdd;
    getForce(): boolean;
    setForce(value: boolean): NodeAdd;
    getPing(): boolean;
    setPing(value: boolean): NodeAdd;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): NodeAdd.AsObject;
    static toObject(includeInstance: boolean, msg: NodeAdd): NodeAdd.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: NodeAdd, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): NodeAdd;
    static deserializeBinaryFromReader(message: NodeAdd, reader: jspb.BinaryReader): NodeAdd;
}

export namespace NodeAdd {
    export type AsObject = {
        nodeId: string,
        address?: Address.AsObject,
        force: boolean,
        ping: boolean,
    }
}

export class NodeBuckets extends jspb.Message { 

    getBucketsMap(): jspb.Map<number, NodeTable>;
    clearBucketsMap(): void;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): NodeBuckets.AsObject;
    static toObject(includeInstance: boolean, msg: NodeBuckets): NodeBuckets.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: NodeBuckets, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): NodeBuckets;
    static deserializeBinaryFromReader(message: NodeBuckets, reader: jspb.BinaryReader): NodeBuckets;
}

export namespace NodeBuckets {
    export type AsObject = {

        bucketsMap: Array<[number, NodeTable.AsObject]>,
    }
}

export class NodeConnection extends jspb.Message { 
    getNodeId(): string;
    setNodeId(value: string): NodeConnection;
    getHost(): string;
    setHost(value: string): NodeConnection;
    getHostname(): string;
    setHostname(value: string): NodeConnection;
    getPort(): number;
    setPort(value: number): NodeConnection;
    getUsageCount(): number;
    setUsageCount(value: number): NodeConnection;
    getTimeout(): number;
    setTimeout(value: number): NodeConnection;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): NodeConnection.AsObject;
    static toObject(includeInstance: boolean, msg: NodeConnection): NodeConnection.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: NodeConnection, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): NodeConnection;
    static deserializeBinaryFromReader(message: NodeConnection, reader: jspb.BinaryReader): NodeConnection;
}

export namespace NodeConnection {
    export type AsObject = {
        nodeId: string,
        host: string,
        hostname: string,
        port: number,
        usageCount: number,
        timeout: number,
    }
}

export class Connection extends jspb.Message { 
    getAId(): string;
    setAId(value: string): Connection;
    getBId(): string;
    setBId(value: string): Connection;
    getAIp(): string;
    setAIp(value: string): Connection;
    getBIp(): string;
    setBIp(value: string): Connection;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Connection.AsObject;
    static toObject(includeInstance: boolean, msg: Connection): Connection.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Connection, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Connection;
    static deserializeBinaryFromReader(message: Connection, reader: jspb.BinaryReader): Connection;
}

export namespace Connection {
    export type AsObject = {
        aId: string,
        bId: string,
        aIp: string,
        bIp: string,
    }
}

export class Relay extends jspb.Message { 
    getSrcId(): string;
    setSrcId(value: string): Relay;
    getTargetId(): string;
    setTargetId(value: string): Relay;
    getProxyAddress(): string;
    setProxyAddress(value: string): Relay;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Relay.AsObject;
    static toObject(includeInstance: boolean, msg: Relay): Relay.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Relay, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Relay;
    static deserializeBinaryFromReader(message: Relay, reader: jspb.BinaryReader): Relay;
}

export namespace Relay {
    export type AsObject = {
        srcId: string,
        targetId: string,
        proxyAddress: string,
    }
}

export class NodeTable extends jspb.Message { 

    getNodeTableMap(): jspb.Map<string, Address>;
    clearNodeTableMap(): void;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): NodeTable.AsObject;
    static toObject(includeInstance: boolean, msg: NodeTable): NodeTable.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: NodeTable, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): NodeTable;
    static deserializeBinaryFromReader(message: NodeTable, reader: jspb.BinaryReader): NodeTable;
}

export namespace NodeTable {
    export type AsObject = {

        nodeTableMap: Array<[string, Address.AsObject]>,
    }
}

export class ClaimType extends jspb.Message { 
    getClaimType(): string;
    setClaimType(value: string): ClaimType;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ClaimType.AsObject;
    static toObject(includeInstance: boolean, msg: ClaimType): ClaimType.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ClaimType, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ClaimType;
    static deserializeBinaryFromReader(message: ClaimType, reader: jspb.BinaryReader): ClaimType;
}

export namespace ClaimType {
    export type AsObject = {
        claimType: string,
    }
}

export class Claims extends jspb.Message { 
    clearClaimsList(): void;
    getClaimsList(): Array<AgentClaim>;
    setClaimsList(value: Array<AgentClaim>): Claims;
    addClaims(value?: AgentClaim, index?: number): AgentClaim;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Claims.AsObject;
    static toObject(includeInstance: boolean, msg: Claims): Claims.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Claims, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Claims;
    static deserializeBinaryFromReader(message: Claims, reader: jspb.BinaryReader): Claims;
}

export namespace Claims {
    export type AsObject = {
        claimsList: Array<AgentClaim.AsObject>,
    }
}

export class ChainData extends jspb.Message { 

    getChainDataMap(): jspb.Map<string, AgentClaim>;
    clearChainDataMap(): void;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ChainData.AsObject;
    static toObject(includeInstance: boolean, msg: ChainData): ChainData.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ChainData, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ChainData;
    static deserializeBinaryFromReader(message: ChainData, reader: jspb.BinaryReader): ChainData;
}

export namespace ChainData {
    export type AsObject = {

        chainDataMap: Array<[string, AgentClaim.AsObject]>,
    }
}

export class AgentClaim extends jspb.Message { 
    getPayload(): string;
    setPayload(value: string): AgentClaim;
    clearSignaturesList(): void;
    getSignaturesList(): Array<Signature>;
    setSignaturesList(value: Array<Signature>): AgentClaim;
    addSignatures(value?: Signature, index?: number): Signature;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AgentClaim.AsObject;
    static toObject(includeInstance: boolean, msg: AgentClaim): AgentClaim.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AgentClaim, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AgentClaim;
    static deserializeBinaryFromReader(message: AgentClaim, reader: jspb.BinaryReader): AgentClaim;
}

export namespace AgentClaim {
    export type AsObject = {
        payload: string,
        signaturesList: Array<Signature.AsObject>,
    }
}

export class Signature extends jspb.Message { 
    getSignature(): string;
    setSignature(value: string): Signature;
    getProtected(): string;
    setProtected(value: string): Signature;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Signature.AsObject;
    static toObject(includeInstance: boolean, msg: Signature): Signature.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Signature, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Signature;
    static deserializeBinaryFromReader(message: Signature, reader: jspb.BinaryReader): Signature;
}

export namespace Signature {
    export type AsObject = {
        signature: string,
        pb_protected: string,
    }
}

export class ClaimIntermediary extends jspb.Message { 
    getPayload(): string;
    setPayload(value: string): ClaimIntermediary;

    hasSignature(): boolean;
    clearSignature(): void;
    getSignature(): Signature | undefined;
    setSignature(value?: Signature): ClaimIntermediary;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ClaimIntermediary.AsObject;
    static toObject(includeInstance: boolean, msg: ClaimIntermediary): ClaimIntermediary.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ClaimIntermediary, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ClaimIntermediary;
    static deserializeBinaryFromReader(message: ClaimIntermediary, reader: jspb.BinaryReader): ClaimIntermediary;
}

export namespace ClaimIntermediary {
    export type AsObject = {
        payload: string,
        signature?: Signature.AsObject,
    }
}

export class CrossSign extends jspb.Message { 

    hasSinglySignedClaim(): boolean;
    clearSinglySignedClaim(): void;
    getSinglySignedClaim(): ClaimIntermediary | undefined;
    setSinglySignedClaim(value?: ClaimIntermediary): CrossSign;

    hasDoublySignedClaim(): boolean;
    clearDoublySignedClaim(): void;
    getDoublySignedClaim(): AgentClaim | undefined;
    setDoublySignedClaim(value?: AgentClaim): CrossSign;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): CrossSign.AsObject;
    static toObject(includeInstance: boolean, msg: CrossSign): CrossSign.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: CrossSign, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): CrossSign;
    static deserializeBinaryFromReader(message: CrossSign, reader: jspb.BinaryReader): CrossSign;
}

export namespace CrossSign {
    export type AsObject = {
        singlySignedClaim?: ClaimIntermediary.AsObject,
        doublySignedClaim?: AgentClaim.AsObject,
    }
}
