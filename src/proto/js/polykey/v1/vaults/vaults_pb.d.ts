// package: polykey.v1.vaults
// file: polykey/v1/vaults/vaults.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as polykey_v1_nodes_nodes_pb from "../../../polykey/v1/nodes/nodes_pb";
import * as google_protobuf_timestamp_pb from "google-protobuf/google/protobuf/timestamp_pb";

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
    clearVaultPermissionsList(): void;
    getVaultPermissionsList(): Array<string>;
    setVaultPermissionsList(value: Array<string>): List;
    addVaultPermissions(value: string, index?: number): string;

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
        vaultPermissionsList: Array<string>,
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
    getNode(): polykey_v1_nodes_nodes_pb.Node | undefined;
    setNode(value?: polykey_v1_nodes_nodes_pb.Node): Pull;

    hasPullVault(): boolean;
    clearPullVault(): void;
    getPullVault(): Vault | undefined;
    setPullVault(value?: Vault): Pull;

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
        node?: polykey_v1_nodes_nodes_pb.Node.AsObject,
        pullVault?: Vault.AsObject,
    }
}

export class Clone extends jspb.Message { 

    hasVault(): boolean;
    clearVault(): void;
    getVault(): Vault | undefined;
    setVault(value?: Vault): Clone;

    hasNode(): boolean;
    clearNode(): void;
    getNode(): polykey_v1_nodes_nodes_pb.Node | undefined;
    setNode(value?: polykey_v1_nodes_nodes_pb.Node): Clone;

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
        node?: polykey_v1_nodes_nodes_pb.Node.AsObject,
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

export class Permissions extends jspb.Message { 

    hasVault(): boolean;
    clearVault(): void;
    getVault(): Vault | undefined;
    setVault(value?: Vault): Permissions;

    hasNode(): boolean;
    clearNode(): void;
    getNode(): polykey_v1_nodes_nodes_pb.Node | undefined;
    setNode(value?: polykey_v1_nodes_nodes_pb.Node): Permissions;
    clearVaultPermissionsList(): void;
    getVaultPermissionsList(): Array<string>;
    setVaultPermissionsList(value: Array<string>): Permissions;
    addVaultPermissions(value: string, index?: number): string;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Permissions.AsObject;
    static toObject(includeInstance: boolean, msg: Permissions): Permissions.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Permissions, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Permissions;
    static deserializeBinaryFromReader(message: Permissions, reader: jspb.BinaryReader): Permissions;
}

export namespace Permissions {
    export type AsObject = {
        vault?: Vault.AsObject,
        node?: polykey_v1_nodes_nodes_pb.Node.AsObject,
        vaultPermissionsList: Array<string>,
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

    hasTimeStamp(): boolean;
    clearTimeStamp(): void;
    getTimeStamp(): google_protobuf_timestamp_pb.Timestamp | undefined;
    setTimeStamp(value?: google_protobuf_timestamp_pb.Timestamp): LogEntry;
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
        timeStamp?: google_protobuf_timestamp_pb.Timestamp.AsObject,
        message: string,
    }
}

export class InfoRequest extends jspb.Message { 

    hasVault(): boolean;
    clearVault(): void;
    getVault(): Vault | undefined;
    setVault(value?: Vault): InfoRequest;
    getAction(): string;
    setAction(value: string): InfoRequest;

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
        vault?: Vault.AsObject,
        action: string,
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
