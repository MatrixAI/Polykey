// package: polykey.v1.agent
// file: polykey/v1/agent/agent.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class InfoMessage extends jspb.Message { 
    getPid(): number;
    setPid(value: number): InfoMessage;
    getNodeId(): string;
    setNodeId(value: string): InfoMessage;
    getClientHost(): string;
    setClientHost(value: string): InfoMessage;
    getClientPort(): number;
    setClientPort(value: number): InfoMessage;
    getProxyHost(): string;
    setProxyHost(value: string): InfoMessage;
    getProxyPort(): number;
    setProxyPort(value: number): InfoMessage;
    getAgentHost(): string;
    setAgentHost(value: string): InfoMessage;
    getAgentPort(): number;
    setAgentPort(value: number): InfoMessage;
    getForwardHost(): string;
    setForwardHost(value: string): InfoMessage;
    getForwardPort(): number;
    setForwardPort(value: number): InfoMessage;
    getRootPublicKeyPem(): string;
    setRootPublicKeyPem(value: string): InfoMessage;
    getRootCertPem(): string;
    setRootCertPem(value: string): InfoMessage;
    getRootCertChainPem(): string;
    setRootCertChainPem(value: string): InfoMessage;

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
        pid: number,
        nodeId: string,
        clientHost: string,
        clientPort: number,
        proxyHost: string,
        proxyPort: number,
        agentHost: string,
        agentPort: number,
        forwardHost: string,
        forwardPort: number,
        rootPublicKeyPem: string,
        rootCertPem: string,
        rootCertChainPem: string,
    }
}
