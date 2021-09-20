// package: agentInterface
// file: Agent.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as Agent_pb from "./Agent_pb";

interface IAgentService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    echo: IAgentService_IEcho;
    vaultsGitInfoGet: IAgentService_IVaultsGitInfoGet;
    vaultsGitPackGet: IAgentService_IVaultsGitPackGet;
    vaultsScan: IAgentService_IVaultsScan;
    vaultsPermisssionsCheck: IAgentService_IVaultsPermisssionsCheck;
    nodesClosestLocalNodesGet: IAgentService_INodesClosestLocalNodesGet;
    nodesClaimsGet: IAgentService_INodesClaimsGet;
    nodesChainDataGet: IAgentService_INodesChainDataGet;
    nodesHolePunchMessageSend: IAgentService_INodesHolePunchMessageSend;
    nodesCrossSignClaim: IAgentService_INodesCrossSignClaim;
    notificationsSend: IAgentService_INotificationsSend;
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
interface IAgentService_IVaultsGitInfoGet extends grpc.MethodDefinition<Agent_pb.InfoRequest, Agent_pb.PackChunk> {
    path: "/agentInterface.Agent/VaultsGitInfoGet";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<Agent_pb.InfoRequest>;
    requestDeserialize: grpc.deserialize<Agent_pb.InfoRequest>;
    responseSerialize: grpc.serialize<Agent_pb.PackChunk>;
    responseDeserialize: grpc.deserialize<Agent_pb.PackChunk>;
}
interface IAgentService_IVaultsGitPackGet extends grpc.MethodDefinition<Agent_pb.PackChunk, Agent_pb.PackChunk> {
    path: "/agentInterface.Agent/VaultsGitPackGet";
    requestStream: true;
    responseStream: true;
    requestSerialize: grpc.serialize<Agent_pb.PackChunk>;
    requestDeserialize: grpc.deserialize<Agent_pb.PackChunk>;
    responseSerialize: grpc.serialize<Agent_pb.PackChunk>;
    responseDeserialize: grpc.deserialize<Agent_pb.PackChunk>;
}
interface IAgentService_IVaultsScan extends grpc.MethodDefinition<Agent_pb.NodeIdMessage, Agent_pb.VaultListMessage> {
    path: "/agentInterface.Agent/VaultsScan";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<Agent_pb.NodeIdMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.NodeIdMessage>;
    responseSerialize: grpc.serialize<Agent_pb.VaultListMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.VaultListMessage>;
}
interface IAgentService_IVaultsPermisssionsCheck extends grpc.MethodDefinition<Agent_pb.VaultPermMessage, Agent_pb.PermissionMessage> {
    path: "/agentInterface.Agent/VaultsPermisssionsCheck";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.VaultPermMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.VaultPermMessage>;
    responseSerialize: grpc.serialize<Agent_pb.PermissionMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.PermissionMessage>;
}
interface IAgentService_INodesClosestLocalNodesGet extends grpc.MethodDefinition<Agent_pb.NodeIdMessage, Agent_pb.NodeTableMessage> {
    path: "/agentInterface.Agent/NodesClosestLocalNodesGet";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.NodeIdMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.NodeIdMessage>;
    responseSerialize: grpc.serialize<Agent_pb.NodeTableMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.NodeTableMessage>;
}
interface IAgentService_INodesClaimsGet extends grpc.MethodDefinition<Agent_pb.ClaimTypeMessage, Agent_pb.ClaimsMessage> {
    path: "/agentInterface.Agent/NodesClaimsGet";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.ClaimTypeMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.ClaimTypeMessage>;
    responseSerialize: grpc.serialize<Agent_pb.ClaimsMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.ClaimsMessage>;
}
interface IAgentService_INodesChainDataGet extends grpc.MethodDefinition<Agent_pb.EmptyMessage, Agent_pb.ChainDataMessage> {
    path: "/agentInterface.Agent/NodesChainDataGet";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Agent_pb.ChainDataMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.ChainDataMessage>;
}
interface IAgentService_INodesHolePunchMessageSend extends grpc.MethodDefinition<Agent_pb.RelayMessage, Agent_pb.EmptyMessage> {
    path: "/agentInterface.Agent/NodesHolePunchMessageSend";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.RelayMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.RelayMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface IAgentService_INodesCrossSignClaim extends grpc.MethodDefinition<Agent_pb.CrossSignMessage, Agent_pb.CrossSignMessage> {
    path: "/agentInterface.Agent/NodesCrossSignClaim";
    requestStream: true;
    responseStream: true;
    requestSerialize: grpc.serialize<Agent_pb.CrossSignMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.CrossSignMessage>;
    responseSerialize: grpc.serialize<Agent_pb.CrossSignMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.CrossSignMessage>;
}
interface IAgentService_INotificationsSend extends grpc.MethodDefinition<Agent_pb.NotificationMessage, Agent_pb.EmptyMessage> {
    path: "/agentInterface.Agent/NotificationsSend";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.NotificationMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.NotificationMessage>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}

export const AgentService: IAgentService;

export interface IAgentServer extends grpc.UntypedServiceImplementation {
    echo: grpc.handleUnaryCall<Agent_pb.EchoMessage, Agent_pb.EchoMessage>;
    vaultsGitInfoGet: grpc.handleServerStreamingCall<Agent_pb.InfoRequest, Agent_pb.PackChunk>;
    vaultsGitPackGet: grpc.handleBidiStreamingCall<Agent_pb.PackChunk, Agent_pb.PackChunk>;
    vaultsScan: grpc.handleServerStreamingCall<Agent_pb.NodeIdMessage, Agent_pb.VaultListMessage>;
    vaultsPermisssionsCheck: grpc.handleUnaryCall<Agent_pb.VaultPermMessage, Agent_pb.PermissionMessage>;
    nodesClosestLocalNodesGet: grpc.handleUnaryCall<Agent_pb.NodeIdMessage, Agent_pb.NodeTableMessage>;
    nodesClaimsGet: grpc.handleUnaryCall<Agent_pb.ClaimTypeMessage, Agent_pb.ClaimsMessage>;
    nodesChainDataGet: grpc.handleUnaryCall<Agent_pb.EmptyMessage, Agent_pb.ChainDataMessage>;
    nodesHolePunchMessageSend: grpc.handleUnaryCall<Agent_pb.RelayMessage, Agent_pb.EmptyMessage>;
    nodesCrossSignClaim: grpc.handleBidiStreamingCall<Agent_pb.CrossSignMessage, Agent_pb.CrossSignMessage>;
    notificationsSend: grpc.handleUnaryCall<Agent_pb.NotificationMessage, Agent_pb.EmptyMessage>;
}

export interface IAgentClient {
    echo(request: Agent_pb.EchoMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    echo(request: Agent_pb.EchoMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    echo(request: Agent_pb.EchoMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    vaultsGitInfoGet(request: Agent_pb.InfoRequest, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Agent_pb.PackChunk>;
    vaultsGitInfoGet(request: Agent_pb.InfoRequest, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Agent_pb.PackChunk>;
    vaultsGitPackGet(): grpc.ClientDuplexStream<Agent_pb.PackChunk, Agent_pb.PackChunk>;
    vaultsGitPackGet(options: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<Agent_pb.PackChunk, Agent_pb.PackChunk>;
    vaultsGitPackGet(metadata: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<Agent_pb.PackChunk, Agent_pb.PackChunk>;
    vaultsScan(request: Agent_pb.NodeIdMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Agent_pb.VaultListMessage>;
    vaultsScan(request: Agent_pb.NodeIdMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Agent_pb.VaultListMessage>;
    vaultsPermisssionsCheck(request: Agent_pb.VaultPermMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.PermissionMessage) => void): grpc.ClientUnaryCall;
    vaultsPermisssionsCheck(request: Agent_pb.VaultPermMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.PermissionMessage) => void): grpc.ClientUnaryCall;
    vaultsPermisssionsCheck(request: Agent_pb.VaultPermMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.PermissionMessage) => void): grpc.ClientUnaryCall;
    nodesClosestLocalNodesGet(request: Agent_pb.NodeIdMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.NodeTableMessage) => void): grpc.ClientUnaryCall;
    nodesClosestLocalNodesGet(request: Agent_pb.NodeIdMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.NodeTableMessage) => void): grpc.ClientUnaryCall;
    nodesClosestLocalNodesGet(request: Agent_pb.NodeIdMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.NodeTableMessage) => void): grpc.ClientUnaryCall;
    nodesClaimsGet(request: Agent_pb.ClaimTypeMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.ClaimsMessage) => void): grpc.ClientUnaryCall;
    nodesClaimsGet(request: Agent_pb.ClaimTypeMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.ClaimsMessage) => void): grpc.ClientUnaryCall;
    nodesClaimsGet(request: Agent_pb.ClaimTypeMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.ClaimsMessage) => void): grpc.ClientUnaryCall;
    nodesChainDataGet(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.ChainDataMessage) => void): grpc.ClientUnaryCall;
    nodesChainDataGet(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.ChainDataMessage) => void): grpc.ClientUnaryCall;
    nodesChainDataGet(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.ChainDataMessage) => void): grpc.ClientUnaryCall;
    nodesHolePunchMessageSend(request: Agent_pb.RelayMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    nodesHolePunchMessageSend(request: Agent_pb.RelayMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    nodesHolePunchMessageSend(request: Agent_pb.RelayMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    nodesCrossSignClaim(): grpc.ClientDuplexStream<Agent_pb.CrossSignMessage, Agent_pb.CrossSignMessage>;
    nodesCrossSignClaim(options: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<Agent_pb.CrossSignMessage, Agent_pb.CrossSignMessage>;
    nodesCrossSignClaim(metadata: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<Agent_pb.CrossSignMessage, Agent_pb.CrossSignMessage>;
    notificationsSend(request: Agent_pb.NotificationMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    notificationsSend(request: Agent_pb.NotificationMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    notificationsSend(request: Agent_pb.NotificationMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
}

export class AgentClient extends grpc.Client implements IAgentClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: Partial<grpc.ClientOptions>);
    public echo(request: Agent_pb.EchoMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    public echo(request: Agent_pb.EchoMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    public echo(request: Agent_pb.EchoMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    public vaultsGitInfoGet(request: Agent_pb.InfoRequest, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Agent_pb.PackChunk>;
    public vaultsGitInfoGet(request: Agent_pb.InfoRequest, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Agent_pb.PackChunk>;
    public vaultsGitPackGet(options?: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<Agent_pb.PackChunk, Agent_pb.PackChunk>;
    public vaultsGitPackGet(metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<Agent_pb.PackChunk, Agent_pb.PackChunk>;
    public vaultsScan(request: Agent_pb.NodeIdMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Agent_pb.VaultListMessage>;
    public vaultsScan(request: Agent_pb.NodeIdMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Agent_pb.VaultListMessage>;
    public vaultsPermisssionsCheck(request: Agent_pb.VaultPermMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.PermissionMessage) => void): grpc.ClientUnaryCall;
    public vaultsPermisssionsCheck(request: Agent_pb.VaultPermMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.PermissionMessage) => void): grpc.ClientUnaryCall;
    public vaultsPermisssionsCheck(request: Agent_pb.VaultPermMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.PermissionMessage) => void): grpc.ClientUnaryCall;
    public nodesClosestLocalNodesGet(request: Agent_pb.NodeIdMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.NodeTableMessage) => void): grpc.ClientUnaryCall;
    public nodesClosestLocalNodesGet(request: Agent_pb.NodeIdMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.NodeTableMessage) => void): grpc.ClientUnaryCall;
    public nodesClosestLocalNodesGet(request: Agent_pb.NodeIdMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.NodeTableMessage) => void): grpc.ClientUnaryCall;
    public nodesClaimsGet(request: Agent_pb.ClaimTypeMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.ClaimsMessage) => void): grpc.ClientUnaryCall;
    public nodesClaimsGet(request: Agent_pb.ClaimTypeMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.ClaimsMessage) => void): grpc.ClientUnaryCall;
    public nodesClaimsGet(request: Agent_pb.ClaimTypeMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.ClaimsMessage) => void): grpc.ClientUnaryCall;
    public nodesChainDataGet(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.ChainDataMessage) => void): grpc.ClientUnaryCall;
    public nodesChainDataGet(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.ChainDataMessage) => void): grpc.ClientUnaryCall;
    public nodesChainDataGet(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.ChainDataMessage) => void): grpc.ClientUnaryCall;
    public nodesHolePunchMessageSend(request: Agent_pb.RelayMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public nodesHolePunchMessageSend(request: Agent_pb.RelayMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public nodesHolePunchMessageSend(request: Agent_pb.RelayMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public nodesCrossSignClaim(options?: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<Agent_pb.CrossSignMessage, Agent_pb.CrossSignMessage>;
    public nodesCrossSignClaim(metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<Agent_pb.CrossSignMessage, Agent_pb.CrossSignMessage>;
    public notificationsSend(request: Agent_pb.NotificationMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public notificationsSend(request: Agent_pb.NotificationMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public notificationsSend(request: Agent_pb.NotificationMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
}
