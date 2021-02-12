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
    getPeerId(): string;
    setPeerId(value: string): PeerInfoMessage;

    getAlias(): string;
    setAlias(value: string): PeerInfoMessage;

    getPublicKey(): string;
    setPublicKey(value: string): PeerInfoMessage;

    getRootPublicKey(): string;
    setRootPublicKey(value: string): PeerInfoMessage;

    getPeerAddress(): string;
    setPeerAddress(value: string): PeerInfoMessage;

    getApiAddress(): string;
    setApiAddress(value: string): PeerInfoMessage;

    clearLinkInfoList(): void;
    getLinkInfoList(): Array<LinkInfoIdentityMessage>;
    setLinkInfoList(value: Array<LinkInfoIdentityMessage>): PeerInfoMessage;
    addLinkInfo(value?: LinkInfoIdentityMessage, index?: number): LinkInfoIdentityMessage;

    getPem(): string;
    setPem(value: string): PeerInfoMessage;


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
        peerId: string,
        alias: string,
        publicKey: string,
        rootPublicKey: string,
        peerAddress: string,
        apiAddress: string,
        linkInfoList: Array<LinkInfoIdentityMessage.AsObject>,
        pem: string,
    }
}

export class PeerInfoReadOnlyMessage extends jspb.Message { 
    getPeerId(): string;
    setPeerId(value: string): PeerInfoReadOnlyMessage;

    getPem(): string;
    setPem(value: string): PeerInfoReadOnlyMessage;

    getUnsignedAlias(): string;
    setUnsignedAlias(value: string): PeerInfoReadOnlyMessage;

    getUnsignedPeerAddress(): string;
    setUnsignedPeerAddress(value: string): PeerInfoReadOnlyMessage;

    getUnsignedApiAddress(): string;
    setUnsignedApiAddress(value: string): PeerInfoReadOnlyMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PeerInfoReadOnlyMessage.AsObject;
    static toObject(includeInstance: boolean, msg: PeerInfoReadOnlyMessage): PeerInfoReadOnlyMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PeerInfoReadOnlyMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PeerInfoReadOnlyMessage;
    static deserializeBinaryFromReader(message: PeerInfoReadOnlyMessage, reader: jspb.BinaryReader): PeerInfoReadOnlyMessage;
}

export namespace PeerInfoReadOnlyMessage {
    export type AsObject = {
        peerId: string,
        pem: string,
        unsignedAlias: string,
        unsignedPeerAddress: string,
        unsignedApiAddress: string,
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
    getPassphrase(): string;
    setPassphrase(value: string): NewKeyPairMessage;

    getNbits(): number;
    setNbits(value: number): NewKeyPairMessage;


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
        passphrase: string,
        nbits: number,
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

export class PolykeyProofMessage extends jspb.Message { 
    getType(): PolykeyProofType;
    setType(value: PolykeyProofType): PolykeyProofMessage;

    getInstructions(): string;
    setInstructions(value: string): PolykeyProofMessage;

    getProof(): string;
    setProof(value: string): PolykeyProofMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PolykeyProofMessage.AsObject;
    static toObject(includeInstance: boolean, msg: PolykeyProofMessage): PolykeyProofMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PolykeyProofMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PolykeyProofMessage;
    static deserializeBinaryFromReader(message: PolykeyProofMessage, reader: jspb.BinaryReader): PolykeyProofMessage;
}

export namespace PolykeyProofMessage {
    export type AsObject = {
        type: PolykeyProofType,
        instructions: string,
        proof: string,
    }
}

export class GestaltIdentityMessage extends jspb.Message { 
    getIdentityProviderName(): string;
    setIdentityProviderName(value: string): GestaltIdentityMessage;

    getIdentifier(): string;
    setIdentifier(value: string): GestaltIdentityMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GestaltIdentityMessage.AsObject;
    static toObject(includeInstance: boolean, msg: GestaltIdentityMessage): GestaltIdentityMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GestaltIdentityMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GestaltIdentityMessage;
    static deserializeBinaryFromReader(message: GestaltIdentityMessage, reader: jspb.BinaryReader): GestaltIdentityMessage;
}

export namespace GestaltIdentityMessage {
    export type AsObject = {
        identityProviderName: string,
        identifier: string,
    }
}

export class RecoverKeynodeMessage extends jspb.Message { 
    getMnemonic(): string;
    setMnemonic(value: string): RecoverKeynodeMessage;

    getUserId(): string;
    setUserId(value: string): RecoverKeynodeMessage;

    getPassphrase(): string;
    setPassphrase(value: string): RecoverKeynodeMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): RecoverKeynodeMessage.AsObject;
    static toObject(includeInstance: boolean, msg: RecoverKeynodeMessage): RecoverKeynodeMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: RecoverKeynodeMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): RecoverKeynodeMessage;
    static deserializeBinaryFromReader(message: RecoverKeynodeMessage, reader: jspb.BinaryReader): RecoverKeynodeMessage;
}

export namespace RecoverKeynodeMessage {
    export type AsObject = {
        mnemonic: string,
        userId: string,
        passphrase: string,
    }
}

export class AuthenticateProviderRequest extends jspb.Message { 
    getProviderKey(): string;
    setProviderKey(value: string): AuthenticateProviderRequest;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AuthenticateProviderRequest.AsObject;
    static toObject(includeInstance: boolean, msg: AuthenticateProviderRequest): AuthenticateProviderRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AuthenticateProviderRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AuthenticateProviderRequest;
    static deserializeBinaryFromReader(message: AuthenticateProviderRequest, reader: jspb.BinaryReader): AuthenticateProviderRequest;
}

export namespace AuthenticateProviderRequest {
    export type AsObject = {
        providerKey: string,
    }
}

export class AuthenticateProviderReply extends jspb.Message { 
    getUserCode(): string;
    setUserCode(value: string): AuthenticateProviderReply;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AuthenticateProviderReply.AsObject;
    static toObject(includeInstance: boolean, msg: AuthenticateProviderReply): AuthenticateProviderReply.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AuthenticateProviderReply, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AuthenticateProviderReply;
    static deserializeBinaryFromReader(message: AuthenticateProviderReply, reader: jspb.BinaryReader): AuthenticateProviderReply;
}

export namespace AuthenticateProviderReply {
    export type AsObject = {
        userCode: string,
    }
}

export class AugmentKeynodeRequest extends jspb.Message { 
    getProviderKey(): string;
    setProviderKey(value: string): AugmentKeynodeRequest;

    getIdentityKey(): string;
    setIdentityKey(value: string): AugmentKeynodeRequest;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AugmentKeynodeRequest.AsObject;
    static toObject(includeInstance: boolean, msg: AugmentKeynodeRequest): AugmentKeynodeRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AugmentKeynodeRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AugmentKeynodeRequest;
    static deserializeBinaryFromReader(message: AugmentKeynodeRequest, reader: jspb.BinaryReader): AugmentKeynodeRequest;
}

export namespace AugmentKeynodeRequest {
    export type AsObject = {
        providerKey: string,
        identityKey: string,
    }
}

export class AugmentKeynodeReply extends jspb.Message { 
    getUrl(): string;
    setUrl(value: string): AugmentKeynodeReply;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AugmentKeynodeReply.AsObject;
    static toObject(includeInstance: boolean, msg: AugmentKeynodeReply): AugmentKeynodeReply.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AugmentKeynodeReply, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AugmentKeynodeReply;
    static deserializeBinaryFromReader(message: AugmentKeynodeReply, reader: jspb.BinaryReader): AugmentKeynodeReply;
}

export namespace AugmentKeynodeReply {
    export type AsObject = {
        url: string,
    }
}

export class LinkInfoIdentityMessage extends jspb.Message { 
    getType(): string;
    setType(value: string): LinkInfoIdentityMessage;

    getNode(): string;
    setNode(value: string): LinkInfoIdentityMessage;

    getIdentity(): string;
    setIdentity(value: string): LinkInfoIdentityMessage;

    getProvider(): string;
    setProvider(value: string): LinkInfoIdentityMessage;

    getDateissued(): string;
    setDateissued(value: string): LinkInfoIdentityMessage;

    getSignature(): string;
    setSignature(value: string): LinkInfoIdentityMessage;

    getKey(): string;
    setKey(value: string): LinkInfoIdentityMessage;

    getUrl(): string;
    setUrl(value: string): LinkInfoIdentityMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): LinkInfoIdentityMessage.AsObject;
    static toObject(includeInstance: boolean, msg: LinkInfoIdentityMessage): LinkInfoIdentityMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: LinkInfoIdentityMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): LinkInfoIdentityMessage;
    static deserializeBinaryFromReader(message: LinkInfoIdentityMessage, reader: jspb.BinaryReader): LinkInfoIdentityMessage;
}

export namespace LinkInfoIdentityMessage {
    export type AsObject = {
        type: string,
        node: string,
        identity: string,
        provider: string,
        dateissued: string,
        signature: string,
        key: string,
        url: string,
    }
}

export class LinkInfoNodeMessage extends jspb.Message { 
    getType(): string;
    setType(value: string): LinkInfoNodeMessage;

    getNode1(): string;
    setNode1(value: string): LinkInfoNodeMessage;

    getNode2(): string;
    setNode2(value: string): LinkInfoNodeMessage;

    getDateissued(): string;
    setDateissued(value: string): LinkInfoNodeMessage;

    getSignature(): string;
    setSignature(value: string): LinkInfoNodeMessage;

    getKey(): string;
    setKey(value: string): LinkInfoNodeMessage;

    getUrl(): string;
    setUrl(value: string): LinkInfoNodeMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): LinkInfoNodeMessage.AsObject;
    static toObject(includeInstance: boolean, msg: LinkInfoNodeMessage): LinkInfoNodeMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: LinkInfoNodeMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): LinkInfoNodeMessage;
    static deserializeBinaryFromReader(message: LinkInfoNodeMessage, reader: jspb.BinaryReader): LinkInfoNodeMessage;
}

export namespace LinkInfoNodeMessage {
    export type AsObject = {
        type: string,
        node1: string,
        node2: string,
        dateissued: string,
        signature: string,
        key: string,
        url: string,
    }
}

export class LinkInfoMessage extends jspb.Message { 

    hasLinkInfoIdentity(): boolean;
    clearLinkInfoIdentity(): void;
    getLinkInfoIdentity(): LinkInfoIdentityMessage | undefined;
    setLinkInfoIdentity(value?: LinkInfoIdentityMessage): LinkInfoMessage;


    hasLinkInfoNode(): boolean;
    clearLinkInfoNode(): void;
    getLinkInfoNode(): LinkInfoNodeMessage | undefined;
    setLinkInfoNode(value?: LinkInfoNodeMessage): LinkInfoMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): LinkInfoMessage.AsObject;
    static toObject(includeInstance: boolean, msg: LinkInfoMessage): LinkInfoMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: LinkInfoMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): LinkInfoMessage;
    static deserializeBinaryFromReader(message: LinkInfoMessage, reader: jspb.BinaryReader): LinkInfoMessage;
}

export namespace LinkInfoMessage {
    export type AsObject = {
        linkInfoIdentity?: LinkInfoIdentityMessage.AsObject,
        linkInfoNode?: LinkInfoNodeMessage.AsObject,
    }
}

export class GestaltMatrixEdgeMessage extends jspb.Message { 

    getPairsMap(): jspb.Map<string, LinkInfoMessage>;
    clearPairsMap(): void;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GestaltMatrixEdgeMessage.AsObject;
    static toObject(includeInstance: boolean, msg: GestaltMatrixEdgeMessage): GestaltMatrixEdgeMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GestaltMatrixEdgeMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GestaltMatrixEdgeMessage;
    static deserializeBinaryFromReader(message: GestaltMatrixEdgeMessage, reader: jspb.BinaryReader): GestaltMatrixEdgeMessage;
}

export namespace GestaltMatrixEdgeMessage {
    export type AsObject = {

        pairsMap: Array<[string, LinkInfoMessage.AsObject]>,
    }
}

export class GestaltNodeMessage extends jspb.Message { 
    getId(): string;
    setId(value: string): GestaltNodeMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GestaltNodeMessage.AsObject;
    static toObject(includeInstance: boolean, msg: GestaltNodeMessage): GestaltNodeMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GestaltNodeMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GestaltNodeMessage;
    static deserializeBinaryFromReader(message: GestaltNodeMessage, reader: jspb.BinaryReader): GestaltNodeMessage;
}

export namespace GestaltNodeMessage {
    export type AsObject = {
        id: string,
    }
}

export class GestaltMessage extends jspb.Message { 

    getGestaltMatrixMap(): jspb.Map<string, GestaltMatrixEdgeMessage>;
    clearGestaltMatrixMap(): void;


    getGestaltNodesMap(): jspb.Map<string, GestaltNodeMessage>;
    clearGestaltNodesMap(): void;


    getIdentitiesMap(): jspb.Map<string, IdentityInfoMessage>;
    clearIdentitiesMap(): void;


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

        gestaltMatrixMap: Array<[string, GestaltMatrixEdgeMessage.AsObject]>,

        gestaltNodesMap: Array<[string, GestaltNodeMessage.AsObject]>,

        identitiesMap: Array<[string, IdentityInfoMessage.AsObject]>,
    }
}

export class GestaltListMessage extends jspb.Message { 
    clearGestaltMessageList(): void;
    getGestaltMessageList(): Array<GestaltMessage>;
    setGestaltMessageList(value: Array<GestaltMessage>): GestaltListMessage;
    addGestaltMessage(value?: GestaltMessage, index?: number): GestaltMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GestaltListMessage.AsObject;
    static toObject(includeInstance: boolean, msg: GestaltListMessage): GestaltListMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GestaltListMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GestaltListMessage;
    static deserializeBinaryFromReader(message: GestaltListMessage, reader: jspb.BinaryReader): GestaltListMessage;
}

export namespace GestaltListMessage {
    export type AsObject = {
        gestaltMessageList: Array<GestaltMessage.AsObject>,
    }
}

export class ProviderSearchMessage extends jspb.Message { 
    getProviderKey(): string;
    setProviderKey(value: string): ProviderSearchMessage;

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
        providerKey: string,
        searchTermList: Array<string>,
    }
}

export class IdentityInfoMessage extends jspb.Message { 
    getKey(): string;
    setKey(value: string): IdentityInfoMessage;

    getProvider(): string;
    setProvider(value: string): IdentityInfoMessage;

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
        key: string,
        provider: string,
        name: string,
        email: string,
        url: string,
    }
}

export class IdentityMessage extends jspb.Message { 
    getKey(): string;
    setKey(value: string): IdentityMessage;

    getProviderKey(): string;
    setProviderKey(value: string): IdentityMessage;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): IdentityMessage.AsObject;
    static toObject(includeInstance: boolean, msg: IdentityMessage): IdentityMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: IdentityMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): IdentityMessage;
    static deserializeBinaryFromReader(message: IdentityMessage, reader: jspb.BinaryReader): IdentityMessage;
}

export namespace IdentityMessage {
    export type AsObject = {
        key: string,
        providerKey: string,
    }
}

export enum AgentStatusType {
    ONLINE = 0,
    OFFLINE = 1,
    ERRORED = 2,
}

export enum PolykeyProofType {
    AUTOMATIC = 0,
    MANUAL = 1,
}
