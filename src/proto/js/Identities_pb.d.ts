// package: Identitiy
// file: Identities.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class Provider extends jspb.Message { 
    getProviderId(): string;
    setProviderId(value: string): Provider;
    getMessage(): string;
    setMessage(value: string): Provider;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Provider.AsObject;
    static toObject(includeInstance: boolean, msg: Provider): Provider.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Provider, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Provider;
    static deserializeBinaryFromReader(message: Provider, reader: jspb.BinaryReader): Provider;
}

export namespace Provider {
    export type AsObject = {
        providerId: string,
        message: string,
    }
}

export class TokenSpecific extends jspb.Message { 

    hasProvider(): boolean;
    clearProvider(): void;
    getProvider(): Provider | undefined;
    setProvider(value?: Provider): TokenSpecific;
    getToken(): string;
    setToken(value: string): TokenSpecific;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): TokenSpecific.AsObject;
    static toObject(includeInstance: boolean, msg: TokenSpecific): TokenSpecific.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: TokenSpecific, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): TokenSpecific;
    static deserializeBinaryFromReader(message: TokenSpecific, reader: jspb.BinaryReader): TokenSpecific;
}

export namespace TokenSpecific {
    export type AsObject = {
        provider?: Provider.AsObject,
        token: string,
    }
}

export class Token extends jspb.Message { 
    getToken(): string;
    setToken(value: string): Token;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Token.AsObject;
    static toObject(includeInstance: boolean, msg: Token): Token.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Token, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Token;
    static deserializeBinaryFromReader(message: Token, reader: jspb.BinaryReader): Token;
}

export namespace Token {
    export type AsObject = {
        token: string,
    }
}

export class ProviderSearch extends jspb.Message { 

    hasProvider(): boolean;
    clearProvider(): void;
    getProvider(): Provider | undefined;
    setProvider(value?: Provider): ProviderSearch;
    clearSearchTermList(): void;
    getSearchTermList(): Array<string>;
    setSearchTermList(value: Array<string>): ProviderSearch;
    addSearchTerm(value: string, index?: number): string;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ProviderSearch.AsObject;
    static toObject(includeInstance: boolean, msg: ProviderSearch): ProviderSearch.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ProviderSearch, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ProviderSearch;
    static deserializeBinaryFromReader(message: ProviderSearch, reader: jspb.BinaryReader): ProviderSearch;
}

export namespace ProviderSearch {
    export type AsObject = {
        provider?: Provider.AsObject,
        searchTermList: Array<string>,
    }
}

export class Info extends jspb.Message { 

    hasProvider(): boolean;
    clearProvider(): void;
    getProvider(): Provider | undefined;
    setProvider(value?: Provider): Info;
    getName(): string;
    setName(value: string): Info;
    getEmail(): string;
    setEmail(value: string): Info;
    getUrl(): string;
    setUrl(value: string): Info;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Info.AsObject;
    static toObject(includeInstance: boolean, msg: Info): Info.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Info, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Info;
    static deserializeBinaryFromReader(message: Info, reader: jspb.BinaryReader): Info;
}

export namespace Info {
    export type AsObject = {
        provider?: Provider.AsObject,
        name: string,
        email: string,
        url: string,
    }
}
