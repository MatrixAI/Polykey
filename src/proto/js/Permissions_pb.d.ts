// package: Permission
// file: Permissions.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as Nodes_pb from "./Nodes_pb";
import * as Identities_pb from "./Identities_pb";

export class Actions extends jspb.Message { 
    clearActionList(): void;
    getActionList(): Array<string>;
    setActionList(value: Array<string>): Actions;
    addAction(value: string, index?: number): string;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Actions.AsObject;
    static toObject(includeInstance: boolean, msg: Actions): Actions.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Actions, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Actions;
    static deserializeBinaryFromReader(message: Actions, reader: jspb.BinaryReader): Actions;
}

export namespace Actions {
    export type AsObject = {
        actionList: Array<string>,
    }
}

export class ActionSet extends jspb.Message { 

    hasNode(): boolean;
    clearNode(): void;
    getNode(): Nodes_pb.Node | undefined;
    setNode(value?: Nodes_pb.Node): ActionSet;

    hasIdentity(): boolean;
    clearIdentity(): void;
    getIdentity(): Identities_pb.Provider | undefined;
    setIdentity(value?: Identities_pb.Provider): ActionSet;
    getAction(): string;
    setAction(value: string): ActionSet;

    getNodeOrProviderCase(): ActionSet.NodeOrProviderCase;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ActionSet.AsObject;
    static toObject(includeInstance: boolean, msg: ActionSet): ActionSet.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ActionSet, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ActionSet;
    static deserializeBinaryFromReader(message: ActionSet, reader: jspb.BinaryReader): ActionSet;
}

export namespace ActionSet {
    export type AsObject = {
        node?: Nodes_pb.Node.AsObject,
        identity?: Identities_pb.Provider.AsObject,
        action: string,
    }

    export enum NodeOrProviderCase {
        NODE_OR_PROVIDER_NOT_SET = 0,
        NODE = 1,
        IDENTITY = 2,
    }

}
