// package: vault
// file: Vaults.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as Nodes_pb from "./Nodes_pb";

export class Vault extends jspb.Message { 
    getNameOrId(): string;
    setNameOrId(value: string): Vault;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Vault.AsObject;
    static toObject(includeInstance: boolean, msg: Vault): Vault.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Vault, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Vault;
    static deserializeBinaryFromReader(message: Vault, reader: jspb.BinaryReader): Vault;
}

export namespace Vault {
    export type AsObject = {
        nameOrId: string,
    }
}

export class List extends jspb.Message { 
    getVaultName(): string;
    setVaultName(value: string): List;
    getVaultId(): string;
    setVaultId(value: string): List;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): List.AsObject;
    static toObject(includeInstance: boolean, msg: List): List.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: List, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): List;
    static deserializeBinaryFromReader(message: List, reader: jspb.BinaryReader): List;
}

export namespace List {
    export type AsObject = {
        vaultName: string,
        vaultId: string,
    }
}

export class Rename extends jspb.Message { 

    hasVault(): boolean;
    clearVault(): void;
    getVault(): Vault | undefined;
    setVault(value?: Vault): Rename;
    getNewName(): string;
    setNewName(value: string): Rename;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Rename.AsObject;
    static toObject(includeInstance: boolean, msg: Rename): Rename.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Rename, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Rename;
    static deserializeBinaryFromReader(message: Rename, reader: jspb.BinaryReader): Rename;
}

export namespace Rename {
    export type AsObject = {
        vault?: Vault.AsObject,
        newName: string,
    }
}

export class Mkdir extends jspb.Message { 

    hasVault(): boolean;
    clearVault(): void;
    getVault(): Vault | undefined;
    setVault(value?: Vault): Mkdir;
    getDirName(): string;
    setDirName(value: string): Mkdir;
    getRecursive(): boolean;
    setRecursive(value: boolean): Mkdir;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Mkdir.AsObject;
    static toObject(includeInstance: boolean, msg: Mkdir): Mkdir.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Mkdir, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Mkdir;
    static deserializeBinaryFromReader(message: Mkdir, reader: jspb.BinaryReader): Mkdir;
}

export namespace Mkdir {
    export type AsObject = {
        vault?: Vault.AsObject,
        dirName: string,
        recursive: boolean,
    }
}

export class Pull extends jspb.Message { 

    hasVault(): boolean;
    clearVault(): void;
    getVault(): Vault | undefined;
    setVault(value?: Vault): Pull;

    hasNode(): boolean;
    clearNode(): void;
    getNode(): Nodes_pb.Node | undefined;
    setNode(value?: Nodes_pb.Node): Pull;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Pull.AsObject;
    static toObject(includeInstance: boolean, msg: Pull): Pull.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Pull, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Pull;
    static deserializeBinaryFromReader(message: Pull, reader: jspb.BinaryReader): Pull;
}

export namespace Pull {
    export type AsObject = {
        vault?: Vault.AsObject,
        node?: Nodes_pb.Node.AsObject,
    }
}

export class Clone extends jspb.Message { 

    hasVault(): boolean;
    clearVault(): void;
    getVault(): Vault | undefined;
    setVault(value?: Vault): Clone;

    hasNode(): boolean;
    clearNode(): void;
    getNode(): Nodes_pb.Node | undefined;
    setNode(value?: Nodes_pb.Node): Clone;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Clone.AsObject;
    static toObject(includeInstance: boolean, msg: Clone): Clone.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Clone, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Clone;
    static deserializeBinaryFromReader(message: Clone, reader: jspb.BinaryReader): Clone;
}

export namespace Clone {
    export type AsObject = {
        vault?: Vault.AsObject,
        node?: Nodes_pb.Node.AsObject,
    }
}

export class Stat extends jspb.Message { 
    getStats(): string;
    setStats(value: string): Stat;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Stat.AsObject;
    static toObject(includeInstance: boolean, msg: Stat): Stat.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Stat, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Stat;
    static deserializeBinaryFromReader(message: Stat, reader: jspb.BinaryReader): Stat;
}

export namespace Stat {
    export type AsObject = {
        stats: string,
    }
}

export class PermSet extends jspb.Message { 

    hasVault(): boolean;
    clearVault(): void;
    getVault(): Vault | undefined;
    setVault(value?: Vault): PermSet;

    hasNode(): boolean;
    clearNode(): void;
    getNode(): Nodes_pb.Node | undefined;
    setNode(value?: Nodes_pb.Node): PermSet;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PermSet.AsObject;
    static toObject(includeInstance: boolean, msg: PermSet): PermSet.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PermSet, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PermSet;
    static deserializeBinaryFromReader(message: PermSet, reader: jspb.BinaryReader): PermSet;
}

export namespace PermSet {
    export type AsObject = {
        vault?: Vault.AsObject,
        node?: Nodes_pb.Node.AsObject,
    }
}

export class PermUnset extends jspb.Message { 

    hasVault(): boolean;
    clearVault(): void;
    getVault(): Vault | undefined;
    setVault(value?: Vault): PermUnset;

    hasNode(): boolean;
    clearNode(): void;
    getNode(): Nodes_pb.Node | undefined;
    setNode(value?: Nodes_pb.Node): PermUnset;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PermUnset.AsObject;
    static toObject(includeInstance: boolean, msg: PermUnset): PermUnset.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PermUnset, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PermUnset;
    static deserializeBinaryFromReader(message: PermUnset, reader: jspb.BinaryReader): PermUnset;
}

export namespace PermUnset {
    export type AsObject = {
        vault?: Vault.AsObject,
        node?: Nodes_pb.Node.AsObject,
    }
}

export class PermGet extends jspb.Message { 

    hasVault(): boolean;
    clearVault(): void;
    getVault(): Vault | undefined;
    setVault(value?: Vault): PermGet;

    hasNode(): boolean;
    clearNode(): void;
    getNode(): Nodes_pb.Node | undefined;
    setNode(value?: Nodes_pb.Node): PermGet;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PermGet.AsObject;
    static toObject(includeInstance: boolean, msg: PermGet): PermGet.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PermGet, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PermGet;
    static deserializeBinaryFromReader(message: PermGet, reader: jspb.BinaryReader): PermGet;
}

export namespace PermGet {
    export type AsObject = {
        vault?: Vault.AsObject,
        node?: Nodes_pb.Node.AsObject,
    }
}

export class Permission extends jspb.Message { 
    getNodeId(): string;
    setNodeId(value: string): Permission;
    getAction(): string;
    setAction(value: string): Permission;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Permission.AsObject;
    static toObject(includeInstance: boolean, msg: Permission): Permission.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Permission, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Permission;
    static deserializeBinaryFromReader(message: Permission, reader: jspb.BinaryReader): Permission;
}

export namespace Permission {
    export type AsObject = {
        nodeId: string,
        action: string,
    }
}

export class Version extends jspb.Message { 

    hasVault(): boolean;
    clearVault(): void;
    getVault(): Vault | undefined;
    setVault(value?: Vault): Version;
    getVersionId(): string;
    setVersionId(value: string): Version;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Version.AsObject;
    static toObject(includeInstance: boolean, msg: Version): Version.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Version, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Version;
    static deserializeBinaryFromReader(message: Version, reader: jspb.BinaryReader): Version;
}

export namespace Version {
    export type AsObject = {
        vault?: Vault.AsObject,
        versionId: string,
    }
}

export class VersionResult extends jspb.Message { 
    getIsLatestVersion(): boolean;
    setIsLatestVersion(value: boolean): VersionResult;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): VersionResult.AsObject;
    static toObject(includeInstance: boolean, msg: VersionResult): VersionResult.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: VersionResult, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): VersionResult;
    static deserializeBinaryFromReader(message: VersionResult, reader: jspb.BinaryReader): VersionResult;
}

export namespace VersionResult {
    export type AsObject = {
        isLatestVersion: boolean,
    }
}

export class Log extends jspb.Message { 

    hasVault(): boolean;
    clearVault(): void;
    getVault(): Vault | undefined;
    setVault(value?: Vault): Log;
    getLogDepth(): number;
    setLogDepth(value: number): Log;
    getCommitId(): string;
    setCommitId(value: string): Log;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Log.AsObject;
    static toObject(includeInstance: boolean, msg: Log): Log.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Log, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Log;
    static deserializeBinaryFromReader(message: Log, reader: jspb.BinaryReader): Log;
}

export namespace Log {
    export type AsObject = {
        vault?: Vault.AsObject,
        logDepth: number,
        commitId: string,
    }
}

export class LogEntry extends jspb.Message { 
    getOid(): string;
    setOid(value: string): LogEntry;
    getCommitter(): string;
    setCommitter(value: string): LogEntry;
    getTimeStamp(): number;
    setTimeStamp(value: number): LogEntry;
    getMessage(): string;
    setMessage(value: string): LogEntry;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): LogEntry.AsObject;
    static toObject(includeInstance: boolean, msg: LogEntry): LogEntry.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: LogEntry, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): LogEntry;
    static deserializeBinaryFromReader(message: LogEntry, reader: jspb.BinaryReader): LogEntry;
}

export namespace LogEntry {
    export type AsObject = {
        oid: string,
        committer: string,
        timeStamp: number,
        message: string,
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

export class NodePermission extends jspb.Message { 
    getNodeId(): string;
    setNodeId(value: string): NodePermission;
    getVaultId(): string;
    setVaultId(value: string): NodePermission;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): NodePermission.AsObject;
    static toObject(includeInstance: boolean, msg: NodePermission): NodePermission.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: NodePermission, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): NodePermission;
    static deserializeBinaryFromReader(message: NodePermission, reader: jspb.BinaryReader): NodePermission;
}

export namespace NodePermission {
    export type AsObject = {
        nodeId: string,
        vaultId: string,
    }
}

export class NodePermissionAllowed extends jspb.Message { 
    getPermission(): boolean;
    setPermission(value: boolean): NodePermissionAllowed;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): NodePermissionAllowed.AsObject;
    static toObject(includeInstance: boolean, msg: NodePermissionAllowed): NodePermissionAllowed.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: NodePermissionAllowed, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): NodePermissionAllowed;
    static deserializeBinaryFromReader(message: NodePermissionAllowed, reader: jspb.BinaryReader): NodePermissionAllowed;
}

export namespace NodePermissionAllowed {
    export type AsObject = {
        permission: boolean,
    }
}
