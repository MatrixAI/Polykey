// package: polykey.v1.permissions
// file: polykey/v1/permissions/permissions.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as polykey_v1_nodes_nodes_pb from "../../../polykey/v1/nodes/nodes_pb";
import * as polykey_v1_identities_identities_pb from "../../../polykey/v1/identities/identities_pb";

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

export class NodeActions extends jspb.Message { 

    hasNode(): boolean;
    clearNode(): void;
    getNode(): polykey_v1_nodes_nodes_pb.Node | undefined;
    setNode(value?: polykey_v1_nodes_nodes_pb.Node): NodeActions;
    clearActionsList(): void;
    getActionsList(): Array<string>;
    setActionsList(value: Array<string>): NodeActions;
    addActions(value: string, index?: number): string;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): NodeActions.AsObject;
    static toObject(includeInstance: boolean, msg: NodeActions): NodeActions.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: NodeActions, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): NodeActions;
    static deserializeBinaryFromReader(message: NodeActions, reader: jspb.BinaryReader): NodeActions;
}

export namespace NodeActions {
    export type AsObject = {
        node?: polykey_v1_nodes_nodes_pb.Node.AsObject,
        actionsList: Array<string>,
    }
}

export class ActionSet extends jspb.Message { 

    hasNode(): boolean;
    clearNode(): void;
    getNode(): polykey_v1_nodes_nodes_pb.Node | undefined;
    setNode(value?: polykey_v1_nodes_nodes_pb.Node): ActionSet;

    hasIdentity(): boolean;
    clearIdentity(): void;
    getIdentity(): polykey_v1_identities_identities_pb.Provider | undefined;
    setIdentity(value?: polykey_v1_identities_identities_pb.Provider): ActionSet;
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
        node?: polykey_v1_nodes_nodes_pb.Node.AsObject,
        identity?: polykey_v1_identities_identities_pb.Provider.AsObject,
        action: string,
    }

    export enum NodeOrProviderCase {
        NODE_OR_PROVIDER_NOT_SET = 0,
        NODE = 1,
        IDENTITY = 2,
    }

}
