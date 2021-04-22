// package: agentInterface
// file: Agent.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import {handleClientStreamingCall} from "@grpc/grpc-js/build/src/server-call";
import * as Agent_pb from "./Agent_pb";

interface IAgentService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    echo: IAgentService_IEcho;
    getGitInfo: IAgentService_IGetGitInfo;
    getGitPackStream: IAgentService_IGetGitPackStream;
    scanVaults: IAgentService_IScanVaults;
    getRootCertificate: IAgentService_IGetRootCertificate;
    requestCertificateSigning: IAgentService_IRequestCertificateSigning;
    getClosestLocalNodes: IAgentService_IGetClosestLocalNodes;
    synchronizeDHT: IAgentService_ISynchronizeDHT;
    relayHolePunchMessage: IAgentService_IRelayHolePunchMessage;
}

interface IAgentService_IEcho extends grpc.MethodDefinition<Agent_pb.EchoMessage, Agent_pb.EchoMessage> {
    path: "/agentInterface.Agent/Echo";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.EchoMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.EchoMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EchoMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EchoMessage>;
}
interface IAgentService_IGetGitInfo extends grpc.MethodDefinition<Agent_pb.InfoRequest, Agent_pb.PackChunk> {
    path: "/agentInterface.Agent/GetGitInfo";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<Agent_pb.InfoRequest>;
    requestDeserialize: grpc.deserialize<Agent_pb.InfoRequest>;
    responseSerialize: grpc.serialize<Agent_pb.PackChunk>;
    responseDeserialize: grpc.deserialize<Agent_pb.PackChunk>;
}
interface IAgentService_IGetGitPackStream extends grpc.MethodDefinition<Agent_pb.PackRequest, Agent_pb.PackChunk> {
    path: "/agentInterface.Agent/GetGitPackStream";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<Agent_pb.PackRequest>;
    requestDeserialize: grpc.deserialize<Agent_pb.PackRequest>;
    responseSerialize: grpc.serialize<Agent_pb.PackChunk>;
    responseDeserialize: grpc.deserialize<Agent_pb.PackChunk>;
}
interface IAgentService_IScanVaults extends grpc.MethodDefinition<Agent_pb.EmptyMessage, Agent_pb.PackChunk> {
    path: "/agentInterface.Agent/ScanVaults";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Agent_pb.PackChunk>;
    responseDeserialize: grpc.deserialize<Agent_pb.PackChunk>;
}
interface IAgentService_IGetRootCertificate extends grpc.MethodDefinition<Agent_pb.EmptyMessage, Agent_pb.CertificateMessage> {
    path: "/agentInterface.Agent/GetRootCertificate";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Agent_pb.CertificateMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.CertificateMessage>;
}
interface IAgentService_IRequestCertificateSigning extends grpc.MethodDefinition<Agent_pb.CertificateMessage, Agent_pb.CertificateMessage> {
    path: "/agentInterface.Agent/RequestCertificateSigning";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.CertificateMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.CertificateMessage>;
    responseSerialize: grpc.serialize<Agent_pb.CertificateMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.CertificateMessage>;
}
interface IAgentService_IGetClosestLocalNodes extends grpc.MethodDefinition<Agent_pb.NodeIdMessage, Agent_pb.NodeTableMessage> {
    path: "/agentInterface.Agent/GetClosestLocalNodes";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.NodeIdMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.NodeIdMessage>;
    responseSerialize: grpc.serialize<Agent_pb.NodeTableMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.NodeTableMessage>;
}
interface IAgentService_ISynchronizeDHT extends grpc.MethodDefinition<Agent_pb.EmptyMessage, Agent_pb.NodeTableMessage> {
    path: "/agentInterface.Agent/SynchronizeDHT";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Agent_pb.NodeTableMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.NodeTableMessage>;
}
interface IAgentService_IRelayHolePunchMessage extends grpc.MethodDefinition<Agent_pb.ConnectionMessage, Agent_pb.EmptyMessage> {
    path: "/agentInterface.Agent/RelayHolePunchMessage";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.ConnectionMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.ConnectionMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}

export const AgentService: IAgentService;

export interface IAgentServer extends grpc.UntypedServiceImplementation {
    echo: grpc.handleUnaryCall<Agent_pb.EchoMessage, Agent_pb.EchoMessage>;
    getGitInfo: grpc.handleServerStreamingCall<Agent_pb.InfoRequest, Agent_pb.PackChunk>;
    getGitPackStream: grpc.handleServerStreamingCall<Agent_pb.PackRequest, Agent_pb.PackChunk>;
    scanVaults: grpc.handleServerStreamingCall<Agent_pb.EmptyMessage, Agent_pb.PackChunk>;
    getRootCertificate: grpc.handleUnaryCall<Agent_pb.EmptyMessage, Agent_pb.CertificateMessage>;
    requestCertificateSigning: grpc.handleUnaryCall<Agent_pb.CertificateMessage, Agent_pb.CertificateMessage>;
    getClosestLocalNodes: grpc.handleUnaryCall<Agent_pb.NodeIdMessage, Agent_pb.NodeTableMessage>;
    synchronizeDHT: grpc.handleUnaryCall<Agent_pb.EmptyMessage, Agent_pb.NodeTableMessage>;
    relayHolePunchMessage: grpc.handleUnaryCall<Agent_pb.ConnectionMessage, Agent_pb.EmptyMessage>;
}

export interface IAgentClient {
    echo(request: Agent_pb.EchoMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    echo(request: Agent_pb.EchoMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    echo(request: Agent_pb.EchoMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    getGitInfo(request: Agent_pb.InfoRequest, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Agent_pb.PackChunk>;
    getGitInfo(request: Agent_pb.InfoRequest, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Agent_pb.PackChunk>;
    getGitPackStream(request: Agent_pb.PackRequest, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Agent_pb.PackChunk>;
    getGitPackStream(request: Agent_pb.PackRequest, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Agent_pb.PackChunk>;
    scanVaults(request: Agent_pb.EmptyMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Agent_pb.PackChunk>;
    scanVaults(request: Agent_pb.EmptyMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Agent_pb.PackChunk>;
    getRootCertificate(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.CertificateMessage) => void): grpc.ClientUnaryCall;
    getRootCertificate(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.CertificateMessage) => void): grpc.ClientUnaryCall;
    getRootCertificate(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.CertificateMessage) => void): grpc.ClientUnaryCall;
    requestCertificateSigning(request: Agent_pb.CertificateMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.CertificateMessage) => void): grpc.ClientUnaryCall;
    requestCertificateSigning(request: Agent_pb.CertificateMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.CertificateMessage) => void): grpc.ClientUnaryCall;
    requestCertificateSigning(request: Agent_pb.CertificateMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.CertificateMessage) => void): grpc.ClientUnaryCall;
    getClosestLocalNodes(request: Agent_pb.NodeIdMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.NodeTableMessage) => void): grpc.ClientUnaryCall;
    getClosestLocalNodes(request: Agent_pb.NodeIdMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.NodeTableMessage) => void): grpc.ClientUnaryCall;
    getClosestLocalNodes(request: Agent_pb.NodeIdMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.NodeTableMessage) => void): grpc.ClientUnaryCall;
    synchronizeDHT(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.NodeTableMessage) => void): grpc.ClientUnaryCall;
    synchronizeDHT(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.NodeTableMessage) => void): grpc.ClientUnaryCall;
    synchronizeDHT(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.NodeTableMessage) => void): grpc.ClientUnaryCall;
    relayHolePunchMessage(request: Agent_pb.ConnectionMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    relayHolePunchMessage(request: Agent_pb.ConnectionMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    relayHolePunchMessage(request: Agent_pb.ConnectionMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
}

export class AgentClient extends grpc.Client implements IAgentClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: Partial<grpc.ClientOptions>);
    public echo(request: Agent_pb.EchoMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    public echo(request: Agent_pb.EchoMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    public echo(request: Agent_pb.EchoMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    public getGitInfo(request: Agent_pb.InfoRequest, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Agent_pb.PackChunk>;
    public getGitInfo(request: Agent_pb.InfoRequest, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Agent_pb.PackChunk>;
    public getGitPackStream(request: Agent_pb.PackRequest, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Agent_pb.PackChunk>;
    public getGitPackStream(request: Agent_pb.PackRequest, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Agent_pb.PackChunk>;
    public scanVaults(request: Agent_pb.EmptyMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Agent_pb.PackChunk>;
    public scanVaults(request: Agent_pb.EmptyMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Agent_pb.PackChunk>;
    public getRootCertificate(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.CertificateMessage) => void): grpc.ClientUnaryCall;
    public getRootCertificate(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.CertificateMessage) => void): grpc.ClientUnaryCall;
    public getRootCertificate(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.CertificateMessage) => void): grpc.ClientUnaryCall;
    public requestCertificateSigning(request: Agent_pb.CertificateMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.CertificateMessage) => void): grpc.ClientUnaryCall;
    public requestCertificateSigning(request: Agent_pb.CertificateMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.CertificateMessage) => void): grpc.ClientUnaryCall;
    public requestCertificateSigning(request: Agent_pb.CertificateMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.CertificateMessage) => void): grpc.ClientUnaryCall;
    public getClosestLocalNodes(request: Agent_pb.NodeIdMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.NodeTableMessage) => void): grpc.ClientUnaryCall;
    public getClosestLocalNodes(request: Agent_pb.NodeIdMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.NodeTableMessage) => void): grpc.ClientUnaryCall;
    public getClosestLocalNodes(request: Agent_pb.NodeIdMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.NodeTableMessage) => void): grpc.ClientUnaryCall;
    public synchronizeDHT(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.NodeTableMessage) => void): grpc.ClientUnaryCall;
    public synchronizeDHT(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.NodeTableMessage) => void): grpc.ClientUnaryCall;
    public synchronizeDHT(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.NodeTableMessage) => void): grpc.ClientUnaryCall;
    public relayHolePunchMessage(request: Agent_pb.ConnectionMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public relayHolePunchMessage(request: Agent_pb.ConnectionMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public relayHolePunchMessage(request: Agent_pb.ConnectionMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
}
