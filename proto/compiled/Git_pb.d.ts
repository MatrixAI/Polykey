// package: git
// file: Git.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class InfoRequest extends jspb.Message { 
    getVaultname(): string;
    setVaultname(value: string): InfoRequest;


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
        vaultname: string,
    }
}

export class InfoReply extends jspb.Message { 
    getVaultname(): string;
    setVaultname(value: string): InfoReply;

    getBody(): Uint8Array | string;
    getBody_asU8(): Uint8Array;
    getBody_asB64(): string;
    setBody(value: Uint8Array | string): InfoReply;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): InfoReply.AsObject;
    static toObject(includeInstance: boolean, msg: InfoReply): InfoReply.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: InfoReply, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): InfoReply;
    static deserializeBinaryFromReader(message: InfoReply, reader: jspb.BinaryReader): InfoReply;
}

export namespace InfoReply {
    export type AsObject = {
        vaultname: string,
        body: Uint8Array | string,
    }
}

export class PackRequest extends jspb.Message { 
    getVaultname(): string;
    setVaultname(value: string): PackRequest;

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
        vaultname: string,
        body: Uint8Array | string,
    }
}

export class PackReply extends jspb.Message { 
    getVaultname(): string;
    setVaultname(value: string): PackReply;

    getBody(): Uint8Array | string;
    getBody_asU8(): Uint8Array;
    getBody_asB64(): string;
    setBody(value: Uint8Array | string): PackReply;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PackReply.AsObject;
    static toObject(includeInstance: boolean, msg: PackReply): PackReply.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PackReply, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PackReply;
    static deserializeBinaryFromReader(message: PackReply, reader: jspb.BinaryReader): PackReply;
}

export namespace PackReply {
    export type AsObject = {
        vaultname: string,
        body: Uint8Array | string,
    }
}
