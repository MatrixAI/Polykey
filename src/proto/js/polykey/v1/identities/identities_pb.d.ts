// package: polykey.v1.identities
// file: polykey/v1/identities/identities.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class Provider extends jspb.Message { 
    getProviderId(): string;
    setProviderId(value: string): Provider;
    getIdentityId(): string;
    setIdentityId(value: string): Provider;

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
        identityId: string,
    }
}

export class OptionalProvider extends jspb.Message { 

    hasProviderId(): boolean;
    clearProviderId(): void;
    getProviderId(): string;
    setProviderId(value: string): OptionalProvider;

    getOptionalProviderIdCase(): OptionalProvider.OptionalProviderIdCase;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): OptionalProvider.AsObject;
    static toObject(includeInstance: boolean, msg: OptionalProvider): OptionalProvider.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: OptionalProvider, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): OptionalProvider;
    static deserializeBinaryFromReader(message: OptionalProvider, reader: jspb.BinaryReader): OptionalProvider;
}

export namespace OptionalProvider {
    export type AsObject = {
        providerId: string,
    }

    export enum OptionalProviderIdCase {
        OPTIONAL_PROVIDER_ID_NOT_SET = 0,
        PROVIDER_ID = 1,
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

export class Claim extends jspb.Message { 
    getClaimId(): string;
    setClaimId(value: string): Claim;
    getUrl(): string;
    setUrl(value: string): Claim;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Claim.AsObject;
    static toObject(includeInstance: boolean, msg: Claim): Claim.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Claim, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Claim;
    static deserializeBinaryFromReader(message: Claim, reader: jspb.BinaryReader): Claim;
}

export namespace Claim {
    export type AsObject = {
        claimId: string,
        url: string,
    }
}

export class AuthenticationProcess extends jspb.Message { 

    hasRequest(): boolean;
    clearRequest(): void;
    getRequest(): AuthenticationRequest | undefined;
    setRequest(value?: AuthenticationRequest): AuthenticationProcess;

    hasResponse(): boolean;
    clearResponse(): void;
    getResponse(): AuthenticationResponse | undefined;
    setResponse(value?: AuthenticationResponse): AuthenticationProcess;

    getStepCase(): AuthenticationProcess.StepCase;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AuthenticationProcess.AsObject;
    static toObject(includeInstance: boolean, msg: AuthenticationProcess): AuthenticationProcess.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AuthenticationProcess, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AuthenticationProcess;
    static deserializeBinaryFromReader(message: AuthenticationProcess, reader: jspb.BinaryReader): AuthenticationProcess;
}

export namespace AuthenticationProcess {
    export type AsObject = {
        request?: AuthenticationRequest.AsObject,
        response?: AuthenticationResponse.AsObject,
    }

    export enum StepCase {
        STEP_NOT_SET = 0,
        REQUEST = 1,
        RESPONSE = 2,
    }

}

export class AuthenticationRequest extends jspb.Message { 
    getUrl(): string;
    setUrl(value: string): AuthenticationRequest;

    getDataMap(): jspb.Map<string, string>;
    clearDataMap(): void;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AuthenticationRequest.AsObject;
    static toObject(includeInstance: boolean, msg: AuthenticationRequest): AuthenticationRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AuthenticationRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AuthenticationRequest;
    static deserializeBinaryFromReader(message: AuthenticationRequest, reader: jspb.BinaryReader): AuthenticationRequest;
}

export namespace AuthenticationRequest {
    export type AsObject = {
        url: string,

        dataMap: Array<[string, string]>,
    }
}

export class AuthenticationResponse extends jspb.Message { 
    getIdentityId(): string;
    setIdentityId(value: string): AuthenticationResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AuthenticationResponse.AsObject;
    static toObject(includeInstance: boolean, msg: AuthenticationResponse): AuthenticationResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AuthenticationResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AuthenticationResponse;
    static deserializeBinaryFromReader(message: AuthenticationResponse, reader: jspb.BinaryReader): AuthenticationResponse;
}

export namespace AuthenticationResponse {
    export type AsObject = {
        identityId: string,
    }
}

export class ProviderSearch extends jspb.Message { 

    hasAuthIdentityId(): boolean;
    clearAuthIdentityId(): void;
    getAuthIdentityId(): string;
    setAuthIdentityId(value: string): ProviderSearch;
    getIdentityId(): string;
    setIdentityId(value: string): ProviderSearch;
    getDisconnected(): boolean;
    setDisconnected(value: boolean): ProviderSearch;
    getLimit(): string;
    setLimit(value: string): ProviderSearch;
    clearSearchTermList(): void;
    getSearchTermList(): Array<string>;
    setSearchTermList(value: Array<string>): ProviderSearch;
    addSearchTerm(value: string, index?: number): string;
    clearProviderIdList(): void;
    getProviderIdList(): Array<string>;
    setProviderIdList(value: Array<string>): ProviderSearch;
    addProviderId(value: string, index?: number): string;

    getOptionalAuthIdentityIdCase(): ProviderSearch.OptionalAuthIdentityIdCase;

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
        authIdentityId: string,
        identityId: string,
        disconnected: boolean,
        limit: string,
        searchTermList: Array<string>,
        providerIdList: Array<string>,
    }

    export enum OptionalAuthIdentityIdCase {
        OPTIONAL_AUTH_IDENTITY_ID_NOT_SET = 0,
        AUTH_IDENTITY_ID = 1,
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
