// package: nodeInterface
// file: Node.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as Node_pb from "./Node_pb";
import * as Agent_pb from "./Agent_pb";

interface INodeService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    pingNode: INodeService_IPingNode;
    getGitInfo: INodeService_IGetGitInfo;
    getGitPack: INodeService_IGetGitPack;
    getVaultNames: INodeService_IGetVaultNames;
    receiveMessage: INodeService_IReceiveMessage;
    getUDPAddress: INodeService_IGetUDPAddress;
    getRootCertificate: INodeService_IGetRootCertificate;
    requestCertificateSigning: INodeService_IRequestCertificateSigning;
    nodeDHTFindNode: INodeService_INodeDHTFindNode;
}

interface INodeService_IPingNode extends grpc.MethodDefinition<Node_pb.PingNodeMessage, Node_pb.PingNodeMessage> {
    path: "/nodeInterface.Node/PingNode";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Node_pb.PingNodeMessage>;
    requestDeserialize: grpc.deserialize<Node_pb.PingNodeMessage>;
    responseSerialize: grpc.serialize<Node_pb.PingNodeMessage>;
    responseDeserialize: grpc.deserialize<Node_pb.PingNodeMessage>;
}
interface INodeService_IGetGitInfo extends grpc.MethodDefinition<Node_pb.InfoRequest, Node_pb.InfoReply> {
    path: "/nodeInterface.Node/GetGitInfo";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Node_pb.InfoRequest>;
    requestDeserialize: grpc.deserialize<Node_pb.InfoRequest>;
    responseSerialize: grpc.serialize<Node_pb.InfoReply>;
    responseDeserialize: grpc.deserialize<Node_pb.InfoReply>;
}
interface INodeService_IGetGitPack extends grpc.MethodDefinition<Node_pb.PackRequest, Node_pb.PackReply> {
    path: "/nodeInterface.Node/GetGitPack";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Node_pb.PackRequest>;
    requestDeserialize: grpc.deserialize<Node_pb.PackRequest>;
    responseSerialize: grpc.serialize<Node_pb.PackReply>;
    responseDeserialize: grpc.deserialize<Node_pb.PackReply>;
}
interface INodeService_IGetVaultNames extends grpc.MethodDefinition<Agent_pb.EmptyMessage, Node_pb.VaultNamesReply> {
    path: "/nodeInterface.Node/GetVaultNames";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Node_pb.VaultNamesReply>;
    responseDeserialize: grpc.deserialize<Node_pb.VaultNamesReply>;
}
interface INodeService_IReceiveMessage extends grpc.MethodDefinition<Node_pb.MessageRequest, Agent_pb.EmptyMessage> {
    path: "/nodeInterface.Node/ReceiveMessage";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Node_pb.MessageRequest>;
    requestDeserialize: grpc.deserialize<Node_pb.MessageRequest>;
    responseSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
}
interface INodeService_IGetUDPAddress extends grpc.MethodDefinition<Agent_pb.NodeInfoReadOnlyMessage, Agent_pb.StringMessage> {
    path: "/nodeInterface.Node/GetUDPAddress";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.NodeInfoReadOnlyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.NodeInfoReadOnlyMessage>;
    responseSerialize: grpc.serialize<Agent_pb.StringMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
}
interface INodeService_IGetRootCertificate extends grpc.MethodDefinition<Agent_pb.EmptyMessage, Agent_pb.StringMessage> {
    path: "/nodeInterface.Node/GetRootCertificate";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Agent_pb.StringMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
}
interface INodeService_IRequestCertificateSigning extends grpc.MethodDefinition<Agent_pb.StringMessage, Agent_pb.StringMessage> {
    path: "/nodeInterface.Node/RequestCertificateSigning";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.StringMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
    responseSerialize: grpc.serialize<Agent_pb.StringMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
}
interface INodeService_INodeDHTFindNode extends grpc.MethodDefinition<Node_pb.NodeDHTFindNodeRequest, Node_pb.NodeDHTFindNodeReply> {
    path: "/nodeInterface.Node/NodeDHTFindNode";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Node_pb.NodeDHTFindNodeRequest>;
    requestDeserialize: grpc.deserialize<Node_pb.NodeDHTFindNodeRequest>;
    responseSerialize: grpc.serialize<Node_pb.NodeDHTFindNodeReply>;
    responseDeserialize: grpc.deserialize<Node_pb.NodeDHTFindNodeReply>;
}

export const NodeService: INodeService;

export interface INodeServer {
    pingNode: grpc.handleUnaryCall<Node_pb.PingNodeMessage, Node_pb.PingNodeMessage>;
    getGitInfo: grpc.handleUnaryCall<Node_pb.InfoRequest, Node_pb.InfoReply>;
    getGitPack: grpc.handleUnaryCall<Node_pb.PackRequest, Node_pb.PackReply>;
    getVaultNames: grpc.handleUnaryCall<Agent_pb.EmptyMessage, Node_pb.VaultNamesReply>;
    receiveMessage: grpc.handleUnaryCall<Node_pb.MessageRequest, Agent_pb.EmptyMessage>;
    getUDPAddress: grpc.handleUnaryCall<Agent_pb.NodeInfoReadOnlyMessage, Agent_pb.StringMessage>;
    getRootCertificate: grpc.handleUnaryCall<Agent_pb.EmptyMessage, Agent_pb.StringMessage>;
    requestCertificateSigning: grpc.handleUnaryCall<Agent_pb.StringMessage, Agent_pb.StringMessage>;
    nodeDHTFindNode: grpc.handleUnaryCall<Node_pb.NodeDHTFindNodeRequest, Node_pb.NodeDHTFindNodeReply>;
}

export interface INodeClient {
    pingNode(request: Node_pb.PingNodeMessage, callback: (error: grpc.ServiceError | null, response: Node_pb.PingNodeMessage) => void): grpc.ClientUnaryCall;
    pingNode(request: Node_pb.PingNodeMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Node_pb.PingNodeMessage) => void): grpc.ClientUnaryCall;
    pingNode(request: Node_pb.PingNodeMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Node_pb.PingNodeMessage) => void): grpc.ClientUnaryCall;
    getGitInfo(request: Node_pb.InfoRequest, callback: (error: grpc.ServiceError | null, response: Node_pb.InfoReply) => void): grpc.ClientUnaryCall;
    getGitInfo(request: Node_pb.InfoRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Node_pb.InfoReply) => void): grpc.ClientUnaryCall;
    getGitInfo(request: Node_pb.InfoRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Node_pb.InfoReply) => void): grpc.ClientUnaryCall;
    getGitPack(request: Node_pb.PackRequest, callback: (error: grpc.ServiceError | null, response: Node_pb.PackReply) => void): grpc.ClientUnaryCall;
    getGitPack(request: Node_pb.PackRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Node_pb.PackReply) => void): grpc.ClientUnaryCall;
    getGitPack(request: Node_pb.PackRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Node_pb.PackReply) => void): grpc.ClientUnaryCall;
    getVaultNames(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Node_pb.VaultNamesReply) => void): grpc.ClientUnaryCall;
    getVaultNames(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Node_pb.VaultNamesReply) => void): grpc.ClientUnaryCall;
    getVaultNames(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Node_pb.VaultNamesReply) => void): grpc.ClientUnaryCall;
    receiveMessage(request: Node_pb.MessageRequest, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    receiveMessage(request: Node_pb.MessageRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    receiveMessage(request: Node_pb.MessageRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    getUDPAddress(request: Agent_pb.NodeInfoReadOnlyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    getUDPAddress(request: Agent_pb.NodeInfoReadOnlyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    getUDPAddress(request: Agent_pb.NodeInfoReadOnlyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    getRootCertificate(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    getRootCertificate(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    getRootCertificate(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    requestCertificateSigning(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    requestCertificateSigning(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    requestCertificateSigning(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    nodeDHTFindNode(request: Node_pb.NodeDHTFindNodeRequest, callback: (error: grpc.ServiceError | null, response: Node_pb.NodeDHTFindNodeReply) => void): grpc.ClientUnaryCall;
    nodeDHTFindNode(request: Node_pb.NodeDHTFindNodeRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Node_pb.NodeDHTFindNodeReply) => void): grpc.ClientUnaryCall;
    nodeDHTFindNode(request: Node_pb.NodeDHTFindNodeRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Node_pb.NodeDHTFindNodeReply) => void): grpc.ClientUnaryCall;
}

export class NodeClient extends grpc.Client implements INodeClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: object);
    public pingNode(request: Node_pb.PingNodeMessage, callback: (error: grpc.ServiceError | null, response: Node_pb.PingNodeMessage) => void): grpc.ClientUnaryCall;
    public pingNode(request: Node_pb.PingNodeMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Node_pb.PingNodeMessage) => void): grpc.ClientUnaryCall;
    public pingNode(request: Node_pb.PingNodeMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Node_pb.PingNodeMessage) => void): grpc.ClientUnaryCall;
    public getGitInfo(request: Node_pb.InfoRequest, callback: (error: grpc.ServiceError | null, response: Node_pb.InfoReply) => void): grpc.ClientUnaryCall;
    public getGitInfo(request: Node_pb.InfoRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Node_pb.InfoReply) => void): grpc.ClientUnaryCall;
    public getGitInfo(request: Node_pb.InfoRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Node_pb.InfoReply) => void): grpc.ClientUnaryCall;
    public getGitPack(request: Node_pb.PackRequest, callback: (error: grpc.ServiceError | null, response: Node_pb.PackReply) => void): grpc.ClientUnaryCall;
    public getGitPack(request: Node_pb.PackRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Node_pb.PackReply) => void): grpc.ClientUnaryCall;
    public getGitPack(request: Node_pb.PackRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Node_pb.PackReply) => void): grpc.ClientUnaryCall;
    public getVaultNames(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Node_pb.VaultNamesReply) => void): grpc.ClientUnaryCall;
    public getVaultNames(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Node_pb.VaultNamesReply) => void): grpc.ClientUnaryCall;
    public getVaultNames(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Node_pb.VaultNamesReply) => void): grpc.ClientUnaryCall;
    public receiveMessage(request: Node_pb.MessageRequest, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public receiveMessage(request: Node_pb.MessageRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public receiveMessage(request: Node_pb.MessageRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public getUDPAddress(request: Agent_pb.NodeInfoReadOnlyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public getUDPAddress(request: Agent_pb.NodeInfoReadOnlyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public getUDPAddress(request: Agent_pb.NodeInfoReadOnlyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public getRootCertificate(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public getRootCertificate(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public getRootCertificate(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public requestCertificateSigning(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public requestCertificateSigning(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public requestCertificateSigning(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public nodeDHTFindNode(request: Node_pb.NodeDHTFindNodeRequest, callback: (error: grpc.ServiceError | null, response: Node_pb.NodeDHTFindNodeReply) => void): grpc.ClientUnaryCall;
    public nodeDHTFindNode(request: Node_pb.NodeDHTFindNodeRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Node_pb.NodeDHTFindNodeReply) => void): grpc.ClientUnaryCall;
    public nodeDHTFindNode(request: Node_pb.NodeDHTFindNodeRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Node_pb.NodeDHTFindNodeReply) => void): grpc.ClientUnaryCall;
}
