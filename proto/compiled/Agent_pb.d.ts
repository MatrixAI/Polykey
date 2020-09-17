// package: agent
// file: Agent.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class AgentMessage extends jspb.Message { 
    getType(): AgentMessageType;
    setType(value: AgentMessageType): AgentMessage;

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
        type: AgentMessageType,
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

    getPublicKeyPath(): string;
    setPublicKeyPath(value: string): VerifyFileRequestMessage;


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
        publicKeyPath: string,
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

export class EncryptFileRequestMessage extends jspb.Message { 
    getFilePath(): string;
    setFilePath(value: string): EncryptFileRequestMessage;

    getPublicKeyPath(): string;
    setPublicKeyPath(value: string): EncryptFileRequestMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): EncryptFileRequestMessage.AsObject;
    static toObject(includeInstance: boolean, msg: EncryptFileRequestMessage): EncryptFileRequestMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: EncryptFileRequestMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): EncryptFileRequestMessage;
    static deserializeBinaryFromReader(message: EncryptFileRequestMessage, reader: jspb.BinaryReader): EncryptFileRequestMessage;
}

export namespace EncryptFileRequestMessage {
    export type AsObject = {
        filePath: string,
        publicKeyPath: string,
    }
}

export class EncryptFileResponseMessage extends jspb.Message { 
    getEncryptedpath(): string;
    setEncryptedpath(value: string): EncryptFileResponseMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): EncryptFileResponseMessage.AsObject;
    static toObject(includeInstance: boolean, msg: EncryptFileResponseMessage): EncryptFileResponseMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: EncryptFileResponseMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): EncryptFileResponseMessage;
    static deserializeBinaryFromReader(message: EncryptFileResponseMessage, reader: jspb.BinaryReader): EncryptFileResponseMessage;
}

export namespace EncryptFileResponseMessage {
    export type AsObject = {
        encryptedpath: string,
    }
}

export class DecryptFileRequestMessage extends jspb.Message { 
    getFilePath(): string;
    setFilePath(value: string): DecryptFileRequestMessage;

    getPrivateKeyPath(): string;
    setPrivateKeyPath(value: string): DecryptFileRequestMessage;

    getPassphrase(): string;
    setPassphrase(value: string): DecryptFileRequestMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): DecryptFileRequestMessage.AsObject;
    static toObject(includeInstance: boolean, msg: DecryptFileRequestMessage): DecryptFileRequestMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: DecryptFileRequestMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): DecryptFileRequestMessage;
    static deserializeBinaryFromReader(message: DecryptFileRequestMessage, reader: jspb.BinaryReader): DecryptFileRequestMessage;
}

export namespace DecryptFileRequestMessage {
    export type AsObject = {
        filePath: string,
        privateKeyPath: string,
        passphrase: string,
    }
}

export class DecryptFileResponseMessage extends jspb.Message { 
    getDecryptedpath(): string;
    setDecryptedpath(value: string): DecryptFileResponseMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): DecryptFileResponseMessage.AsObject;
    static toObject(includeInstance: boolean, msg: DecryptFileResponseMessage): DecryptFileResponseMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: DecryptFileResponseMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): DecryptFileResponseMessage;
    static deserializeBinaryFromReader(message: DecryptFileResponseMessage, reader: jspb.BinaryReader): DecryptFileResponseMessage;
}

export namespace DecryptFileResponseMessage {
    export type AsObject = {
        decryptedpath: string,
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

    getSecretContent(): Uint8Array | string;
    getSecretContent_asU8(): Uint8Array;
    getSecretContent_asB64(): string;
    setSecretContent(value: Uint8Array | string): CreateSecretRequestMessage;


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
        secretContent: Uint8Array | string,
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

export class GetSecretRequestMessage extends jspb.Message { 
    getVaultName(): string;
    setVaultName(value: string): GetSecretRequestMessage;

    getSecretName(): string;
    setSecretName(value: string): GetSecretRequestMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetSecretRequestMessage.AsObject;
    static toObject(includeInstance: boolean, msg: GetSecretRequestMessage): GetSecretRequestMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetSecretRequestMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetSecretRequestMessage;
    static deserializeBinaryFromReader(message: GetSecretRequestMessage, reader: jspb.BinaryReader): GetSecretRequestMessage;
}

export namespace GetSecretRequestMessage {
    export type AsObject = {
        vaultName: string,
        secretName: string,
    }
}

export class GetSecretResponseMessage extends jspb.Message { 
    getSecret(): Uint8Array | string;
    getSecret_asU8(): Uint8Array;
    getSecret_asB64(): string;
    setSecret(value: Uint8Array | string): GetSecretResponseMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetSecretResponseMessage.AsObject;
    static toObject(includeInstance: boolean, msg: GetSecretResponseMessage): GetSecretResponseMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetSecretResponseMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetSecretResponseMessage;
    static deserializeBinaryFromReader(message: GetSecretResponseMessage, reader: jspb.BinaryReader): GetSecretResponseMessage;
}

export namespace GetSecretResponseMessage {
    export type AsObject = {
        secret: Uint8Array | string,
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

export class ListKeysRequestMessage extends jspb.Message { 

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ListKeysRequestMessage.AsObject;
    static toObject(includeInstance: boolean, msg: ListKeysRequestMessage): ListKeysRequestMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ListKeysRequestMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ListKeysRequestMessage;
    static deserializeBinaryFromReader(message: ListKeysRequestMessage, reader: jspb.BinaryReader): ListKeysRequestMessage;
}

export namespace ListKeysRequestMessage {
    export type AsObject = {
    }
}

export class ListKeysResponseMessage extends jspb.Message { 
    clearKeyNamesList(): void;
    getKeyNamesList(): Array<string>;
    setKeyNamesList(value: Array<string>): ListKeysResponseMessage;
    addKeyNames(value: string, index?: number): string;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ListKeysResponseMessage.AsObject;
    static toObject(includeInstance: boolean, msg: ListKeysResponseMessage): ListKeysResponseMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ListKeysResponseMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ListKeysResponseMessage;
    static deserializeBinaryFromReader(message: ListKeysResponseMessage, reader: jspb.BinaryReader): ListKeysResponseMessage;
}

export namespace ListKeysResponseMessage {
    export type AsObject = {
        keyNamesList: Array<string>,
    }
}

export class GetKeyRequestMessage extends jspb.Message { 
    getKeyName(): string;
    setKeyName(value: string): GetKeyRequestMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetKeyRequestMessage.AsObject;
    static toObject(includeInstance: boolean, msg: GetKeyRequestMessage): GetKeyRequestMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetKeyRequestMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetKeyRequestMessage;
    static deserializeBinaryFromReader(message: GetKeyRequestMessage, reader: jspb.BinaryReader): GetKeyRequestMessage;
}

export namespace GetKeyRequestMessage {
    export type AsObject = {
        keyName: string,
    }
}

export class GetKeyResponseMessage extends jspb.Message { 
    getKeyName(): string;
    setKeyName(value: string): GetKeyResponseMessage;

    getKeyContent(): string;
    setKeyContent(value: string): GetKeyResponseMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetKeyResponseMessage.AsObject;
    static toObject(includeInstance: boolean, msg: GetKeyResponseMessage): GetKeyResponseMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetKeyResponseMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetKeyResponseMessage;
    static deserializeBinaryFromReader(message: GetKeyResponseMessage, reader: jspb.BinaryReader): GetKeyResponseMessage;
}

export namespace GetKeyResponseMessage {
    export type AsObject = {
        keyName: string,
        keyContent: string,
    }
}

export class GetPrimaryKeyPairRequestMessage extends jspb.Message { 
    getIncludePrivateKey(): boolean;
    setIncludePrivateKey(value: boolean): GetPrimaryKeyPairRequestMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetPrimaryKeyPairRequestMessage.AsObject;
    static toObject(includeInstance: boolean, msg: GetPrimaryKeyPairRequestMessage): GetPrimaryKeyPairRequestMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetPrimaryKeyPairRequestMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetPrimaryKeyPairRequestMessage;
    static deserializeBinaryFromReader(message: GetPrimaryKeyPairRequestMessage, reader: jspb.BinaryReader): GetPrimaryKeyPairRequestMessage;
}

export namespace GetPrimaryKeyPairRequestMessage {
    export type AsObject = {
        includePrivateKey: boolean,
    }
}

export class GetPrimaryKeyPairResponseMessage extends jspb.Message { 
    getPublicKey(): string;
    setPublicKey(value: string): GetPrimaryKeyPairResponseMessage;

    getPrivateKey(): string;
    setPrivateKey(value: string): GetPrimaryKeyPairResponseMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetPrimaryKeyPairResponseMessage.AsObject;
    static toObject(includeInstance: boolean, msg: GetPrimaryKeyPairResponseMessage): GetPrimaryKeyPairResponseMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetPrimaryKeyPairResponseMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetPrimaryKeyPairResponseMessage;
    static deserializeBinaryFromReader(message: GetPrimaryKeyPairResponseMessage, reader: jspb.BinaryReader): GetPrimaryKeyPairResponseMessage;
}

export namespace GetPrimaryKeyPairResponseMessage {
    export type AsObject = {
        publicKey: string,
        privateKey: string,
    }
}

export class UpdateSecretRequestMessage extends jspb.Message { 
    getVaultName(): string;
    setVaultName(value: string): UpdateSecretRequestMessage;

    getSecretName(): string;
    setSecretName(value: string): UpdateSecretRequestMessage;

    getSecretPath(): string;
    setSecretPath(value: string): UpdateSecretRequestMessage;

    getSecretContent(): Uint8Array | string;
    getSecretContent_asU8(): Uint8Array;
    getSecretContent_asB64(): string;
    setSecretContent(value: Uint8Array | string): UpdateSecretRequestMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): UpdateSecretRequestMessage.AsObject;
    static toObject(includeInstance: boolean, msg: UpdateSecretRequestMessage): UpdateSecretRequestMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: UpdateSecretRequestMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): UpdateSecretRequestMessage;
    static deserializeBinaryFromReader(message: UpdateSecretRequestMessage, reader: jspb.BinaryReader): UpdateSecretRequestMessage;
}

export namespace UpdateSecretRequestMessage {
    export type AsObject = {
        vaultName: string,
        secretName: string,
        secretPath: string,
        secretContent: Uint8Array | string,
    }
}

export class UpdateSecretResponseMessage extends jspb.Message { 
    getSuccessful(): boolean;
    setSuccessful(value: boolean): UpdateSecretResponseMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): UpdateSecretResponseMessage.AsObject;
    static toObject(includeInstance: boolean, msg: UpdateSecretResponseMessage): UpdateSecretResponseMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: UpdateSecretResponseMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): UpdateSecretResponseMessage;
    static deserializeBinaryFromReader(message: UpdateSecretResponseMessage, reader: jspb.BinaryReader): UpdateSecretResponseMessage;
}

export namespace UpdateSecretResponseMessage {
    export type AsObject = {
        successful: boolean,
    }
}

export class DeleteKeyRequestMessage extends jspb.Message { 
    getKeyName(): string;
    setKeyName(value: string): DeleteKeyRequestMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): DeleteKeyRequestMessage.AsObject;
    static toObject(includeInstance: boolean, msg: DeleteKeyRequestMessage): DeleteKeyRequestMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: DeleteKeyRequestMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): DeleteKeyRequestMessage;
    static deserializeBinaryFromReader(message: DeleteKeyRequestMessage, reader: jspb.BinaryReader): DeleteKeyRequestMessage;
}

export namespace DeleteKeyRequestMessage {
    export type AsObject = {
        keyName: string,
    }
}

export class DeleteKeyResponseMessage extends jspb.Message { 
    getSuccessful(): boolean;
    setSuccessful(value: boolean): DeleteKeyResponseMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): DeleteKeyResponseMessage.AsObject;
    static toObject(includeInstance: boolean, msg: DeleteKeyResponseMessage): DeleteKeyResponseMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: DeleteKeyResponseMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): DeleteKeyResponseMessage;
    static deserializeBinaryFromReader(message: DeleteKeyResponseMessage, reader: jspb.BinaryReader): DeleteKeyResponseMessage;
}

export namespace DeleteKeyResponseMessage {
    export type AsObject = {
        successful: boolean,
    }
}

export class PeerInfoRequestMessage extends jspb.Message { 
    getCurrent(): boolean;
    setCurrent(value: boolean): PeerInfoRequestMessage;

    getPublicKey(): string;
    setPublicKey(value: string): PeerInfoRequestMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PeerInfoRequestMessage.AsObject;
    static toObject(includeInstance: boolean, msg: PeerInfoRequestMessage): PeerInfoRequestMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PeerInfoRequestMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PeerInfoRequestMessage;
    static deserializeBinaryFromReader(message: PeerInfoRequestMessage, reader: jspb.BinaryReader): PeerInfoRequestMessage;
}

export namespace PeerInfoRequestMessage {
    export type AsObject = {
        current: boolean,
        publicKey: string,
    }
}

export class PeerInfoResponseMessage extends jspb.Message { 
    getPublicKey(): string;
    setPublicKey(value: string): PeerInfoResponseMessage;

    clearAddressesList(): void;
    getAddressesList(): Array<string>;
    setAddressesList(value: Array<string>): PeerInfoResponseMessage;
    addAddresses(value: string, index?: number): string;

    getConnectedAddress(): string;
    setConnectedAddress(value: string): PeerInfoResponseMessage;

    getRelayAddress(): string;
    setRelayAddress(value: string): PeerInfoResponseMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PeerInfoResponseMessage.AsObject;
    static toObject(includeInstance: boolean, msg: PeerInfoResponseMessage): PeerInfoResponseMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PeerInfoResponseMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PeerInfoResponseMessage;
    static deserializeBinaryFromReader(message: PeerInfoResponseMessage, reader: jspb.BinaryReader): PeerInfoResponseMessage;
}

export namespace PeerInfoResponseMessage {
    export type AsObject = {
        publicKey: string,
        addressesList: Array<string>,
        connectedAddress: string,
        relayAddress: string,
    }
}

export class AddPeerRequestMessage extends jspb.Message { 
    getPublicKey(): string;
    setPublicKey(value: string): AddPeerRequestMessage;

    clearAddressesList(): void;
    getAddressesList(): Array<string>;
    setAddressesList(value: Array<string>): AddPeerRequestMessage;
    addAddresses(value: string, index?: number): string;

    getConnectedAddress(): string;
    setConnectedAddress(value: string): AddPeerRequestMessage;

    getRelayAddress(): string;
    setRelayAddress(value: string): AddPeerRequestMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AddPeerRequestMessage.AsObject;
    static toObject(includeInstance: boolean, msg: AddPeerRequestMessage): AddPeerRequestMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AddPeerRequestMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AddPeerRequestMessage;
    static deserializeBinaryFromReader(message: AddPeerRequestMessage, reader: jspb.BinaryReader): AddPeerRequestMessage;
}

export namespace AddPeerRequestMessage {
    export type AsObject = {
        publicKey: string,
        addressesList: Array<string>,
        connectedAddress: string,
        relayAddress: string,
    }
}

export class AddPeerResponseMessage extends jspb.Message { 
    getSuccessful(): boolean;
    setSuccessful(value: boolean): AddPeerResponseMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AddPeerResponseMessage.AsObject;
    static toObject(includeInstance: boolean, msg: AddPeerResponseMessage): AddPeerResponseMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AddPeerResponseMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AddPeerResponseMessage;
    static deserializeBinaryFromReader(message: AddPeerResponseMessage, reader: jspb.BinaryReader): AddPeerResponseMessage;
}

export namespace AddPeerResponseMessage {
    export type AsObject = {
        successful: boolean,
    }
}

export enum AgentMessageType {
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
    GET_SECRET = 15,
    LIST_KEYS = 16,
    GET_KEY = 17,
    DELETE_KEY = 18,
    ENCRYPT_FILE = 19,
    DECRYPT_FILE = 20,
    GET_PRIMARY_KEYPAIR = 21,
    UPDATE_SECRET = 22,
    GET_PEER_INFO = 23,
    ADD_PEER = 24,
}
