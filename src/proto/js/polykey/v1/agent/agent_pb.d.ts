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
    getIngressHost(): string;
    setIngressHost(value: string): InfoMessage;
    getIngressPort(): number;
    setIngressPort(value: number): InfoMessage;
    getEgressHost(): string;
    setEgressHost(value: string): InfoMessage;
    getEgressPort(): number;
    setEgressPort(value: number): InfoMessage;
    getAgentHost(): string;
    setAgentHost(value: string): InfoMessage;
    getAgentPort(): number;
    setAgentPort(value: number): InfoMessage;
    getProxyHost(): string;
    setProxyHost(value: string): InfoMessage;
    getProxyPort(): number;
    setProxyPort(value: number): InfoMessage;
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
        ingressHost: string,
        ingressPort: number,
        egressHost: string,
        egressPort: number,
        agentHost: string,
        agentPort: number,
        proxyHost: string,
        proxyPort: number,
        rootPublicKeyPem: string,
        rootCertPem: string,
        rootCertChainPem: string,
    }
}

export class RestartMessage extends jspb.Message { 
    getPassword(): string;
    setPassword(value: string): RestartMessage;
    getClientHost(): string;
    setClientHost(value: string): RestartMessage;
    getClientPort(): number;
    setClientPort(value: number): RestartMessage;
    getIngressHost(): string;
    setIngressHost(value: string): RestartMessage;
    getIngressPort(): number;
    setIngressPort(value: number): RestartMessage;
    getFresh(): boolean;
    setFresh(value: boolean): RestartMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): RestartMessage.AsObject;
    static toObject(includeInstance: boolean, msg: RestartMessage): RestartMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: RestartMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): RestartMessage;
    static deserializeBinaryFromReader(message: RestartMessage, reader: jspb.BinaryReader): RestartMessage;
}

export namespace RestartMessage {
    export type AsObject = {
        password: string,
        clientHost: string,
        clientPort: number,
        ingressHost: string,
        ingressPort: number,
        fresh: boolean,
    }
}
