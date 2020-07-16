// package: agent
// file: Agent.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class AgentMessage extends jspb.Message { 
    getType(): Type;
    setType(value: Type): AgentMessage;

    getIsresponse(): boolean;
    setIsresponse(value: boolean): AgentMessage;

    getNodePath(): string;
    setNodePath(value: string): AgentMessage;

    getSubMessage(): Uint8Array | string;
    getSubMessage_asU8(): Uint8Array;
    getSubMessage_asB64(): string;
    setSubMessage(value: Uint8Array | string): AgentMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AgentMessage.AsObject;
    static toObject(includeInstance: boolean, msg: AgentMessage): AgentMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AgentMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AgentMessage;
    static deserializeBinaryFromReader(message: AgentMessage, reader: jspb.BinaryReader): AgentMessage;
}

export namespace AgentMessage {
    export type AsObject = {
        type: Type,
        isresponse: boolean,
        nodePath: string,
        subMessage: Uint8Array | string,
    }
}

export class ErrorMessage extends jspb.Message { 
    getError(): string;
    setError(value: string): ErrorMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ErrorMessage.AsObject;
    static toObject(includeInstance: boolean, msg: ErrorMessage): ErrorMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ErrorMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ErrorMessage;
    static deserializeBinaryFromReader(message: ErrorMessage, reader: jspb.BinaryReader): ErrorMessage;
}

export namespace ErrorMessage {
    export type AsObject = {
        error: string,
    }
}

export class RegisterNodeRequestMessage extends jspb.Message { 
    getPassphrase(): string;
    setPassphrase(value: string): RegisterNodeRequestMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): RegisterNodeRequestMessage.AsObject;
    static toObject(includeInstance: boolean, msg: RegisterNodeRequestMessage): RegisterNodeRequestMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: RegisterNodeRequestMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): RegisterNodeRequestMessage;
    static deserializeBinaryFromReader(message: RegisterNodeRequestMessage, reader: jspb.BinaryReader): RegisterNodeRequestMessage;
}

export namespace RegisterNodeRequestMessage {
    export type AsObject = {
        passphrase: string,
    }
}

export class RegisterNodeResponseMessage extends jspb.Message { 
    getSuccessful(): boolean;
    setSuccessful(value: boolean): RegisterNodeResponseMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): RegisterNodeResponseMessage.AsObject;
    static toObject(includeInstance: boolean, msg: RegisterNodeResponseMessage): RegisterNodeResponseMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: RegisterNodeResponseMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): RegisterNodeResponseMessage;
    static deserializeBinaryFromReader(message: RegisterNodeResponseMessage, reader: jspb.BinaryReader): RegisterNodeResponseMessage;
}

export namespace RegisterNodeResponseMessage {
    export type AsObject = {
        successful: boolean,
    }
}

export class NewNodeRequestMessage extends jspb.Message { 
    getName(): string;
    setName(value: string): NewNodeRequestMessage;

    getEmail(): string;
    setEmail(value: string): NewNodeRequestMessage;

    getPassphrase(): string;
    setPassphrase(value: string): NewNodeRequestMessage;

    getNbits(): number;
    setNbits(value: number): NewNodeRequestMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): NewNodeRequestMessage.AsObject;
    static toObject(includeInstance: boolean, msg: NewNodeRequestMessage): NewNodeRequestMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: NewNodeRequestMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): NewNodeRequestMessage;
    static deserializeBinaryFromReader(message: NewNodeRequestMessage, reader: jspb.BinaryReader): NewNodeRequestMessage;
}

export namespace NewNodeRequestMessage {
    export type AsObject = {
        name: string,
        email: string,
        passphrase: string,
        nbits: number,
    }
}

export class NewNodeResponseMessage extends jspb.Message { 
    getSuccessful(): boolean;
    setSuccessful(value: boolean): NewNodeResponseMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): NewNodeResponseMessage.AsObject;
    static toObject(includeInstance: boolean, msg: NewNodeResponseMessage): NewNodeResponseMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: NewNodeResponseMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): NewNodeResponseMessage;
    static deserializeBinaryFromReader(message: NewNodeResponseMessage, reader: jspb.BinaryReader): NewNodeResponseMessage;
}

export namespace NewNodeResponseMessage {
    export type AsObject = {
        successful: boolean,
    }
}

export class ListNodesRequestMessage extends jspb.Message { 
    getUnlockedOnly(): boolean;
    setUnlockedOnly(value: boolean): ListNodesRequestMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ListNodesRequestMessage.AsObject;
    static toObject(includeInstance: boolean, msg: ListNodesRequestMessage): ListNodesRequestMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ListNodesRequestMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ListNodesRequestMessage;
    static deserializeBinaryFromReader(message: ListNodesRequestMessage, reader: jspb.BinaryReader): ListNodesRequestMessage;
}

export namespace ListNodesRequestMessage {
    export type AsObject = {
        unlockedOnly: boolean,
    }
}

export class ListNodesResponseMessage extends jspb.Message { 
    clearNodesList(): void;
    getNodesList(): Array<string>;
    setNodesList(value: Array<string>): ListNodesResponseMessage;
    addNodes(value: string, index?: number): string;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ListNodesResponseMessage.AsObject;
    static toObject(includeInstance: boolean, msg: ListNodesResponseMessage): ListNodesResponseMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ListNodesResponseMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ListNodesResponseMessage;
    static deserializeBinaryFromReader(message: ListNodesResponseMessage, reader: jspb.BinaryReader): ListNodesResponseMessage;
}

export namespace ListNodesResponseMessage {
    export type AsObject = {
        nodesList: Array<string>,
    }
}

export class SignFileRequestMessage extends jspb.Message { 
    getFilePath(): string;
    setFilePath(value: string): SignFileRequestMessage;

    getPrivateKeyPath(): string;
    setPrivateKeyPath(value: string): SignFileRequestMessage;

    getPassphrase(): string;
    setPassphrase(value: string): SignFileRequestMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SignFileRequestMessage.AsObject;
    static toObject(includeInstance: boolean, msg: SignFileRequestMessage): SignFileRequestMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SignFileRequestMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SignFileRequestMessage;
    static deserializeBinaryFromReader(message: SignFileRequestMessage, reader: jspb.BinaryReader): SignFileRequestMessage;
}

export namespace SignFileRequestMessage {
    export type AsObject = {
        filePath: string,
        privateKeyPath: string,
        passphrase: string,
    }
}

export class SignFileResponseMessage extends jspb.Message { 
    getSignaturePath(): string;
    setSignaturePath(value: string): SignFileResponseMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SignFileResponseMessage.AsObject;
    static toObject(includeInstance: boolean, msg: SignFileResponseMessage): SignFileResponseMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SignFileResponseMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SignFileResponseMessage;
    static deserializeBinaryFromReader(message: SignFileResponseMessage, reader: jspb.BinaryReader): SignFileResponseMessage;
}

export namespace SignFileResponseMessage {
    export type AsObject = {
        signaturePath: string,
    }
}

export class VerifyFileRequestMessage extends jspb.Message { 
    getFilePath(): string;
    setFilePath(value: string): VerifyFileRequestMessage;

    getSignaturePath(): string;
    setSignaturePath(value: string): VerifyFileRequestMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): VerifyFileRequestMessage.AsObject;
    static toObject(includeInstance: boolean, msg: VerifyFileRequestMessage): VerifyFileRequestMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: VerifyFileRequestMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): VerifyFileRequestMessage;
    static deserializeBinaryFromReader(message: VerifyFileRequestMessage, reader: jspb.BinaryReader): VerifyFileRequestMessage;
}

export namespace VerifyFileRequestMessage {
    export type AsObject = {
        filePath: string,
        signaturePath: string,
    }
}

export class VerifyFileResponseMessage extends jspb.Message { 
    getVerified(): boolean;
    setVerified(value: boolean): VerifyFileResponseMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): VerifyFileResponseMessage.AsObject;
    static toObject(includeInstance: boolean, msg: VerifyFileResponseMessage): VerifyFileResponseMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: VerifyFileResponseMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): VerifyFileResponseMessage;
    static deserializeBinaryFromReader(message: VerifyFileResponseMessage, reader: jspb.BinaryReader): VerifyFileResponseMessage;
}

export namespace VerifyFileResponseMessage {
    export type AsObject = {
        verified: boolean,
    }
}

export class ListVaultsRequestMessage extends jspb.Message { 

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ListVaultsRequestMessage.AsObject;
    static toObject(includeInstance: boolean, msg: ListVaultsRequestMessage): ListVaultsRequestMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ListVaultsRequestMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ListVaultsRequestMessage;
    static deserializeBinaryFromReader(message: ListVaultsRequestMessage, reader: jspb.BinaryReader): ListVaultsRequestMessage;
}

export namespace ListVaultsRequestMessage {
    export type AsObject = {
    }
}

export class ListVaultsResponseMessage extends jspb.Message { 
    clearVaultNamesList(): void;
    getVaultNamesList(): Array<string>;
    setVaultNamesList(value: Array<string>): ListVaultsResponseMessage;
    addVaultNames(value: string, index?: number): string;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ListVaultsResponseMessage.AsObject;
    static toObject(includeInstance: boolean, msg: ListVaultsResponseMessage): ListVaultsResponseMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ListVaultsResponseMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ListVaultsResponseMessage;
    static deserializeBinaryFromReader(message: ListVaultsResponseMessage, reader: jspb.BinaryReader): ListVaultsResponseMessage;
}

export namespace ListVaultsResponseMessage {
    export type AsObject = {
        vaultNamesList: Array<string>,
    }
}

export class NewVaultRequestMessage extends jspb.Message { 
    getVaultName(): string;
    setVaultName(value: string): NewVaultRequestMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): NewVaultRequestMessage.AsObject;
    static toObject(includeInstance: boolean, msg: NewVaultRequestMessage): NewVaultRequestMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: NewVaultRequestMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): NewVaultRequestMessage;
    static deserializeBinaryFromReader(message: NewVaultRequestMessage, reader: jspb.BinaryReader): NewVaultRequestMessage;
}

export namespace NewVaultRequestMessage {
    export type AsObject = {
        vaultName: string,
    }
}

export class NewVaultResponseMessage extends jspb.Message { 
    getSuccessful(): boolean;
    setSuccessful(value: boolean): NewVaultResponseMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): NewVaultResponseMessage.AsObject;
    static toObject(includeInstance: boolean, msg: NewVaultResponseMessage): NewVaultResponseMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: NewVaultResponseMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): NewVaultResponseMessage;
    static deserializeBinaryFromReader(message: NewVaultResponseMessage, reader: jspb.BinaryReader): NewVaultResponseMessage;
}

export namespace NewVaultResponseMessage {
    export type AsObject = {
        successful: boolean,
    }
}

export class DestroyVaultRequestMessage extends jspb.Message { 
    getVaultName(): string;
    setVaultName(value: string): DestroyVaultRequestMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): DestroyVaultRequestMessage.AsObject;
    static toObject(includeInstance: boolean, msg: DestroyVaultRequestMessage): DestroyVaultRequestMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: DestroyVaultRequestMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): DestroyVaultRequestMessage;
    static deserializeBinaryFromReader(message: DestroyVaultRequestMessage, reader: jspb.BinaryReader): DestroyVaultRequestMessage;
}

export namespace DestroyVaultRequestMessage {
    export type AsObject = {
        vaultName: string,
    }
}

export class DestroyVaultResponseMessage extends jspb.Message { 
    getSuccessful(): boolean;
    setSuccessful(value: boolean): DestroyVaultResponseMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): DestroyVaultResponseMessage.AsObject;
    static toObject(includeInstance: boolean, msg: DestroyVaultResponseMessage): DestroyVaultResponseMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: DestroyVaultResponseMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): DestroyVaultResponseMessage;
    static deserializeBinaryFromReader(message: DestroyVaultResponseMessage, reader: jspb.BinaryReader): DestroyVaultResponseMessage;
}

export namespace DestroyVaultResponseMessage {
    export type AsObject = {
        successful: boolean,
    }
}

export class ListSecretsRequestMessage extends jspb.Message { 
    getVaultName(): string;
    setVaultName(value: string): ListSecretsRequestMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ListSecretsRequestMessage.AsObject;
    static toObject(includeInstance: boolean, msg: ListSecretsRequestMessage): ListSecretsRequestMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ListSecretsRequestMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ListSecretsRequestMessage;
    static deserializeBinaryFromReader(message: ListSecretsRequestMessage, reader: jspb.BinaryReader): ListSecretsRequestMessage;
}

export namespace ListSecretsRequestMessage {
    export type AsObject = {
        vaultName: string,
    }
}

export class ListSecretsResponseMessage extends jspb.Message { 
    clearSecretNamesList(): void;
    getSecretNamesList(): Array<string>;
    setSecretNamesList(value: Array<string>): ListSecretsResponseMessage;
    addSecretNames(value: string, index?: number): string;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ListSecretsResponseMessage.AsObject;
    static toObject(includeInstance: boolean, msg: ListSecretsResponseMessage): ListSecretsResponseMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ListSecretsResponseMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ListSecretsResponseMessage;
    static deserializeBinaryFromReader(message: ListSecretsResponseMessage, reader: jspb.BinaryReader): ListSecretsResponseMessage;
}

export namespace ListSecretsResponseMessage {
    export type AsObject = {
        secretNamesList: Array<string>,
    }
}

export class CreateSecretRequestMessage extends jspb.Message { 
    getVaultName(): string;
    setVaultName(value: string): CreateSecretRequestMessage;

    getSecretName(): string;
    setSecretName(value: string): CreateSecretRequestMessage;

    getSecretPath(): string;
    setSecretPath(value: string): CreateSecretRequestMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): CreateSecretRequestMessage.AsObject;
    static toObject(includeInstance: boolean, msg: CreateSecretRequestMessage): CreateSecretRequestMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: CreateSecretRequestMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): CreateSecretRequestMessage;
    static deserializeBinaryFromReader(message: CreateSecretRequestMessage, reader: jspb.BinaryReader): CreateSecretRequestMessage;
}

export namespace CreateSecretRequestMessage {
    export type AsObject = {
        vaultName: string,
        secretName: string,
        secretPath: string,
    }
}

export class CreateSecretResponseMessage extends jspb.Message { 
    getSuccessful(): boolean;
    setSuccessful(value: boolean): CreateSecretResponseMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): CreateSecretResponseMessage.AsObject;
    static toObject(includeInstance: boolean, msg: CreateSecretResponseMessage): CreateSecretResponseMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: CreateSecretResponseMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): CreateSecretResponseMessage;
    static deserializeBinaryFromReader(message: CreateSecretResponseMessage, reader: jspb.BinaryReader): CreateSecretResponseMessage;
}

export namespace CreateSecretResponseMessage {
    export type AsObject = {
        successful: boolean,
    }
}

export class DestroySecretRequestMessage extends jspb.Message { 
    getVaultName(): string;
    setVaultName(value: string): DestroySecretRequestMessage;

    getSecretName(): string;
    setSecretName(value: string): DestroySecretRequestMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): DestroySecretRequestMessage.AsObject;
    static toObject(includeInstance: boolean, msg: DestroySecretRequestMessage): DestroySecretRequestMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: DestroySecretRequestMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): DestroySecretRequestMessage;
    static deserializeBinaryFromReader(message: DestroySecretRequestMessage, reader: jspb.BinaryReader): DestroySecretRequestMessage;
}

export namespace DestroySecretRequestMessage {
    export type AsObject = {
        vaultName: string,
        secretName: string,
    }
}

export class DestroySecretResponseMessage extends jspb.Message { 
    getSuccessful(): boolean;
    setSuccessful(value: boolean): DestroySecretResponseMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): DestroySecretResponseMessage.AsObject;
    static toObject(includeInstance: boolean, msg: DestroySecretResponseMessage): DestroySecretResponseMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: DestroySecretResponseMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): DestroySecretResponseMessage;
    static deserializeBinaryFromReader(message: DestroySecretResponseMessage, reader: jspb.BinaryReader): DestroySecretResponseMessage;
}

export namespace DestroySecretResponseMessage {
    export type AsObject = {
        successful: boolean,
    }
}

export class DeriveKeyRequestMessage extends jspb.Message { 
    getVaultName(): string;
    setVaultName(value: string): DeriveKeyRequestMessage;

    getKeyName(): string;
    setKeyName(value: string): DeriveKeyRequestMessage;

    getPassphrase(): string;
    setPassphrase(value: string): DeriveKeyRequestMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): DeriveKeyRequestMessage.AsObject;
    static toObject(includeInstance: boolean, msg: DeriveKeyRequestMessage): DeriveKeyRequestMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: DeriveKeyRequestMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): DeriveKeyRequestMessage;
    static deserializeBinaryFromReader(message: DeriveKeyRequestMessage, reader: jspb.BinaryReader): DeriveKeyRequestMessage;
}

export namespace DeriveKeyRequestMessage {
    export type AsObject = {
        vaultName: string,
        keyName: string,
        passphrase: string,
    }
}

export class DeriveKeyResponseMessage extends jspb.Message { 
    getSuccessful(): boolean;
    setSuccessful(value: boolean): DeriveKeyResponseMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): DeriveKeyResponseMessage.AsObject;
    static toObject(includeInstance: boolean, msg: DeriveKeyResponseMessage): DeriveKeyResponseMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: DeriveKeyResponseMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): DeriveKeyResponseMessage;
    static deserializeBinaryFromReader(message: DeriveKeyResponseMessage, reader: jspb.BinaryReader): DeriveKeyResponseMessage;
}

export namespace DeriveKeyResponseMessage {
    export type AsObject = {
        successful: boolean,
    }
}

export enum Type {
    ERROR = 0,
    STOP_AGENT = 1,
    STATUS = 2,
    REGISTER_NODE = 3,
    NEW_NODE = 4,
    LIST_NODES = 5,
    DERIVE_KEY = 6,
    SIGN_FILE = 7,
    VERIFY_FILE = 8,
    LIST_VAULTS = 9,
    NEW_VAULT = 10,
    DESTROY_VAULT = 11,
    LIST_SECRETS = 12,
    CREATE_SECRET = 13,
    DESTROY_SECRET = 14,
}
