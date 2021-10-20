// package: polykey.v1.secrets
// file: polykey/v1/secrets/secrets.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as polykey_v1_vaults_vaults_pb from "../../../polykey/v1/vaults/vaults_pb";

export class Rename extends jspb.Message { 

    hasOldSecret(): boolean;
    clearOldSecret(): void;
    getOldSecret(): Secret | undefined;
    setOldSecret(value?: Secret): Rename;
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
        oldSecret?: Secret.AsObject,
        newName: string,
    }
}

export class Secret extends jspb.Message { 

    hasVault(): boolean;
    clearVault(): void;
    getVault(): polykey_v1_vaults_vaults_pb.Vault | undefined;
    setVault(value?: polykey_v1_vaults_vaults_pb.Vault): Secret;
    getSecretName(): string;
    setSecretName(value: string): Secret;
    getSecretContent(): Uint8Array | string;
    getSecretContent_asU8(): Uint8Array;
    getSecretContent_asB64(): string;
    setSecretContent(value: Uint8Array | string): Secret;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Secret.AsObject;
    static toObject(includeInstance: boolean, msg: Secret): Secret.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Secret, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Secret;
    static deserializeBinaryFromReader(message: Secret, reader: jspb.BinaryReader): Secret;
}

export namespace Secret {
    export type AsObject = {
        vault?: polykey_v1_vaults_vaults_pb.Vault.AsObject,
        secretName: string,
        secretContent: Uint8Array | string,
    }
}

export class Directory extends jspb.Message { 

    hasVault(): boolean;
    clearVault(): void;
    getVault(): polykey_v1_vaults_vaults_pb.Vault | undefined;
    setVault(value?: polykey_v1_vaults_vaults_pb.Vault): Directory;
    getSecretDirectory(): string;
    setSecretDirectory(value: string): Directory;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Directory.AsObject;
    static toObject(includeInstance: boolean, msg: Directory): Directory.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Directory, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Directory;
    static deserializeBinaryFromReader(message: Directory, reader: jspb.BinaryReader): Directory;
}

export namespace Directory {
    export type AsObject = {
        vault?: polykey_v1_vaults_vaults_pb.Vault.AsObject,
        secretDirectory: string,
    }
}
