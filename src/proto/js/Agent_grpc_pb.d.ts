// package: agentInterface
// file: Agent.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as Agent_pb from "./Agent_pb";
import * as Common_pb from "./Common_pb";
import * as Nodes_pb from "./Nodes_pb";
import * as Vaults_pb from "./Vaults_pb";
import * as Notifications_pb from "./Notifications_pb";

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

interface IAgentService_IEcho extends grpc.MethodDefinition<Common_pb.EchoMessage, Common_pb.EchoMessage> {
    path: "/agentInterface.Agent/Echo";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Common_pb.EchoMessage>;
    requestDeserialize: grpc.deserialize<Common_pb.EchoMessage>;
    responseSerialize: grpc.serialize<Common_pb.EchoMessage>;
    responseDeserialize: grpc.deserialize<Common_pb.EchoMessage>;
}
interface IAgentService_IVaultsGitInfoGet extends grpc.MethodDefinition<Vaults_pb.Vault, Vaults_pb.PackChunk> {
    path: "/agentInterface.Agent/VaultsGitInfoGet";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<Vaults_pb.Vault>;
    requestDeserialize: grpc.deserialize<Vaults_pb.Vault>;
    responseSerialize: grpc.serialize<Vaults_pb.PackChunk>;
    responseDeserialize: grpc.deserialize<Vaults_pb.PackChunk>;
}
interface IAgentService_IVaultsGitPackGet extends grpc.MethodDefinition<Vaults_pb.PackChunk, Vaults_pb.PackChunk> {
    path: "/agentInterface.Agent/VaultsGitPackGet";
    requestStream: true;
    responseStream: true;
    requestSerialize: grpc.serialize<Vaults_pb.PackChunk>;
    requestDeserialize: grpc.deserialize<Vaults_pb.PackChunk>;
    responseSerialize: grpc.serialize<Vaults_pb.PackChunk>;
    responseDeserialize: grpc.deserialize<Vaults_pb.PackChunk>;
}
interface IAgentService_IVaultsScan extends grpc.MethodDefinition<Nodes_pb.Node, Vaults_pb.Vault> {
    path: "/agentInterface.Agent/VaultsScan";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<Nodes_pb.Node>;
    requestDeserialize: grpc.deserialize<Nodes_pb.Node>;
    responseSerialize: grpc.serialize<Vaults_pb.Vault>;
    responseDeserialize: grpc.deserialize<Vaults_pb.Vault>;
}
interface IAgentService_IVaultsPermisssionsCheck extends grpc.MethodDefinition<Vaults_pb.NodePermission, Vaults_pb.NodePermissionAllowed> {
    path: "/agentInterface.Agent/VaultsPermisssionsCheck";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Vaults_pb.NodePermission>;
    requestDeserialize: grpc.deserialize<Vaults_pb.NodePermission>;
    responseSerialize: grpc.serialize<Vaults_pb.NodePermissionAllowed>;
    responseDeserialize: grpc.deserialize<Vaults_pb.NodePermissionAllowed>;
}
interface IAgentService_INodesClosestLocalNodesGet extends grpc.MethodDefinition<Nodes_pb.Node, Nodes_pb.NodeTable> {
    path: "/agentInterface.Agent/NodesClosestLocalNodesGet";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Nodes_pb.Node>;
    requestDeserialize: grpc.deserialize<Nodes_pb.Node>;
    responseSerialize: grpc.serialize<Nodes_pb.NodeTable>;
    responseDeserialize: grpc.deserialize<Nodes_pb.NodeTable>;
}
interface IAgentService_INodesClaimsGet extends grpc.MethodDefinition<Nodes_pb.ClaimType, Nodes_pb.Claims> {
    path: "/agentInterface.Agent/NodesClaimsGet";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Nodes_pb.ClaimType>;
    requestDeserialize: grpc.deserialize<Nodes_pb.ClaimType>;
    responseSerialize: grpc.serialize<Nodes_pb.Claims>;
    responseDeserialize: grpc.deserialize<Nodes_pb.Claims>;
}
interface IAgentService_INodesChainDataGet extends grpc.MethodDefinition<Common_pb.EmptyMessage, Nodes_pb.ChainData> {
    path: "/agentInterface.Agent/NodesChainDataGet";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Common_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Common_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Nodes_pb.ChainData>;
    responseDeserialize: grpc.deserialize<Nodes_pb.ChainData>;
}
interface IAgentService_INodesHolePunchMessageSend extends grpc.MethodDefinition<Nodes_pb.Relay, Common_pb.EmptyMessage> {
    path: "/agentInterface.Agent/NodesHolePunchMessageSend";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Nodes_pb.Relay>;
    requestDeserialize: grpc.deserialize<Nodes_pb.Relay>;
    responseSerialize: grpc.serialize<Common_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Common_pb.EmptyMessage>;
}
interface IAgentService_INodesCrossSignClaim extends grpc.MethodDefinition<Nodes_pb.CrossSign, Nodes_pb.CrossSign> {
    path: "/agentInterface.Agent/NodesCrossSignClaim";
    requestStream: true;
    responseStream: true;
    requestSerialize: grpc.serialize<Nodes_pb.CrossSign>;
    requestDeserialize: grpc.deserialize<Nodes_pb.CrossSign>;
    responseSerialize: grpc.serialize<Nodes_pb.CrossSign>;
    responseDeserialize: grpc.deserialize<Nodes_pb.CrossSign>;
}
interface IAgentService_INotificationsSend extends grpc.MethodDefinition<Notifications_pb.AgentNotification, Common_pb.EmptyMessage> {
    path: "/agentInterface.Agent/NotificationsSend";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Notifications_pb.AgentNotification>;
    requestDeserialize: grpc.deserialize<Notifications_pb.AgentNotification>;
    responseSerialize: grpc.serialize<Common_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Common_pb.EmptyMessage>;
}

export const AgentService: IAgentService;

export interface IAgentServer extends grpc.UntypedServiceImplementation {
    echo: grpc.handleUnaryCall<Common_pb.EchoMessage, Common_pb.EchoMessage>;
    vaultsGitInfoGet: grpc.handleServerStreamingCall<Vaults_pb.Vault, Vaults_pb.PackChunk>;
    vaultsGitPackGet: grpc.handleBidiStreamingCall<Vaults_pb.PackChunk, Vaults_pb.PackChunk>;
    vaultsScan: grpc.handleServerStreamingCall<Nodes_pb.Node, Vaults_pb.Vault>;
    vaultsPermisssionsCheck: grpc.handleUnaryCall<Vaults_pb.NodePermission, Vaults_pb.NodePermissionAllowed>;
    nodesClosestLocalNodesGet: grpc.handleUnaryCall<Nodes_pb.Node, Nodes_pb.NodeTable>;
    nodesClaimsGet: grpc.handleUnaryCall<Nodes_pb.ClaimType, Nodes_pb.Claims>;
    nodesChainDataGet: grpc.handleUnaryCall<Common_pb.EmptyMessage, Nodes_pb.ChainData>;
    nodesHolePunchMessageSend: grpc.handleUnaryCall<Nodes_pb.Relay, Common_pb.EmptyMessage>;
    nodesCrossSignClaim: grpc.handleBidiStreamingCall<Nodes_pb.CrossSign, Nodes_pb.CrossSign>;
    notificationsSend: grpc.handleUnaryCall<Notifications_pb.AgentNotification, Common_pb.EmptyMessage>;
}

export interface IAgentClient {
    echo(request: Common_pb.EchoMessage, callback: (error: grpc.ServiceError | null, response: Common_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    echo(request: Common_pb.EchoMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Common_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    echo(request: Common_pb.EchoMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Common_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    vaultsGitInfoGet(request: Vaults_pb.Vault, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Vaults_pb.PackChunk>;
    vaultsGitInfoGet(request: Vaults_pb.Vault, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Vaults_pb.PackChunk>;
    vaultsGitPackGet(): grpc.ClientDuplexStream<Vaults_pb.PackChunk, Vaults_pb.PackChunk>;
    vaultsGitPackGet(options: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<Vaults_pb.PackChunk, Vaults_pb.PackChunk>;
    vaultsGitPackGet(metadata: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<Vaults_pb.PackChunk, Vaults_pb.PackChunk>;
    vaultsScan(request: Nodes_pb.Node, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Vaults_pb.Vault>;
    vaultsScan(request: Nodes_pb.Node, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Vaults_pb.Vault>;
    vaultsPermisssionsCheck(request: Vaults_pb.NodePermission, callback: (error: grpc.ServiceError | null, response: Vaults_pb.NodePermissionAllowed) => void): grpc.ClientUnaryCall;
    vaultsPermisssionsCheck(request: Vaults_pb.NodePermission, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Vaults_pb.NodePermissionAllowed) => void): grpc.ClientUnaryCall;
    vaultsPermisssionsCheck(request: Vaults_pb.NodePermission, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Vaults_pb.NodePermissionAllowed) => void): grpc.ClientUnaryCall;
    nodesClosestLocalNodesGet(request: Nodes_pb.Node, callback: (error: grpc.ServiceError | null, response: Nodes_pb.NodeTable) => void): grpc.ClientUnaryCall;
    nodesClosestLocalNodesGet(request: Nodes_pb.Node, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Nodes_pb.NodeTable) => void): grpc.ClientUnaryCall;
    nodesClosestLocalNodesGet(request: Nodes_pb.Node, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Nodes_pb.NodeTable) => void): grpc.ClientUnaryCall;
    nodesClaimsGet(request: Nodes_pb.ClaimType, callback: (error: grpc.ServiceError | null, response: Nodes_pb.Claims) => void): grpc.ClientUnaryCall;
    nodesClaimsGet(request: Nodes_pb.ClaimType, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Nodes_pb.Claims) => void): grpc.ClientUnaryCall;
    nodesClaimsGet(request: Nodes_pb.ClaimType, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Nodes_pb.Claims) => void): grpc.ClientUnaryCall;
    nodesChainDataGet(request: Common_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Nodes_pb.ChainData) => void): grpc.ClientUnaryCall;
    nodesChainDataGet(request: Common_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Nodes_pb.ChainData) => void): grpc.ClientUnaryCall;
    nodesChainDataGet(request: Common_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Nodes_pb.ChainData) => void): grpc.ClientUnaryCall;
    nodesHolePunchMessageSend(request: Nodes_pb.Relay, callback: (error: grpc.ServiceError | null, response: Common_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    nodesHolePunchMessageSend(request: Nodes_pb.Relay, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Common_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    nodesHolePunchMessageSend(request: Nodes_pb.Relay, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Common_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    nodesCrossSignClaim(): grpc.ClientDuplexStream<Nodes_pb.CrossSign, Nodes_pb.CrossSign>;
    nodesCrossSignClaim(options: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<Nodes_pb.CrossSign, Nodes_pb.CrossSign>;
    nodesCrossSignClaim(metadata: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<Nodes_pb.CrossSign, Nodes_pb.CrossSign>;
    notificationsSend(request: Notifications_pb.AgentNotification, callback: (error: grpc.ServiceError | null, response: Common_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    notificationsSend(request: Notifications_pb.AgentNotification, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Common_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    notificationsSend(request: Notifications_pb.AgentNotification, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Common_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
}

export class AgentClient extends grpc.Client implements IAgentClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: Partial<grpc.ClientOptions>);
    public echo(request: Common_pb.EchoMessage, callback: (error: grpc.ServiceError | null, response: Common_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    public echo(request: Common_pb.EchoMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Common_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    public echo(request: Common_pb.EchoMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Common_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    public vaultsGitInfoGet(request: Vaults_pb.Vault, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Vaults_pb.PackChunk>;
    public vaultsGitInfoGet(request: Vaults_pb.Vault, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Vaults_pb.PackChunk>;
    public vaultsGitPackGet(options?: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<Vaults_pb.PackChunk, Vaults_pb.PackChunk>;
    public vaultsGitPackGet(metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<Vaults_pb.PackChunk, Vaults_pb.PackChunk>;
    public vaultsScan(request: Nodes_pb.Node, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Vaults_pb.Vault>;
    public vaultsScan(request: Nodes_pb.Node, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Vaults_pb.Vault>;
    public vaultsPermisssionsCheck(request: Vaults_pb.NodePermission, callback: (error: grpc.ServiceError | null, response: Vaults_pb.NodePermissionAllowed) => void): grpc.ClientUnaryCall;
    public vaultsPermisssionsCheck(request: Vaults_pb.NodePermission, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Vaults_pb.NodePermissionAllowed) => void): grpc.ClientUnaryCall;
    public vaultsPermisssionsCheck(request: Vaults_pb.NodePermission, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Vaults_pb.NodePermissionAllowed) => void): grpc.ClientUnaryCall;
    public nodesClosestLocalNodesGet(request: Nodes_pb.Node, callback: (error: grpc.ServiceError | null, response: Nodes_pb.NodeTable) => void): grpc.ClientUnaryCall;
    public nodesClosestLocalNodesGet(request: Nodes_pb.Node, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Nodes_pb.NodeTable) => void): grpc.ClientUnaryCall;
    public nodesClosestLocalNodesGet(request: Nodes_pb.Node, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Nodes_pb.NodeTable) => void): grpc.ClientUnaryCall;
    public nodesClaimsGet(request: Nodes_pb.ClaimType, callback: (error: grpc.ServiceError | null, response: Nodes_pb.Claims) => void): grpc.ClientUnaryCall;
    public nodesClaimsGet(request: Nodes_pb.ClaimType, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Nodes_pb.Claims) => void): grpc.ClientUnaryCall;
    public nodesClaimsGet(request: Nodes_pb.ClaimType, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Nodes_pb.Claims) => void): grpc.ClientUnaryCall;
    public nodesChainDataGet(request: Common_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Nodes_pb.ChainData) => void): grpc.ClientUnaryCall;
    public nodesChainDataGet(request: Common_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Nodes_pb.ChainData) => void): grpc.ClientUnaryCall;
    public nodesChainDataGet(request: Common_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Nodes_pb.ChainData) => void): grpc.ClientUnaryCall;
    public nodesHolePunchMessageSend(request: Nodes_pb.Relay, callback: (error: grpc.ServiceError | null, response: Common_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public nodesHolePunchMessageSend(request: Nodes_pb.Relay, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Common_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public nodesHolePunchMessageSend(request: Nodes_pb.Relay, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Common_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public nodesCrossSignClaim(options?: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<Nodes_pb.CrossSign, Nodes_pb.CrossSign>;
    public nodesCrossSignClaim(metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<Nodes_pb.CrossSign, Nodes_pb.CrossSign>;
    public notificationsSend(request: Notifications_pb.AgentNotification, callback: (error: grpc.ServiceError | null, response: Common_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public notificationsSend(request: Notifications_pb.AgentNotification, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Common_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public notificationsSend(request: Notifications_pb.AgentNotification, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Common_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
}
