// package: polykey.v1.keys
// file: polykey/v1/keys/keys.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class Crypto extends jspb.Message { 
    getData(): string;
    setData(value: string): Crypto;
    getSignature(): string;
    setSignature(value: string): Crypto;
    getPublicKeyJwk(): string;
    setPublicKeyJwk(value: string): Crypto;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Crypto.AsObject;
    static toObject(includeInstance: boolean, msg: Crypto): Crypto.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Crypto, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Crypto;
    static deserializeBinaryFromReader(message: Crypto, reader: jspb.BinaryReader): Crypto;
}

export namespace Crypto {
    export type AsObject = {
        data: string,
        signature: string,
        publicKeyJwk: string,
    }
}

export class Key extends jspb.Message { 
    getName(): string;
    setName(value: string): Key;
    getKey(): string;
    setKey(value: string): Key;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Key.AsObject;
    static toObject(includeInstance: boolean, msg: Key): Key.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Key, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Key;
    static deserializeBinaryFromReader(message: Key, reader: jspb.BinaryReader): Key;
}

export namespace Key {
    export type AsObject = {
        name: string,
        key: string,
    }
}

export class KeyPairJWK extends jspb.Message { 
    getPrivateKeyJwe(): string;
    setPrivateKeyJwe(value: string): KeyPairJWK;
    getPublicKeyJwk(): string;
    setPublicKeyJwk(value: string): KeyPairJWK;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): KeyPairJWK.AsObject;
    static toObject(includeInstance: boolean, msg: KeyPairJWK): KeyPairJWK.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: KeyPairJWK, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): KeyPairJWK;
    static deserializeBinaryFromReader(message: KeyPairJWK, reader: jspb.BinaryReader): KeyPairJWK;
}

export namespace KeyPairJWK {
    export type AsObject = {
        privateKeyJwe: string,
        publicKeyJwk: string,
    }
}

export class Certificate extends jspb.Message { 
    getCert(): string;
    setCert(value: string): Certificate;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Certificate.AsObject;
    static toObject(includeInstance: boolean, msg: Certificate): Certificate.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Certificate, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Certificate;
    static deserializeBinaryFromReader(message: Certificate, reader: jspb.BinaryReader): Certificate;
}

export namespace Certificate {
    export type AsObject = {
        cert: string,
    }
}
