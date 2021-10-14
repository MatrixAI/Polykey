// package: clientInterface
// file: Client.proto

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

export class StatusMessage extends jspb.Message { 
    getSuccess(): boolean;
    setSuccess(value: boolean): StatusMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): StatusMessage.AsObject;
    static toObject(includeInstance: boolean, msg: StatusMessage): StatusMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: StatusMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): StatusMessage;
    static deserializeBinaryFromReader(message: StatusMessage, reader: jspb.BinaryReader): StatusMessage;
}

export namespace StatusMessage {
    export type AsObject = {
        success: boolean,
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

export class PasswordMessage extends jspb.Message { 

    hasPassword(): boolean;
    clearPassword(): void;
    getPassword(): string;
    setPassword(value: string): PasswordMessage;

    hasPasswordFile(): boolean;
    clearPasswordFile(): void;
    getPasswordFile(): string;
    setPasswordFile(value: string): PasswordMessage;

    getPasswordOrFileCase(): PasswordMessage.PasswordOrFileCase;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PasswordMessage.AsObject;
    static toObject(includeInstance: boolean, msg: PasswordMessage): PasswordMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PasswordMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PasswordMessage;
    static deserializeBinaryFromReader(message: PasswordMessage, reader: jspb.BinaryReader): PasswordMessage;
}

export namespace PasswordMessage {
    export type AsObject = {
        password: string,
        passwordFile: string,
    }

    export enum PasswordOrFileCase {
        PASSWORD_OR_FILE_NOT_SET = 0,
        PASSWORD = 1,
        PASSWORD_FILE = 2,
    }

}

export class SessionTokenMessage extends jspb.Message { 
    getToken(): string;
    setToken(value: string): SessionTokenMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SessionTokenMessage.AsObject;
    static toObject(includeInstance: boolean, msg: SessionTokenMessage): SessionTokenMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SessionTokenMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SessionTokenMessage;
    static deserializeBinaryFromReader(message: SessionTokenMessage, reader: jspb.BinaryReader): SessionTokenMessage;
}

export namespace SessionTokenMessage {
    export type AsObject = {
        token: string,
    }
}

export class VaultListMessage extends jspb.Message { 
    getVaultName(): string;
    setVaultName(value: string): VaultListMessage;
    getVaultId(): string;
    setVaultId(value: string): VaultListMessage;

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
        vaultName: string,
        vaultId: string,
    }
}

export class VaultMessage extends jspb.Message { 

    hasVaultName(): boolean;
    clearVaultName(): void;
    getVaultName(): string;
    setVaultName(value: string): VaultMessage;

    hasVaultId(): boolean;
    clearVaultId(): void;
    getVaultId(): string;
    setVaultId(value: string): VaultMessage;

    getNameOrIdCase(): VaultMessage.NameOrIdCase;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): VaultMessage.AsObject;
    static toObject(includeInstance: boolean, msg: VaultMessage): VaultMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: VaultMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): VaultMessage;
    static deserializeBinaryFromReader(message: VaultMessage, reader: jspb.BinaryReader): VaultMessage;
}

export namespace VaultMessage {
    export type AsObject = {
        vaultName: string,
        vaultId: string,
    }

    export enum NameOrIdCase {
        NAME_OR_ID_NOT_SET = 0,
        VAULT_NAME = 1,
        VAULT_ID = 2,
    }

}

export class VaultRenameMessage extends jspb.Message { 

    hasVault(): boolean;
    clearVault(): void;
    getVault(): VaultMessage | undefined;
    setVault(value?: VaultMessage): VaultRenameMessage;
    getNewName(): string;
    setNewName(value: string): VaultRenameMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): VaultRenameMessage.AsObject;
    static toObject(includeInstance: boolean, msg: VaultRenameMessage): VaultRenameMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: VaultRenameMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): VaultRenameMessage;
    static deserializeBinaryFromReader(message: VaultRenameMessage, reader: jspb.BinaryReader): VaultRenameMessage;
}

export namespace VaultRenameMessage {
    export type AsObject = {
        vault?: VaultMessage.AsObject,
        newName: string,
    }
}

export class VaultMkdirMessage extends jspb.Message { 

    hasVault(): boolean;
    clearVault(): void;
    getVault(): VaultMessage | undefined;
    setVault(value?: VaultMessage): VaultMkdirMessage;
    getDirName(): string;
    setDirName(value: string): VaultMkdirMessage;
    getRecursive(): boolean;
    setRecursive(value: boolean): VaultMkdirMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): VaultMkdirMessage.AsObject;
    static toObject(includeInstance: boolean, msg: VaultMkdirMessage): VaultMkdirMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: VaultMkdirMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): VaultMkdirMessage;
    static deserializeBinaryFromReader(message: VaultMkdirMessage, reader: jspb.BinaryReader): VaultMkdirMessage;
}

export namespace VaultMkdirMessage {
    export type AsObject = {
        vault?: VaultMessage.AsObject,
        dirName: string,
        recursive: boolean,
    }
}

export class VaultPullMessage extends jspb.Message { 

    hasVault(): boolean;
    clearVault(): void;
    getVault(): VaultMessage | undefined;
    setVault(value?: VaultMessage): VaultPullMessage;

    hasNode(): boolean;
    clearNode(): void;
    getNode(): NodeMessage | undefined;
    setNode(value?: NodeMessage): VaultPullMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): VaultPullMessage.AsObject;
    static toObject(includeInstance: boolean, msg: VaultPullMessage): VaultPullMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: VaultPullMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): VaultPullMessage;
    static deserializeBinaryFromReader(message: VaultPullMessage, reader: jspb.BinaryReader): VaultPullMessage;
}

export namespace VaultPullMessage {
    export type AsObject = {
        vault?: VaultMessage.AsObject,
        node?: NodeMessage.AsObject,
    }
}

export class VaultCloneMessage extends jspb.Message { 

    hasVault(): boolean;
    clearVault(): void;
    getVault(): VaultMessage | undefined;
    setVault(value?: VaultMessage): VaultCloneMessage;

    hasNode(): boolean;
    clearNode(): void;
    getNode(): NodeMessage | undefined;
    setNode(value?: NodeMessage): VaultCloneMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): VaultCloneMessage.AsObject;
    static toObject(includeInstance: boolean, msg: VaultCloneMessage): VaultCloneMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: VaultCloneMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): VaultCloneMessage;
    static deserializeBinaryFromReader(message: VaultCloneMessage, reader: jspb.BinaryReader): VaultCloneMessage;
}

export namespace VaultCloneMessage {
    export type AsObject = {
        vault?: VaultMessage.AsObject,
        node?: NodeMessage.AsObject,
    }
}

export class SecretRenameMessage extends jspb.Message { 

    hasOldSecret(): boolean;
    clearOldSecret(): void;
    getOldSecret(): SecretMessage | undefined;
    setOldSecret(value?: SecretMessage): SecretRenameMessage;
    getNewName(): string;
    setNewName(value: string): SecretRenameMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SecretRenameMessage.AsObject;
    static toObject(includeInstance: boolean, msg: SecretRenameMessage): SecretRenameMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SecretRenameMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SecretRenameMessage;
    static deserializeBinaryFromReader(message: SecretRenameMessage, reader: jspb.BinaryReader): SecretRenameMessage;
}

export namespace SecretRenameMessage {
    export type AsObject = {
        oldSecret?: SecretMessage.AsObject,
        newName: string,
    }
}

export class SecretMessage extends jspb.Message { 

    hasVault(): boolean;
    clearVault(): void;
    getVault(): VaultMessage | undefined;
    setVault(value?: VaultMessage): SecretMessage;
    getSecretName(): string;
    setSecretName(value: string): SecretMessage;
    getSecretContent(): Uint8Array | string;
    getSecretContent_asU8(): Uint8Array;
    getSecretContent_asB64(): string;
    setSecretContent(value: Uint8Array | string): SecretMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SecretMessage.AsObject;
    static toObject(includeInstance: boolean, msg: SecretMessage): SecretMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SecretMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SecretMessage;
    static deserializeBinaryFromReader(message: SecretMessage, reader: jspb.BinaryReader): SecretMessage;
}

export namespace SecretMessage {
    export type AsObject = {
        vault?: VaultMessage.AsObject,
        secretName: string,
        secretContent: Uint8Array | string,
    }
}

export class SecretDirectoryMessage extends jspb.Message { 

    hasVault(): boolean;
    clearVault(): void;
    getVault(): VaultMessage | undefined;
    setVault(value?: VaultMessage): SecretDirectoryMessage;
    getSecretDirectory(): string;
    setSecretDirectory(value: string): SecretDirectoryMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SecretDirectoryMessage.AsObject;
    static toObject(includeInstance: boolean, msg: SecretDirectoryMessage): SecretDirectoryMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SecretDirectoryMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SecretDirectoryMessage;
    static deserializeBinaryFromReader(message: SecretDirectoryMessage, reader: jspb.BinaryReader): SecretDirectoryMessage;
}

export namespace SecretDirectoryMessage {
    export type AsObject = {
        vault?: VaultMessage.AsObject,
        secretDirectory: string,
    }
}

export class StatMessage extends jspb.Message { 
    getStats(): string;
    setStats(value: string): StatMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): StatMessage.AsObject;
    static toObject(includeInstance: boolean, msg: StatMessage): StatMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: StatMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): StatMessage;
    static deserializeBinaryFromReader(message: StatMessage, reader: jspb.BinaryReader): StatMessage;
}

export namespace StatMessage {
    export type AsObject = {
        stats: string,
    }
}

export class SetVaultPermMessage extends jspb.Message { 

    hasVault(): boolean;
    clearVault(): void;
    getVault(): VaultMessage | undefined;
    setVault(value?: VaultMessage): SetVaultPermMessage;

    hasNode(): boolean;
    clearNode(): void;
    getNode(): NodeMessage | undefined;
    setNode(value?: NodeMessage): SetVaultPermMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SetVaultPermMessage.AsObject;
    static toObject(includeInstance: boolean, msg: SetVaultPermMessage): SetVaultPermMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SetVaultPermMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SetVaultPermMessage;
    static deserializeBinaryFromReader(message: SetVaultPermMessage, reader: jspb.BinaryReader): SetVaultPermMessage;
}

export namespace SetVaultPermMessage {
    export type AsObject = {
        vault?: VaultMessage.AsObject,
        node?: NodeMessage.AsObject,
    }
}

export class UnsetVaultPermMessage extends jspb.Message { 

    hasVault(): boolean;
    clearVault(): void;
    getVault(): VaultMessage | undefined;
    setVault(value?: VaultMessage): UnsetVaultPermMessage;

    hasNode(): boolean;
    clearNode(): void;
    getNode(): NodeMessage | undefined;
    setNode(value?: NodeMessage): UnsetVaultPermMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): UnsetVaultPermMessage.AsObject;
    static toObject(includeInstance: boolean, msg: UnsetVaultPermMessage): UnsetVaultPermMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: UnsetVaultPermMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): UnsetVaultPermMessage;
    static deserializeBinaryFromReader(message: UnsetVaultPermMessage, reader: jspb.BinaryReader): UnsetVaultPermMessage;
}

export namespace UnsetVaultPermMessage {
    export type AsObject = {
        vault?: VaultMessage.AsObject,
        node?: NodeMessage.AsObject,
    }
}

export class GetVaultPermMessage extends jspb.Message { 

    hasVault(): boolean;
    clearVault(): void;
    getVault(): VaultMessage | undefined;
    setVault(value?: VaultMessage): GetVaultPermMessage;

    hasNode(): boolean;
    clearNode(): void;
    getNode(): NodeMessage | undefined;
    setNode(value?: NodeMessage): GetVaultPermMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetVaultPermMessage.AsObject;
    static toObject(includeInstance: boolean, msg: GetVaultPermMessage): GetVaultPermMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetVaultPermMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetVaultPermMessage;
    static deserializeBinaryFromReader(message: GetVaultPermMessage, reader: jspb.BinaryReader): GetVaultPermMessage;
}

export namespace GetVaultPermMessage {
    export type AsObject = {
        vault?: VaultMessage.AsObject,
        node?: NodeMessage.AsObject,
    }
}

export class PermissionMessage extends jspb.Message { 
    getNodeId(): string;
    setNodeId(value: string): PermissionMessage;
    getAction(): string;
    setAction(value: string): PermissionMessage;

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
        nodeId: string,
        action: string,
    }
}

export class VaultsVersionMessage extends jspb.Message { 

    hasVault(): boolean;
    clearVault(): void;
    getVault(): VaultMessage | undefined;
    setVault(value?: VaultMessage): VaultsVersionMessage;
    getVersionId(): string;
    setVersionId(value: string): VaultsVersionMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): VaultsVersionMessage.AsObject;
    static toObject(includeInstance: boolean, msg: VaultsVersionMessage): VaultsVersionMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: VaultsVersionMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): VaultsVersionMessage;
    static deserializeBinaryFromReader(message: VaultsVersionMessage, reader: jspb.BinaryReader): VaultsVersionMessage;
}

export namespace VaultsVersionMessage {
    export type AsObject = {
        vault?: VaultMessage.AsObject,
        versionId: string,
    }
}

export class VaultsVersionResultMessage extends jspb.Message { 
    getIsLatestVersion(): boolean;
    setIsLatestVersion(value: boolean): VaultsVersionResultMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): VaultsVersionResultMessage.AsObject;
    static toObject(includeInstance: boolean, msg: VaultsVersionResultMessage): VaultsVersionResultMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: VaultsVersionResultMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): VaultsVersionResultMessage;
    static deserializeBinaryFromReader(message: VaultsVersionResultMessage, reader: jspb.BinaryReader): VaultsVersionResultMessage;
}

export namespace VaultsVersionResultMessage {
    export type AsObject = {
        isLatestVersion: boolean,
    }
}

export class NodeMessage extends jspb.Message { 
    getNodeId(): string;
    setNodeId(value: string): NodeMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): NodeMessage.AsObject;
    static toObject(includeInstance: boolean, msg: NodeMessage): NodeMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: NodeMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): NodeMessage;
    static deserializeBinaryFromReader(message: NodeMessage, reader: jspb.BinaryReader): NodeMessage;
}

export namespace NodeMessage {
    export type AsObject = {
        nodeId: string,
    }
}

export class NodeAddressMessage extends jspb.Message { 
    getNodeId(): string;
    setNodeId(value: string): NodeAddressMessage;
    getHost(): string;
    setHost(value: string): NodeAddressMessage;
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
        nodeId: string,
        host: string,
        port: number,
    }
}

export class NodeClaimMessage extends jspb.Message { 
    getNodeId(): string;
    setNodeId(value: string): NodeClaimMessage;
    getForceInvite(): boolean;
    setForceInvite(value: boolean): NodeClaimMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): NodeClaimMessage.AsObject;
    static toObject(includeInstance: boolean, msg: NodeClaimMessage): NodeClaimMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: NodeClaimMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): NodeClaimMessage;
    static deserializeBinaryFromReader(message: NodeClaimMessage, reader: jspb.BinaryReader): NodeClaimMessage;
}

export namespace NodeClaimMessage {
    export type AsObject = {
        nodeId: string,
        forceInvite: boolean,
    }
}

export class CryptoMessage extends jspb.Message { 
    getData(): string;
    setData(value: string): CryptoMessage;
    getSignature(): string;
    setSignature(value: string): CryptoMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): CryptoMessage.AsObject;
    static toObject(includeInstance: boolean, msg: CryptoMessage): CryptoMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: CryptoMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): CryptoMessage;
    static deserializeBinaryFromReader(message: CryptoMessage, reader: jspb.BinaryReader): CryptoMessage;
}

export namespace CryptoMessage {
    export type AsObject = {
        data: string,
        signature: string,
    }
}

export class KeyMessage extends jspb.Message { 
    getName(): string;
    setName(value: string): KeyMessage;
    getKey(): string;
    setKey(value: string): KeyMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): KeyMessage.AsObject;
    static toObject(includeInstance: boolean, msg: KeyMessage): KeyMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: KeyMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): KeyMessage;
    static deserializeBinaryFromReader(message: KeyMessage, reader: jspb.BinaryReader): KeyMessage;
}

export namespace KeyMessage {
    export type AsObject = {
        name: string,
        key: string,
    }
}

export class KeyPairMessage extends jspb.Message { 
    getPublic(): string;
    setPublic(value: string): KeyPairMessage;
    getPrivate(): string;
    setPrivate(value: string): KeyPairMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): KeyPairMessage.AsObject;
    static toObject(includeInstance: boolean, msg: KeyPairMessage): KeyPairMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: KeyPairMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): KeyPairMessage;
    static deserializeBinaryFromReader(message: KeyPairMessage, reader: jspb.BinaryReader): KeyPairMessage;
}

export namespace KeyPairMessage {
    export type AsObject = {
        pb_public: string,
        pb_private: string,
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

export class ProviderMessage extends jspb.Message { 
    getProviderId(): string;
    setProviderId(value: string): ProviderMessage;
    getMessage(): string;
    setMessage(value: string): ProviderMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ProviderMessage.AsObject;
    static toObject(includeInstance: boolean, msg: ProviderMessage): ProviderMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ProviderMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ProviderMessage;
    static deserializeBinaryFromReader(message: ProviderMessage, reader: jspb.BinaryReader): ProviderMessage;
}

export namespace ProviderMessage {
    export type AsObject = {
        providerId: string,
        message: string,
    }
}

export class TokenSpecificMessage extends jspb.Message { 

    hasProvider(): boolean;
    clearProvider(): void;
    getProvider(): ProviderMessage | undefined;
    setProvider(value?: ProviderMessage): TokenSpecificMessage;
    getToken(): string;
    setToken(value: string): TokenSpecificMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): TokenSpecificMessage.AsObject;
    static toObject(includeInstance: boolean, msg: TokenSpecificMessage): TokenSpecificMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: TokenSpecificMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): TokenSpecificMessage;
    static deserializeBinaryFromReader(message: TokenSpecificMessage, reader: jspb.BinaryReader): TokenSpecificMessage;
}

export namespace TokenSpecificMessage {
    export type AsObject = {
        provider?: ProviderMessage.AsObject,
        token: string,
    }
}

export class TokenMessage extends jspb.Message { 
    getToken(): string;
    setToken(value: string): TokenMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): TokenMessage.AsObject;
    static toObject(includeInstance: boolean, msg: TokenMessage): TokenMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: TokenMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): TokenMessage;
    static deserializeBinaryFromReader(message: TokenMessage, reader: jspb.BinaryReader): TokenMessage;
}

export namespace TokenMessage {
    export type AsObject = {
        token: string,
    }
}

export class ProviderSearchMessage extends jspb.Message { 

    hasProvider(): boolean;
    clearProvider(): void;
    getProvider(): ProviderMessage | undefined;
    setProvider(value?: ProviderMessage): ProviderSearchMessage;
    clearSearchTermList(): void;
    getSearchTermList(): Array<string>;
    setSearchTermList(value: Array<string>): ProviderSearchMessage;
    addSearchTerm(value: string, index?: number): string;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ProviderSearchMessage.AsObject;
    static toObject(includeInstance: boolean, msg: ProviderSearchMessage): ProviderSearchMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ProviderSearchMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ProviderSearchMessage;
    static deserializeBinaryFromReader(message: ProviderSearchMessage, reader: jspb.BinaryReader): ProviderSearchMessage;
}

export namespace ProviderSearchMessage {
    export type AsObject = {
        provider?: ProviderMessage.AsObject,
        searchTermList: Array<string>,
    }
}

export class IdentityInfoMessage extends jspb.Message { 

    hasProvider(): boolean;
    clearProvider(): void;
    getProvider(): ProviderMessage | undefined;
    setProvider(value?: ProviderMessage): IdentityInfoMessage;
    getName(): string;
    setName(value: string): IdentityInfoMessage;
    getEmail(): string;
    setEmail(value: string): IdentityInfoMessage;
    getUrl(): string;
    setUrl(value: string): IdentityInfoMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): IdentityInfoMessage.AsObject;
    static toObject(includeInstance: boolean, msg: IdentityInfoMessage): IdentityInfoMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: IdentityInfoMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): IdentityInfoMessage;
    static deserializeBinaryFromReader(message: IdentityInfoMessage, reader: jspb.BinaryReader): IdentityInfoMessage;
}

export namespace IdentityInfoMessage {
    export type AsObject = {
        provider?: ProviderMessage.AsObject,
        name: string,
        email: string,
        url: string,
    }
}

export class GestaltMessage extends jspb.Message { 
    getName(): string;
    setName(value: string): GestaltMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GestaltMessage.AsObject;
    static toObject(includeInstance: boolean, msg: GestaltMessage): GestaltMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GestaltMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GestaltMessage;
    static deserializeBinaryFromReader(message: GestaltMessage, reader: jspb.BinaryReader): GestaltMessage;
}

export namespace GestaltMessage {
    export type AsObject = {
        name: string,
    }
}

export class GestaltGraphMessage extends jspb.Message { 
    getGestaltGraph(): string;
    setGestaltGraph(value: string): GestaltGraphMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GestaltGraphMessage.AsObject;
    static toObject(includeInstance: boolean, msg: GestaltGraphMessage): GestaltGraphMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GestaltGraphMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GestaltGraphMessage;
    static deserializeBinaryFromReader(message: GestaltGraphMessage, reader: jspb.BinaryReader): GestaltGraphMessage;
}

export namespace GestaltGraphMessage {
    export type AsObject = {
        gestaltGraph: string,
    }
}

export class GestaltTrustMessage extends jspb.Message { 
    getProvider(): string;
    setProvider(value: string): GestaltTrustMessage;
    getName(): string;
    setName(value: string): GestaltTrustMessage;
    getSet(): boolean;
    setSet(value: boolean): GestaltTrustMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GestaltTrustMessage.AsObject;
    static toObject(includeInstance: boolean, msg: GestaltTrustMessage): GestaltTrustMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GestaltTrustMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GestaltTrustMessage;
    static deserializeBinaryFromReader(message: GestaltTrustMessage, reader: jspb.BinaryReader): GestaltTrustMessage;
}

export namespace GestaltTrustMessage {
    export type AsObject = {
        provider: string,
        name: string,
        set: boolean,
    }
}

export class ActionsMessage extends jspb.Message { 
    clearActionList(): void;
    getActionList(): Array<string>;
    setActionList(value: Array<string>): ActionsMessage;
    addAction(value: string, index?: number): string;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ActionsMessage.AsObject;
    static toObject(includeInstance: boolean, msg: ActionsMessage): ActionsMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ActionsMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ActionsMessage;
    static deserializeBinaryFromReader(message: ActionsMessage, reader: jspb.BinaryReader): ActionsMessage;
}

export namespace ActionsMessage {
    export type AsObject = {
        actionList: Array<string>,
    }
}

export class SetActionsMessage extends jspb.Message { 

    hasNode(): boolean;
    clearNode(): void;
    getNode(): NodeMessage | undefined;
    setNode(value?: NodeMessage): SetActionsMessage;

    hasIdentity(): boolean;
    clearIdentity(): void;
    getIdentity(): ProviderMessage | undefined;
    setIdentity(value?: ProviderMessage): SetActionsMessage;
    getAction(): string;
    setAction(value: string): SetActionsMessage;

    getNodeOrProviderCase(): SetActionsMessage.NodeOrProviderCase;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SetActionsMessage.AsObject;
    static toObject(includeInstance: boolean, msg: SetActionsMessage): SetActionsMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SetActionsMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SetActionsMessage;
    static deserializeBinaryFromReader(message: SetActionsMessage, reader: jspb.BinaryReader): SetActionsMessage;
}

export namespace SetActionsMessage {
    export type AsObject = {
        node?: NodeMessage.AsObject,
        identity?: ProviderMessage.AsObject,
        action: string,
    }

    export enum NodeOrProviderCase {
        NODE_OR_PROVIDER_NOT_SET = 0,
        NODE = 1,
        IDENTITY = 2,
    }

}

export class NotificationsMessage extends jspb.Message { 

    hasGeneral(): boolean;
    clearGeneral(): void;
    getGeneral(): GeneralTypeMessage | undefined;
    setGeneral(value?: GeneralTypeMessage): NotificationsMessage;

    hasGestaltInvite(): boolean;
    clearGestaltInvite(): void;
    getGestaltInvite(): string;
    setGestaltInvite(value: string): NotificationsMessage;

    hasVaultShare(): boolean;
    clearVaultShare(): void;
    getVaultShare(): VaultShareTypeMessage | undefined;
    setVaultShare(value?: VaultShareTypeMessage): NotificationsMessage;
    getSenderId(): string;
    setSenderId(value: string): NotificationsMessage;
    getIsRead(): boolean;
    setIsRead(value: boolean): NotificationsMessage;

    getDataCase(): NotificationsMessage.DataCase;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): NotificationsMessage.AsObject;
    static toObject(includeInstance: boolean, msg: NotificationsMessage): NotificationsMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: NotificationsMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): NotificationsMessage;
    static deserializeBinaryFromReader(message: NotificationsMessage, reader: jspb.BinaryReader): NotificationsMessage;
}

export namespace NotificationsMessage {
    export type AsObject = {
        general?: GeneralTypeMessage.AsObject,
        gestaltInvite: string,
        vaultShare?: VaultShareTypeMessage.AsObject,
        senderId: string,
        isRead: boolean,
    }

    export enum DataCase {
        DATA_NOT_SET = 0,
        GENERAL = 1,
        GESTALT_INVITE = 2,
        VAULT_SHARE = 3,
    }

}

export class NotificationsSendMessage extends jspb.Message { 
    getReceiverId(): string;
    setReceiverId(value: string): NotificationsSendMessage;

    hasData(): boolean;
    clearData(): void;
    getData(): GeneralTypeMessage | undefined;
    setData(value?: GeneralTypeMessage): NotificationsSendMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): NotificationsSendMessage.AsObject;
    static toObject(includeInstance: boolean, msg: NotificationsSendMessage): NotificationsSendMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: NotificationsSendMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): NotificationsSendMessage;
    static deserializeBinaryFromReader(message: NotificationsSendMessage, reader: jspb.BinaryReader): NotificationsSendMessage;
}

export namespace NotificationsSendMessage {
    export type AsObject = {
        receiverId: string,
        data?: GeneralTypeMessage.AsObject,
    }
}

export class NotificationsReadMessage extends jspb.Message { 
    getUnread(): boolean;
    setUnread(value: boolean): NotificationsReadMessage;
    getNumber(): string;
    setNumber(value: string): NotificationsReadMessage;
    getOrder(): string;
    setOrder(value: string): NotificationsReadMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): NotificationsReadMessage.AsObject;
    static toObject(includeInstance: boolean, msg: NotificationsReadMessage): NotificationsReadMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: NotificationsReadMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): NotificationsReadMessage;
    static deserializeBinaryFromReader(message: NotificationsReadMessage, reader: jspb.BinaryReader): NotificationsReadMessage;
}

export namespace NotificationsReadMessage {
    export type AsObject = {
        unread: boolean,
        number: string,
        order: string,
    }
}

export class NotificationsListMessage extends jspb.Message { 
    clearNotificationList(): void;
    getNotificationList(): Array<NotificationsMessage>;
    setNotificationList(value: Array<NotificationsMessage>): NotificationsListMessage;
    addNotification(value?: NotificationsMessage, index?: number): NotificationsMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): NotificationsListMessage.AsObject;
    static toObject(includeInstance: boolean, msg: NotificationsListMessage): NotificationsListMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: NotificationsListMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): NotificationsListMessage;
    static deserializeBinaryFromReader(message: NotificationsListMessage, reader: jspb.BinaryReader): NotificationsListMessage;
}

export namespace NotificationsListMessage {
    export type AsObject = {
        notificationList: Array<NotificationsMessage.AsObject>,
    }
}

export class GeneralTypeMessage extends jspb.Message { 
    getMessage(): string;
    setMessage(value: string): GeneralTypeMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GeneralTypeMessage.AsObject;
    static toObject(includeInstance: boolean, msg: GeneralTypeMessage): GeneralTypeMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GeneralTypeMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GeneralTypeMessage;
    static deserializeBinaryFromReader(message: GeneralTypeMessage, reader: jspb.BinaryReader): GeneralTypeMessage;
}

export namespace GeneralTypeMessage {
    export type AsObject = {
        message: string,
    }
}

export class VaultShareTypeMessage extends jspb.Message { 
    getVaultId(): string;
    setVaultId(value: string): VaultShareTypeMessage;
    getVaultName(): string;
    setVaultName(value: string): VaultShareTypeMessage;
    clearActionsList(): void;
    getActionsList(): Array<string>;
    setActionsList(value: Array<string>): VaultShareTypeMessage;
    addActions(value: string, index?: number): string;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): VaultShareTypeMessage.AsObject;
    static toObject(includeInstance: boolean, msg: VaultShareTypeMessage): VaultShareTypeMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: VaultShareTypeMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): VaultShareTypeMessage;
    static deserializeBinaryFromReader(message: VaultShareTypeMessage, reader: jspb.BinaryReader): VaultShareTypeMessage;
}

export namespace VaultShareTypeMessage {
    export type AsObject = {
        vaultId: string,
        vaultName: string,
        actionsList: Array<string>,
    }
}
