// package: polykey.v1.sessions
// file: polykey/v1/sessions/sessions.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class Password extends jspb.Message { 
    getPassword(): string;
    setPassword(value: string): Password;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Password.AsObject;
    static toObject(includeInstance: boolean, msg: Password): Password.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Password, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Password;
    static deserializeBinaryFromReader(message: Password, reader: jspb.BinaryReader): Password;
}

export namespace Password {
    export type AsObject = {
        password: string,
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
