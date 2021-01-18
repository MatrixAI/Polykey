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

export class StringMessage extends jspb.Message { 
    getS(): string;
    setS(value: string): StringMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): StringMessage.AsObject;
    static toObject(includeInstance: boolean, msg: StringMessage): StringMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: StringMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): StringMessage;
    static deserializeBinaryFromReader(message: StringMessage, reader: jspb.BinaryReader): StringMessage;
}

export namespace StringMessage {
    export type AsObject = {
        s: string,
    }
}

export class BooleanMessage extends jspb.Message { 
    getB(): boolean;
    setB(value: boolean): BooleanMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): BooleanMessage.AsObject;
    static toObject(includeInstance: boolean, msg: BooleanMessage): BooleanMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: BooleanMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): BooleanMessage;
    static deserializeBinaryFromReader(message: BooleanMessage, reader: jspb.BinaryReader): BooleanMessage;
}

export namespace BooleanMessage {
    export type AsObject = {
        b: boolean,
    }
}

export class StringListMessage extends jspb.Message { 
    clearSList(): void;
    getSList(): Array<string>;
    setSList(value: Array<string>): StringListMessage;
    addS(value: string, index?: number): string;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): StringListMessage.AsObject;
    static toObject(includeInstance: boolean, msg: StringListMessage): StringListMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: StringListMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): StringListMessage;
    static deserializeBinaryFromReader(message: StringListMessage, reader: jspb.BinaryReader): StringListMessage;
}

export namespace StringListMessage {
    export type AsObject = {
        sList: Array<string>,
    }
}

export class PeerInfoMessage extends jspb.Message { 
    getPublicKey(): string;
    setPublicKey(value: string): PeerInfoMessage;

    getRootCertificate(): string;
    setRootCertificate(value: string): PeerInfoMessage;

    getPeerAddress(): string;
    setPeerAddress(value: string): PeerInfoMessage;

    getApiAddress(): string;
    setApiAddress(value: string): PeerInfoMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PeerInfoMessage.AsObject;
    static toObject(includeInstance: boolean, msg: PeerInfoMessage): PeerInfoMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PeerInfoMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PeerInfoMessage;
    static deserializeBinaryFromReader(message: PeerInfoMessage, reader: jspb.BinaryReader): PeerInfoMessage;
}

export namespace PeerInfoMessage {
    export type AsObject = {
        publicKey: string,
        rootCertificate: string,
        peerAddress: string,
        apiAddress: string,
    }
}

export class AgentStatusMessage extends jspb.Message { 
    getStatus(): AgentStatusType;
    setStatus(value: AgentStatusType): AgentStatusMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AgentStatusMessage.AsObject;
    static toObject(includeInstance: boolean, msg: AgentStatusMessage): AgentStatusMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AgentStatusMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AgentStatusMessage;
    static deserializeBinaryFromReader(message: AgentStatusMessage, reader: jspb.BinaryReader): AgentStatusMessage;
}

export namespace AgentStatusMessage {
    export type AsObject = {
        status: AgentStatusType,
    }
}

export class NewKeyPairMessage extends jspb.Message { 
    getUserid(): string;
    setUserid(value: string): NewKeyPairMessage;

    getPassphrase(): string;
    setPassphrase(value: string): NewKeyPairMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): NewKeyPairMessage.AsObject;
    static toObject(includeInstance: boolean, msg: NewKeyPairMessage): NewKeyPairMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: NewKeyPairMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): NewKeyPairMessage;
    static deserializeBinaryFromReader(message: NewKeyPairMessage, reader: jspb.BinaryReader): NewKeyPairMessage;
}

export namespace NewKeyPairMessage {
    export type AsObject = {
        userid: string,
        passphrase: string,
    }
}

export class DeriveKeyMessage extends jspb.Message { 
    getKeyName(): string;
    setKeyName(value: string): DeriveKeyMessage;

    getPassphrase(): string;
    setPassphrase(value: string): DeriveKeyMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): DeriveKeyMessage.AsObject;
    static toObject(includeInstance: boolean, msg: DeriveKeyMessage): DeriveKeyMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: DeriveKeyMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): DeriveKeyMessage;
    static deserializeBinaryFromReader(message: DeriveKeyMessage, reader: jspb.BinaryReader): DeriveKeyMessage;
}

export namespace DeriveKeyMessage {
    export type AsObject = {
        keyName: string,
        passphrase: string,
    }
}

export class DeriveKeyPairMessage extends jspb.Message { 

    hasKeypairDetails(): boolean;
    clearKeypairDetails(): void;
    getKeypairDetails(): NewKeyPairMessage | undefined;
    setKeypairDetails(value?: NewKeyPairMessage): DeriveKeyPairMessage;

    getPublicKeyPath(): string;
    setPublicKeyPath(value: string): DeriveKeyPairMessage;

    getPrivateKeyPath(): string;
    setPrivateKeyPath(value: string): DeriveKeyPairMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): DeriveKeyPairMessage.AsObject;
    static toObject(includeInstance: boolean, msg: DeriveKeyPairMessage): DeriveKeyPairMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: DeriveKeyPairMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): DeriveKeyPairMessage;
    static deserializeBinaryFromReader(message: DeriveKeyPairMessage, reader: jspb.BinaryReader): DeriveKeyPairMessage;
}

export namespace DeriveKeyPairMessage {
    export type AsObject = {
        keypairDetails?: NewKeyPairMessage.AsObject,
        publicKeyPath: string,
        privateKeyPath: string,
    }
}

export class SignFileMessage extends jspb.Message { 
    getFilePath(): string;
    setFilePath(value: string): SignFileMessage;

    getPrivateKeyPath(): string;
    setPrivateKeyPath(value: string): SignFileMessage;

    getPassphrase(): string;
    setPassphrase(value: string): SignFileMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SignFileMessage.AsObject;
    static toObject(includeInstance: boolean, msg: SignFileMessage): SignFileMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SignFileMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SignFileMessage;
    static deserializeBinaryFromReader(message: SignFileMessage, reader: jspb.BinaryReader): SignFileMessage;
}

export namespace SignFileMessage {
    export type AsObject = {
        filePath: string,
        privateKeyPath: string,
        passphrase: string,
    }
}

export class VerifyFileMessage extends jspb.Message { 
    getFilePath(): string;
    setFilePath(value: string): VerifyFileMessage;

    getPublicKeyPath(): string;
    setPublicKeyPath(value: string): VerifyFileMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): VerifyFileMessage.AsObject;
    static toObject(includeInstance: boolean, msg: VerifyFileMessage): VerifyFileMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: VerifyFileMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): VerifyFileMessage;
    static deserializeBinaryFromReader(message: VerifyFileMessage, reader: jspb.BinaryReader): VerifyFileMessage;
}

export namespace VerifyFileMessage {
    export type AsObject = {
        filePath: string,
        publicKeyPath: string,
    }
}

export class SecretPathMessage extends jspb.Message { 
    getVaultName(): string;
    setVaultName(value: string): SecretPathMessage;

    getSecretName(): string;
    setSecretName(value: string): SecretPathMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SecretPathMessage.AsObject;
    static toObject(includeInstance: boolean, msg: SecretPathMessage): SecretPathMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SecretPathMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SecretPathMessage;
    static deserializeBinaryFromReader(message: SecretPathMessage, reader: jspb.BinaryReader): SecretPathMessage;
}

export namespace SecretPathMessage {
    export type AsObject = {
        vaultName: string,
        secretName: string,
    }
}

export class SecretContentMessage extends jspb.Message { 

    hasSecretPath(): boolean;
    clearSecretPath(): void;
    getSecretPath(): SecretPathMessage | undefined;
    setSecretPath(value?: SecretPathMessage): SecretContentMessage;

    getSecretFilePath(): string;
    setSecretFilePath(value: string): SecretContentMessage;

    getSecretContent(): string;
    setSecretContent(value: string): SecretContentMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SecretContentMessage.AsObject;
    static toObject(includeInstance: boolean, msg: SecretContentMessage): SecretContentMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SecretContentMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SecretContentMessage;
    static deserializeBinaryFromReader(message: SecretContentMessage, reader: jspb.BinaryReader): SecretContentMessage;
}

export namespace SecretContentMessage {
    export type AsObject = {
        secretPath?: SecretPathMessage.AsObject,
        secretFilePath: string,
        secretContent: string,
    }
}

export class EncryptFileMessage extends jspb.Message { 
    getFilePath(): string;
    setFilePath(value: string): EncryptFileMessage;

    getPublicKeyPath(): string;
    setPublicKeyPath(value: string): EncryptFileMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): EncryptFileMessage.AsObject;
    static toObject(includeInstance: boolean, msg: EncryptFileMessage): EncryptFileMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: EncryptFileMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): EncryptFileMessage;
    static deserializeBinaryFromReader(message: EncryptFileMessage, reader: jspb.BinaryReader): EncryptFileMessage;
}

export namespace EncryptFileMessage {
    export type AsObject = {
        filePath: string,
        publicKeyPath: string,
    }
}

export class DecryptFileMessage extends jspb.Message { 
    getFilePath(): string;
    setFilePath(value: string): DecryptFileMessage;

    getPrivateKeyPath(): string;
    setPrivateKeyPath(value: string): DecryptFileMessage;

    getPassphrase(): string;
    setPassphrase(value: string): DecryptFileMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): DecryptFileMessage.AsObject;
    static toObject(includeInstance: boolean, msg: DecryptFileMessage): DecryptFileMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: DecryptFileMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): DecryptFileMessage;
    static deserializeBinaryFromReader(message: DecryptFileMessage, reader: jspb.BinaryReader): DecryptFileMessage;
}

export namespace DecryptFileMessage {
    export type AsObject = {
        filePath: string,
        privateKeyPath: string,
        passphrase: string,
    }
}

export class KeyPairMessage extends jspb.Message { 
    getPublicKey(): string;
    setPublicKey(value: string): KeyPairMessage;

    getPrivateKey(): string;
    setPrivateKey(value: string): KeyPairMessage;


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
        publicKey: string,
        privateKey: string,
    }
}

export class VaultPathMessage extends jspb.Message { 
    getVaultName(): string;
    setVaultName(value: string): VaultPathMessage;

    getPublicKey(): string;
    setPublicKey(value: string): VaultPathMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): VaultPathMessage.AsObject;
    static toObject(includeInstance: boolean, msg: VaultPathMessage): VaultPathMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: VaultPathMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): VaultPathMessage;
    static deserializeBinaryFromReader(message: VaultPathMessage, reader: jspb.BinaryReader): VaultPathMessage;
}

export namespace VaultPathMessage {
    export type AsObject = {
        vaultName: string,
        publicKey: string,
    }
}

export class ContactPeerMessage extends jspb.Message { 
    getPublicKeyOrHandle(): string;
    setPublicKeyOrHandle(value: string): ContactPeerMessage;

    getTimeout(): number;
    setTimeout(value: number): ContactPeerMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ContactPeerMessage.AsObject;
    static toObject(includeInstance: boolean, msg: ContactPeerMessage): ContactPeerMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ContactPeerMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ContactPeerMessage;
    static deserializeBinaryFromReader(message: ContactPeerMessage, reader: jspb.BinaryReader): ContactPeerMessage;
}

export namespace ContactPeerMessage {
    export type AsObject = {
        publicKeyOrHandle: string,
        timeout: number,
    }
}

export class UnlockNodeMessage extends jspb.Message { 
    getPassphrase(): string;
    setPassphrase(value: string): UnlockNodeMessage;

    getTimeout(): number;
    setTimeout(value: number): UnlockNodeMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): UnlockNodeMessage.AsObject;
    static toObject(includeInstance: boolean, msg: UnlockNodeMessage): UnlockNodeMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: UnlockNodeMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): UnlockNodeMessage;
    static deserializeBinaryFromReader(message: UnlockNodeMessage, reader: jspb.BinaryReader): UnlockNodeMessage;
}

export namespace UnlockNodeMessage {
    export type AsObject = {
        passphrase: string,
        timeout: number,
    }
}

export class NewClientCertificateMessage extends jspb.Message { 
    getDomain(): string;
    setDomain(value: string): NewClientCertificateMessage;

    getCertFile(): string;
    setCertFile(value: string): NewClientCertificateMessage;

    getKeyFile(): string;
    setKeyFile(value: string): NewClientCertificateMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): NewClientCertificateMessage.AsObject;
    static toObject(includeInstance: boolean, msg: NewClientCertificateMessage): NewClientCertificateMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: NewClientCertificateMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): NewClientCertificateMessage;
    static deserializeBinaryFromReader(message: NewClientCertificateMessage, reader: jspb.BinaryReader): NewClientCertificateMessage;
}

export namespace NewClientCertificateMessage {
    export type AsObject = {
        domain: string,
        certFile: string,
        keyFile: string,
    }
}

export class NewOAuthTokenMessage extends jspb.Message { 
    clearScopesList(): void;
    getScopesList(): Array<string>;
    setScopesList(value: Array<string>): NewOAuthTokenMessage;
    addScopes(value: string, index?: number): string;

    getExpiry(): number;
    setExpiry(value: number): NewOAuthTokenMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): NewOAuthTokenMessage.AsObject;
    static toObject(includeInstance: boolean, msg: NewOAuthTokenMessage): NewOAuthTokenMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: NewOAuthTokenMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): NewOAuthTokenMessage;
    static deserializeBinaryFromReader(message: NewOAuthTokenMessage, reader: jspb.BinaryReader): NewOAuthTokenMessage;
}

export namespace NewOAuthTokenMessage {
    export type AsObject = {
        scopesList: Array<string>,
        expiry: number,
    }
}

export class OAuthClientMessage extends jspb.Message { 
    getId(): string;
    setId(value: string): OAuthClientMessage;

    getSecret(): string;
    setSecret(value: string): OAuthClientMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): OAuthClientMessage.AsObject;
    static toObject(includeInstance: boolean, msg: OAuthClientMessage): OAuthClientMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: OAuthClientMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): OAuthClientMessage;
    static deserializeBinaryFromReader(message: OAuthClientMessage, reader: jspb.BinaryReader): OAuthClientMessage;
}

export namespace OAuthClientMessage {
    export type AsObject = {
        id: string,
        secret: string,
    }
}

export class PeerAliasMessage extends jspb.Message { 
    getPeerId(): string;
    setPeerId(value: string): PeerAliasMessage;

    getAlias(): string;
    setAlias(value: string): PeerAliasMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PeerAliasMessage.AsObject;
    static toObject(includeInstance: boolean, msg: PeerAliasMessage): PeerAliasMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PeerAliasMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PeerAliasMessage;
    static deserializeBinaryFromReader(message: PeerAliasMessage, reader: jspb.BinaryReader): PeerAliasMessage;
}

export namespace PeerAliasMessage {
    export type AsObject = {
        peerId: string,
        alias: string,
    }
}

export class RenameVaultMessage extends jspb.Message { 
    getVaultName(): string;
    setVaultName(value: string): RenameVaultMessage;

    getNewName(): string;
    setNewName(value: string): RenameVaultMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): RenameVaultMessage.AsObject;
    static toObject(includeInstance: boolean, msg: RenameVaultMessage): RenameVaultMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: RenameVaultMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): RenameVaultMessage;
    static deserializeBinaryFromReader(message: RenameVaultMessage, reader: jspb.BinaryReader): RenameVaultMessage;
}

export namespace RenameVaultMessage {
    export type AsObject = {
        vaultName: string,
        newName: string,
    }
}

export class VaultStatsMessage extends jspb.Message { 
    getCreatedAt(): number;
    setCreatedAt(value: number): VaultStatsMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): VaultStatsMessage.AsObject;
    static toObject(includeInstance: boolean, msg: VaultStatsMessage): VaultStatsMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: VaultStatsMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): VaultStatsMessage;
    static deserializeBinaryFromReader(message: VaultStatsMessage, reader: jspb.BinaryReader): VaultStatsMessage;
}

export namespace VaultStatsMessage {
    export type AsObject = {
        createdAt: number,
    }
}

export class ShareVaultMessage extends jspb.Message { 
    getPeerId(): string;
    setPeerId(value: string): ShareVaultMessage;

    getVaultName(): string;
    setVaultName(value: string): ShareVaultMessage;

    getCanEdit(): boolean;
    setCanEdit(value: boolean): ShareVaultMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ShareVaultMessage.AsObject;
    static toObject(includeInstance: boolean, msg: ShareVaultMessage): ShareVaultMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ShareVaultMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ShareVaultMessage;
    static deserializeBinaryFromReader(message: ShareVaultMessage, reader: jspb.BinaryReader): ShareVaultMessage;
}

export namespace ShareVaultMessage {
    export type AsObject = {
        peerId: string,
        vaultName: string,
        canEdit: boolean,
    }
}

export enum AgentStatusType {
    ONLINE = 0,
    OFFLINE = 1,
    ERRORED = 2,
}
