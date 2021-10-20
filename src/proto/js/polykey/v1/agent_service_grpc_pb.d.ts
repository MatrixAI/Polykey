// package: polykey.v1
// file: polykey/v1/agent_service.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as polykey_v1_agent_service_pb from "../../polykey/v1/agent_service_pb";
import * as polykey_v1_utils_utils_pb from "../../polykey/v1/utils/utils_pb";
import * as polykey_v1_nodes_nodes_pb from "../../polykey/v1/nodes/nodes_pb";
import * as polykey_v1_vaults_vaults_pb from "../../polykey/v1/vaults/vaults_pb";
import * as polykey_v1_notifications_notifications_pb from "../../polykey/v1/notifications/notifications_pb";

interface IAgentServiceService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    echo: IAgentServiceService_IEcho;
    vaultsGitInfoGet: IAgentServiceService_IVaultsGitInfoGet;
    vaultsGitPackGet: IAgentServiceService_IVaultsGitPackGet;
    vaultsScan: IAgentServiceService_IVaultsScan;
    vaultsPermisssionsCheck: IAgentServiceService_IVaultsPermisssionsCheck;
    nodesClosestLocalNodesGet: IAgentServiceService_INodesClosestLocalNodesGet;
    nodesClaimsGet: IAgentServiceService_INodesClaimsGet;
    nodesChainDataGet: IAgentServiceService_INodesChainDataGet;
    nodesHolePunchMessageSend: IAgentServiceService_INodesHolePunchMessageSend;
    nodesCrossSignClaim: IAgentServiceService_INodesCrossSignClaim;
    notificationsSend: IAgentServiceService_INotificationsSend;
}

interface IAgentServiceService_IEcho extends grpc.MethodDefinition<polykey_v1_utils_utils_pb.EchoMessage, polykey_v1_utils_utils_pb.EchoMessage> {
    path: "/polykey.v1.AgentService/Echo";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EchoMessage>;
    requestDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EchoMessage>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EchoMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EchoMessage>;
}
interface IAgentServiceService_IVaultsGitInfoGet extends grpc.MethodDefinition<polykey_v1_vaults_vaults_pb.Vault, polykey_v1_vaults_vaults_pb.PackChunk> {
    path: "/polykey.v1.AgentService/VaultsGitInfoGet";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<polykey_v1_vaults_vaults_pb.Vault>;
    requestDeserialize: grpc.deserialize<polykey_v1_vaults_vaults_pb.Vault>;
    responseSerialize: grpc.serialize<polykey_v1_vaults_vaults_pb.PackChunk>;
    responseDeserialize: grpc.deserialize<polykey_v1_vaults_vaults_pb.PackChunk>;
}
interface IAgentServiceService_IVaultsGitPackGet extends grpc.MethodDefinition<polykey_v1_vaults_vaults_pb.PackChunk, polykey_v1_vaults_vaults_pb.PackChunk> {
    path: "/polykey.v1.AgentService/VaultsGitPackGet";
    requestStream: true;
    responseStream: true;
    requestSerialize: grpc.serialize<polykey_v1_vaults_vaults_pb.PackChunk>;
    requestDeserialize: grpc.deserialize<polykey_v1_vaults_vaults_pb.PackChunk>;
    responseSerialize: grpc.serialize<polykey_v1_vaults_vaults_pb.PackChunk>;
    responseDeserialize: grpc.deserialize<polykey_v1_vaults_vaults_pb.PackChunk>;
}
interface IAgentServiceService_IVaultsScan extends grpc.MethodDefinition<polykey_v1_nodes_nodes_pb.Node, polykey_v1_vaults_vaults_pb.Vault> {
    path: "/polykey.v1.AgentService/VaultsScan";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<polykey_v1_nodes_nodes_pb.Node>;
    requestDeserialize: grpc.deserialize<polykey_v1_nodes_nodes_pb.Node>;
    responseSerialize: grpc.serialize<polykey_v1_vaults_vaults_pb.Vault>;
    responseDeserialize: grpc.deserialize<polykey_v1_vaults_vaults_pb.Vault>;
}
interface IAgentServiceService_IVaultsPermisssionsCheck extends grpc.MethodDefinition<polykey_v1_vaults_vaults_pb.NodePermission, polykey_v1_vaults_vaults_pb.NodePermissionAllowed> {
    path: "/polykey.v1.AgentService/VaultsPermisssionsCheck";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_vaults_vaults_pb.NodePermission>;
    requestDeserialize: grpc.deserialize<polykey_v1_vaults_vaults_pb.NodePermission>;
    responseSerialize: grpc.serialize<polykey_v1_vaults_vaults_pb.NodePermissionAllowed>;
    responseDeserialize: grpc.deserialize<polykey_v1_vaults_vaults_pb.NodePermissionAllowed>;
}
interface IAgentServiceService_INodesClosestLocalNodesGet extends grpc.MethodDefinition<polykey_v1_nodes_nodes_pb.Node, polykey_v1_nodes_nodes_pb.NodeTable> {
    path: "/polykey.v1.AgentService/NodesClosestLocalNodesGet";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_nodes_nodes_pb.Node>;
    requestDeserialize: grpc.deserialize<polykey_v1_nodes_nodes_pb.Node>;
    responseSerialize: grpc.serialize<polykey_v1_nodes_nodes_pb.NodeTable>;
    responseDeserialize: grpc.deserialize<polykey_v1_nodes_nodes_pb.NodeTable>;
}
interface IAgentServiceService_INodesClaimsGet extends grpc.MethodDefinition<polykey_v1_nodes_nodes_pb.ClaimType, polykey_v1_nodes_nodes_pb.Claims> {
    path: "/polykey.v1.AgentService/NodesClaimsGet";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_nodes_nodes_pb.ClaimType>;
    requestDeserialize: grpc.deserialize<polykey_v1_nodes_nodes_pb.ClaimType>;
    responseSerialize: grpc.serialize<polykey_v1_nodes_nodes_pb.Claims>;
    responseDeserialize: grpc.deserialize<polykey_v1_nodes_nodes_pb.Claims>;
}
interface IAgentServiceService_INodesChainDataGet extends grpc.MethodDefinition<polykey_v1_utils_utils_pb.EmptyMessage, polykey_v1_nodes_nodes_pb.ChainData> {
    path: "/polykey.v1.AgentService/NodesChainDataGet";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<polykey_v1_nodes_nodes_pb.ChainData>;
    responseDeserialize: grpc.deserialize<polykey_v1_nodes_nodes_pb.ChainData>;
}
interface IAgentServiceService_INodesHolePunchMessageSend extends grpc.MethodDefinition<polykey_v1_nodes_nodes_pb.Relay, polykey_v1_utils_utils_pb.EmptyMessage> {
    path: "/polykey.v1.AgentService/NodesHolePunchMessageSend";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_nodes_nodes_pb.Relay>;
    requestDeserialize: grpc.deserialize<polykey_v1_nodes_nodes_pb.Relay>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EmptyMessage>;
}
interface IAgentServiceService_INodesCrossSignClaim extends grpc.MethodDefinition<polykey_v1_nodes_nodes_pb.CrossSign, polykey_v1_nodes_nodes_pb.CrossSign> {
    path: "/polykey.v1.AgentService/NodesCrossSignClaim";
    requestStream: true;
    responseStream: true;
    requestSerialize: grpc.serialize<polykey_v1_nodes_nodes_pb.CrossSign>;
    requestDeserialize: grpc.deserialize<polykey_v1_nodes_nodes_pb.CrossSign>;
    responseSerialize: grpc.serialize<polykey_v1_nodes_nodes_pb.CrossSign>;
    responseDeserialize: grpc.deserialize<polykey_v1_nodes_nodes_pb.CrossSign>;
}
interface IAgentServiceService_INotificationsSend extends grpc.MethodDefinition<polykey_v1_notifications_notifications_pb.AgentNotification, polykey_v1_utils_utils_pb.EmptyMessage> {
    path: "/polykey.v1.AgentService/NotificationsSend";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_notifications_notifications_pb.AgentNotification>;
    requestDeserialize: grpc.deserialize<polykey_v1_notifications_notifications_pb.AgentNotification>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EmptyMessage>;
}

export const AgentServiceService: IAgentServiceService;

export interface IAgentServiceServer extends grpc.UntypedServiceImplementation {
    echo: grpc.handleUnaryCall<polykey_v1_utils_utils_pb.EchoMessage, polykey_v1_utils_utils_pb.EchoMessage>;
    vaultsGitInfoGet: grpc.handleServerStreamingCall<polykey_v1_vaults_vaults_pb.Vault, polykey_v1_vaults_vaults_pb.PackChunk>;
    vaultsGitPackGet: grpc.handleBidiStreamingCall<polykey_v1_vaults_vaults_pb.PackChunk, polykey_v1_vaults_vaults_pb.PackChunk>;
    vaultsScan: grpc.handleServerStreamingCall<polykey_v1_nodes_nodes_pb.Node, polykey_v1_vaults_vaults_pb.Vault>;
    vaultsPermisssionsCheck: grpc.handleUnaryCall<polykey_v1_vaults_vaults_pb.NodePermission, polykey_v1_vaults_vaults_pb.NodePermissionAllowed>;
    nodesClosestLocalNodesGet: grpc.handleUnaryCall<polykey_v1_nodes_nodes_pb.Node, polykey_v1_nodes_nodes_pb.NodeTable>;
    nodesClaimsGet: grpc.handleUnaryCall<polykey_v1_nodes_nodes_pb.ClaimType, polykey_v1_nodes_nodes_pb.Claims>;
    nodesChainDataGet: grpc.handleUnaryCall<polykey_v1_utils_utils_pb.EmptyMessage, polykey_v1_nodes_nodes_pb.ChainData>;
    nodesHolePunchMessageSend: grpc.handleUnaryCall<polykey_v1_nodes_nodes_pb.Relay, polykey_v1_utils_utils_pb.EmptyMessage>;
    nodesCrossSignClaim: grpc.handleBidiStreamingCall<polykey_v1_nodes_nodes_pb.CrossSign, polykey_v1_nodes_nodes_pb.CrossSign>;
    notificationsSend: grpc.handleUnaryCall<polykey_v1_notifications_notifications_pb.AgentNotification, polykey_v1_utils_utils_pb.EmptyMessage>;
}

export interface IAgentServiceClient {
    echo(request: polykey_v1_utils_utils_pb.EchoMessage, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    echo(request: polykey_v1_utils_utils_pb.EchoMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    echo(request: polykey_v1_utils_utils_pb.EchoMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    vaultsGitInfoGet(request: polykey_v1_vaults_vaults_pb.Vault, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_vaults_vaults_pb.PackChunk>;
    vaultsGitInfoGet(request: polykey_v1_vaults_vaults_pb.Vault, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_vaults_vaults_pb.PackChunk>;
    vaultsGitPackGet(): grpc.ClientDuplexStream<polykey_v1_vaults_vaults_pb.PackChunk, polykey_v1_vaults_vaults_pb.PackChunk>;
    vaultsGitPackGet(options: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<polykey_v1_vaults_vaults_pb.PackChunk, polykey_v1_vaults_vaults_pb.PackChunk>;
    vaultsGitPackGet(metadata: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<polykey_v1_vaults_vaults_pb.PackChunk, polykey_v1_vaults_vaults_pb.PackChunk>;
    vaultsScan(request: polykey_v1_nodes_nodes_pb.Node, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_vaults_vaults_pb.Vault>;
    vaultsScan(request: polykey_v1_nodes_nodes_pb.Node, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_vaults_vaults_pb.Vault>;
    vaultsPermisssionsCheck(request: polykey_v1_vaults_vaults_pb.NodePermission, callback: (error: grpc.ServiceError | null, response: polykey_v1_vaults_vaults_pb.NodePermissionAllowed) => void): grpc.ClientUnaryCall;
    vaultsPermisssionsCheck(request: polykey_v1_vaults_vaults_pb.NodePermission, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_vaults_vaults_pb.NodePermissionAllowed) => void): grpc.ClientUnaryCall;
    vaultsPermisssionsCheck(request: polykey_v1_vaults_vaults_pb.NodePermission, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_vaults_vaults_pb.NodePermissionAllowed) => void): grpc.ClientUnaryCall;
    nodesClosestLocalNodesGet(request: polykey_v1_nodes_nodes_pb.Node, callback: (error: grpc.ServiceError | null, response: polykey_v1_nodes_nodes_pb.NodeTable) => void): grpc.ClientUnaryCall;
    nodesClosestLocalNodesGet(request: polykey_v1_nodes_nodes_pb.Node, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_nodes_nodes_pb.NodeTable) => void): grpc.ClientUnaryCall;
    nodesClosestLocalNodesGet(request: polykey_v1_nodes_nodes_pb.Node, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_nodes_nodes_pb.NodeTable) => void): grpc.ClientUnaryCall;
    nodesClaimsGet(request: polykey_v1_nodes_nodes_pb.ClaimType, callback: (error: grpc.ServiceError | null, response: polykey_v1_nodes_nodes_pb.Claims) => void): grpc.ClientUnaryCall;
    nodesClaimsGet(request: polykey_v1_nodes_nodes_pb.ClaimType, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_nodes_nodes_pb.Claims) => void): grpc.ClientUnaryCall;
    nodesClaimsGet(request: polykey_v1_nodes_nodes_pb.ClaimType, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_nodes_nodes_pb.Claims) => void): grpc.ClientUnaryCall;
    nodesChainDataGet(request: polykey_v1_utils_utils_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: polykey_v1_nodes_nodes_pb.ChainData) => void): grpc.ClientUnaryCall;
    nodesChainDataGet(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_nodes_nodes_pb.ChainData) => void): grpc.ClientUnaryCall;
    nodesChainDataGet(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_nodes_nodes_pb.ChainData) => void): grpc.ClientUnaryCall;
    nodesHolePunchMessageSend(request: polykey_v1_nodes_nodes_pb.Relay, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    nodesHolePunchMessageSend(request: polykey_v1_nodes_nodes_pb.Relay, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    nodesHolePunchMessageSend(request: polykey_v1_nodes_nodes_pb.Relay, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    nodesCrossSignClaim(): grpc.ClientDuplexStream<polykey_v1_nodes_nodes_pb.CrossSign, polykey_v1_nodes_nodes_pb.CrossSign>;
    nodesCrossSignClaim(options: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<polykey_v1_nodes_nodes_pb.CrossSign, polykey_v1_nodes_nodes_pb.CrossSign>;
    nodesCrossSignClaim(metadata: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<polykey_v1_nodes_nodes_pb.CrossSign, polykey_v1_nodes_nodes_pb.CrossSign>;
    notificationsSend(request: polykey_v1_notifications_notifications_pb.AgentNotification, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    notificationsSend(request: polykey_v1_notifications_notifications_pb.AgentNotification, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    notificationsSend(request: polykey_v1_notifications_notifications_pb.AgentNotification, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
}

export class AgentServiceClient extends grpc.Client implements IAgentServiceClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: Partial<grpc.ClientOptions>);
    public echo(request: polykey_v1_utils_utils_pb.EchoMessage, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    public echo(request: polykey_v1_utils_utils_pb.EchoMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    public echo(request: polykey_v1_utils_utils_pb.EchoMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    public vaultsGitInfoGet(request: polykey_v1_vaults_vaults_pb.Vault, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_vaults_vaults_pb.PackChunk>;
    public vaultsGitInfoGet(request: polykey_v1_vaults_vaults_pb.Vault, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_vaults_vaults_pb.PackChunk>;
    public vaultsGitPackGet(options?: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<polykey_v1_vaults_vaults_pb.PackChunk, polykey_v1_vaults_vaults_pb.PackChunk>;
    public vaultsGitPackGet(metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<polykey_v1_vaults_vaults_pb.PackChunk, polykey_v1_vaults_vaults_pb.PackChunk>;
    public vaultsScan(request: polykey_v1_nodes_nodes_pb.Node, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_vaults_vaults_pb.Vault>;
    public vaultsScan(request: polykey_v1_nodes_nodes_pb.Node, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_vaults_vaults_pb.Vault>;
    public vaultsPermisssionsCheck(request: polykey_v1_vaults_vaults_pb.NodePermission, callback: (error: grpc.ServiceError | null, response: polykey_v1_vaults_vaults_pb.NodePermissionAllowed) => void): grpc.ClientUnaryCall;
    public vaultsPermisssionsCheck(request: polykey_v1_vaults_vaults_pb.NodePermission, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_vaults_vaults_pb.NodePermissionAllowed) => void): grpc.ClientUnaryCall;
    public vaultsPermisssionsCheck(request: polykey_v1_vaults_vaults_pb.NodePermission, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_vaults_vaults_pb.NodePermissionAllowed) => void): grpc.ClientUnaryCall;
    public nodesClosestLocalNodesGet(request: polykey_v1_nodes_nodes_pb.Node, callback: (error: grpc.ServiceError | null, response: polykey_v1_nodes_nodes_pb.NodeTable) => void): grpc.ClientUnaryCall;
    public nodesClosestLocalNodesGet(request: polykey_v1_nodes_nodes_pb.Node, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_nodes_nodes_pb.NodeTable) => void): grpc.ClientUnaryCall;
    public nodesClosestLocalNodesGet(request: polykey_v1_nodes_nodes_pb.Node, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_nodes_nodes_pb.NodeTable) => void): grpc.ClientUnaryCall;
    public nodesClaimsGet(request: polykey_v1_nodes_nodes_pb.ClaimType, callback: (error: grpc.ServiceError | null, response: polykey_v1_nodes_nodes_pb.Claims) => void): grpc.ClientUnaryCall;
    public nodesClaimsGet(request: polykey_v1_nodes_nodes_pb.ClaimType, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_nodes_nodes_pb.Claims) => void): grpc.ClientUnaryCall;
    public nodesClaimsGet(request: polykey_v1_nodes_nodes_pb.ClaimType, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_nodes_nodes_pb.Claims) => void): grpc.ClientUnaryCall;
    public nodesChainDataGet(request: polykey_v1_utils_utils_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: polykey_v1_nodes_nodes_pb.ChainData) => void): grpc.ClientUnaryCall;
    public nodesChainDataGet(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_nodes_nodes_pb.ChainData) => void): grpc.ClientUnaryCall;
    public nodesChainDataGet(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_nodes_nodes_pb.ChainData) => void): grpc.ClientUnaryCall;
    public nodesHolePunchMessageSend(request: polykey_v1_nodes_nodes_pb.Relay, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public nodesHolePunchMessageSend(request: polykey_v1_nodes_nodes_pb.Relay, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public nodesHolePunchMessageSend(request: polykey_v1_nodes_nodes_pb.Relay, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public nodesCrossSignClaim(options?: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<polykey_v1_nodes_nodes_pb.CrossSign, polykey_v1_nodes_nodes_pb.CrossSign>;
    public nodesCrossSignClaim(metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<polykey_v1_nodes_nodes_pb.CrossSign, polykey_v1_nodes_nodes_pb.CrossSign>;
    public notificationsSend(request: polykey_v1_notifications_notifications_pb.AgentNotification, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public notificationsSend(request: polykey_v1_notifications_notifications_pb.AgentNotification, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public notificationsSend(request: polykey_v1_notifications_notifications_pb.AgentNotification, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
}
