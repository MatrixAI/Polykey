// package: Gestalt
// file: Gestalts.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class Gestalt extends jspb.Message { 
    getName(): string;
    setName(value: string): Gestalt;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Gestalt.AsObject;
    static toObject(includeInstance: boolean, msg: Gestalt): Gestalt.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Gestalt, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Gestalt;
    static deserializeBinaryFromReader(message: Gestalt, reader: jspb.BinaryReader): Gestalt;
}

export namespace Gestalt {
    export type AsObject = {
        name: string,
    }
}

export class Graph extends jspb.Message { 
    getGestaltGraph(): string;
    setGestaltGraph(value: string): Graph;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Graph.AsObject;
    static toObject(includeInstance: boolean, msg: Graph): Graph.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Graph, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Graph;
    static deserializeBinaryFromReader(message: Graph, reader: jspb.BinaryReader): Graph;
}

export namespace Graph {
    export type AsObject = {
        gestaltGraph: string,
    }
}

export class Trust extends jspb.Message { 
    getProvider(): string;
    setProvider(value: string): Trust;
    getName(): string;
    setName(value: string): Trust;
    getSet(): boolean;
    setSet(value: boolean): Trust;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Trust.AsObject;
    static toObject(includeInstance: boolean, msg: Trust): Trust.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Trust, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Trust;
    static deserializeBinaryFromReader(message: Trust, reader: jspb.BinaryReader): Trust;
}

export namespace Trust {
    export type AsObject = {
        provider: string,
        name: string,
        set: boolean,
    }
}
