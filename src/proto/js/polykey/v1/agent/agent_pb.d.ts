// package: polykey.v1.agent
// file: polykey/v1/agent/agent.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as polykey_v1_nodes_nodes_pb from "../../../polykey/v1/nodes/nodes_pb";
import * as polykey_v1_keys_keys_pb from "../../../polykey/v1/keys/keys_pb";

export class InfoMessage extends jspb.Message { 

    hasNodeId(): boolean;
    clearNodeId(): void;
    getNodeId(): polykey_v1_nodes_nodes_pb.Node | undefined;
    setNodeId(value?: polykey_v1_nodes_nodes_pb.Node): InfoMessage;

    hasAddress(): boolean;
    clearAddress(): void;
    getAddress(): polykey_v1_nodes_nodes_pb.Address | undefined;
    setAddress(value?: polykey_v1_nodes_nodes_pb.Address): InfoMessage;

    hasCert(): boolean;
    clearCert(): void;
    getCert(): polykey_v1_keys_keys_pb.Certificate | undefined;
    setCert(value?: polykey_v1_keys_keys_pb.Certificate): InfoMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): InfoMessage.AsObject;
    static toObject(includeInstance: boolean, msg: InfoMessage): InfoMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: InfoMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): InfoMessage;
    static deserializeBinaryFromReader(message: InfoMessage, reader: jspb.BinaryReader): InfoMessage;
}

export namespace InfoMessage {
    export type AsObject = {
        nodeId?: polykey_v1_nodes_nodes_pb.Node.AsObject,
        address?: polykey_v1_nodes_nodes_pb.Address.AsObject,
        cert?: polykey_v1_keys_keys_pb.Certificate.AsObject,
    }
}
