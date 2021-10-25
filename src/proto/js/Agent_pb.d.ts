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
    getVaultId(): string;
    setVaultId(value: string): InfoRequest;

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
        vaultId: string,
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

export class PackRequest extends jspb.Message { 
    getId(): string;
    setId(value: string): PackRequest;
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
        id: string,
        body: Uint8Array | string,
    }
}

export class VaultListMessage extends jspb.Message { 
    getVault(): Uint8Array | string;
    getVault_asU8(): Uint8Array;
    getVault_asB64(): string;
    setVault(value: Uint8Array | string): VaultListMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): VaultListMessage.AsObject;
    static toObject(includeInstance: boolean, msg: VaultListMessage): VaultListMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: VaultListMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): VaultListMessage;
    static deserializeBinaryFromReader(message: VaultListMessage, reader: jspb.BinaryReader): VaultListMessage;
}

export namespace VaultListMessage {
    export type AsObject = {
        vault: Uint8Array | string,
    }
}

export class VaultPermMessage extends jspb.Message { 
    getNodeId(): string;
    setNodeId(value: string): VaultPermMessage;
    getVaultId(): string;
    setVaultId(value: string): VaultPermMessage;

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
        nodeId: string,
        vaultId: string,
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

export class NodeIdMessage extends jspb.Message { 
    getNodeId(): string;
    setNodeId(value: string): NodeIdMessage;

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
        nodeId: string,
    }
}

export class ConnectionMessage extends jspb.Message { 
    getAId(): string;
    setAId(value: string): ConnectionMessage;
    getBId(): string;
    setBId(value: string): ConnectionMessage;
    getAIp(): string;
    setAIp(value: string): ConnectionMessage;
    getBIp(): string;
    setBIp(value: string): ConnectionMessage;

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
        aId: string,
        bId: string,
        aIp: string,
        bIp: string,
    }
}

export class RelayMessage extends jspb.Message { 
    getSrcId(): string;
    setSrcId(value: string): RelayMessage;
    getTargetId(): string;
    setTargetId(value: string): RelayMessage;
    getEgressAddress(): string;
    setEgressAddress(value: string): RelayMessage;
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
        srcId: string,
        targetId: string,
        egressAddress: string,
        signature: string,
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

    getNodeTableMap(): jspb.Map<string, NodeAddressMessage>;
    clearNodeTableMap(): void;

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

        nodeTableMap: Array<[string, NodeAddressMessage.AsObject]>,
    }
}

export class ClaimTypeMessage extends jspb.Message { 
    getClaimType(): string;
    setClaimType(value: string): ClaimTypeMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ClaimTypeMessage.AsObject;
    static toObject(includeInstance: boolean, msg: ClaimTypeMessage): ClaimTypeMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ClaimTypeMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ClaimTypeMessage;
    static deserializeBinaryFromReader(message: ClaimTypeMessage, reader: jspb.BinaryReader): ClaimTypeMessage;
}

export namespace ClaimTypeMessage {
    export type AsObject = {
        claimType: string,
    }
}

export class ClaimsMessage extends jspb.Message { 
    clearClaimsList(): void;
    getClaimsList(): Array<ClaimMessage>;
    setClaimsList(value: Array<ClaimMessage>): ClaimsMessage;
    addClaims(value?: ClaimMessage, index?: number): ClaimMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ClaimsMessage.AsObject;
    static toObject(includeInstance: boolean, msg: ClaimsMessage): ClaimsMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ClaimsMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ClaimsMessage;
    static deserializeBinaryFromReader(message: ClaimsMessage, reader: jspb.BinaryReader): ClaimsMessage;
}

export namespace ClaimsMessage {
    export type AsObject = {
        claimsList: Array<ClaimMessage.AsObject>,
    }
}

export class ChainDataMessage extends jspb.Message { 

    getChainDataMap(): jspb.Map<string, ClaimMessage>;
    clearChainDataMap(): void;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ChainDataMessage.AsObject;
    static toObject(includeInstance: boolean, msg: ChainDataMessage): ChainDataMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ChainDataMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ChainDataMessage;
    static deserializeBinaryFromReader(message: ChainDataMessage, reader: jspb.BinaryReader): ChainDataMessage;
}

export namespace ChainDataMessage {
    export type AsObject = {

        chainDataMap: Array<[string, ClaimMessage.AsObject]>,
    }
}

export class ClaimMessage extends jspb.Message { 
    getPayload(): string;
    setPayload(value: string): ClaimMessage;
    clearSignaturesList(): void;
    getSignaturesList(): Array<SignatureMessage>;
    setSignaturesList(value: Array<SignatureMessage>): ClaimMessage;
    addSignatures(value?: SignatureMessage, index?: number): SignatureMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ClaimMessage.AsObject;
    static toObject(includeInstance: boolean, msg: ClaimMessage): ClaimMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ClaimMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ClaimMessage;
    static deserializeBinaryFromReader(message: ClaimMessage, reader: jspb.BinaryReader): ClaimMessage;
}

export namespace ClaimMessage {
    export type AsObject = {
        payload: string,
        signaturesList: Array<SignatureMessage.AsObject>,
    }
}

export class SignatureMessage extends jspb.Message { 
    getSignature(): string;
    setSignature(value: string): SignatureMessage;
    getProtected(): string;
    setProtected(value: string): SignatureMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SignatureMessage.AsObject;
    static toObject(includeInstance: boolean, msg: SignatureMessage): SignatureMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SignatureMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SignatureMessage;
    static deserializeBinaryFromReader(message: SignatureMessage, reader: jspb.BinaryReader): SignatureMessage;
}

export namespace SignatureMessage {
    export type AsObject = {
        signature: string,
        pb_protected: string,
    }
}

export class NotificationMessage extends jspb.Message { 
    getContent(): string;
    setContent(value: string): NotificationMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): NotificationMessage.AsObject;
    static toObject(includeInstance: boolean, msg: NotificationMessage): NotificationMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: NotificationMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): NotificationMessage;
    static deserializeBinaryFromReader(message: NotificationMessage, reader: jspb.BinaryReader): NotificationMessage;
}

export namespace NotificationMessage {
    export type AsObject = {
        content: string,
    }
}

export class ClaimIntermediaryMessage extends jspb.Message { 
    getPayload(): string;
    setPayload(value: string): ClaimIntermediaryMessage;

    hasSignature(): boolean;
    clearSignature(): void;
    getSignature(): SignatureMessage | undefined;
    setSignature(value?: SignatureMessage): ClaimIntermediaryMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ClaimIntermediaryMessage.AsObject;
    static toObject(includeInstance: boolean, msg: ClaimIntermediaryMessage): ClaimIntermediaryMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ClaimIntermediaryMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ClaimIntermediaryMessage;
    static deserializeBinaryFromReader(message: ClaimIntermediaryMessage, reader: jspb.BinaryReader): ClaimIntermediaryMessage;
}

export namespace ClaimIntermediaryMessage {
    export type AsObject = {
        payload: string,
        signature?: SignatureMessage.AsObject,
    }
}

export class CrossSignMessage extends jspb.Message { 

    hasSinglySignedClaim(): boolean;
    clearSinglySignedClaim(): void;
    getSinglySignedClaim(): ClaimIntermediaryMessage | undefined;
    setSinglySignedClaim(value?: ClaimIntermediaryMessage): CrossSignMessage;

    hasDoublySignedClaim(): boolean;
    clearDoublySignedClaim(): void;
    getDoublySignedClaim(): ClaimMessage | undefined;
    setDoublySignedClaim(value?: ClaimMessage): CrossSignMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): CrossSignMessage.AsObject;
    static toObject(includeInstance: boolean, msg: CrossSignMessage): CrossSignMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: CrossSignMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): CrossSignMessage;
    static deserializeBinaryFromReader(message: CrossSignMessage, reader: jspb.BinaryReader): CrossSignMessage;
}

export namespace CrossSignMessage {
    export type AsObject = {
        singlySignedClaim?: ClaimIntermediaryMessage.AsObject,
        doublySignedClaim?: ClaimMessage.AsObject,
    }
}
