// package: peerInterface
// file: Peer.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as Peer_pb from "./Peer_pb";
import * as Agent_pb from "./Agent_pb";

interface IPeerService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    pingPeer: IPeerService_IPingPeer;
    getGitInfo: IPeerService_IGetGitInfo;
    getGitPack: IPeerService_IGetGitPack;
    getVaultNames: IPeerService_IGetVaultNames;
    getUDPAddress: IPeerService_IGetUDPAddress;
    requestPublicRelay: IPeerService_IRequestPublicRelay;
    getRootCertificate: IPeerService_IGetRootCertificate;
    requestCertificateSigning: IPeerService_IRequestCertificateSigning;
    peerDHTFindNode: IPeerService_IPeerDHTFindNode;
}

interface IPeerService_IPingPeer extends grpc.MethodDefinition<Peer_pb.PingPeerMessage, Peer_pb.PingPeerMessage> {
    path: "/peerInterface.Peer/PingPeer";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Peer_pb.PingPeerMessage>;
    requestDeserialize: grpc.deserialize<Peer_pb.PingPeerMessage>;
    responseSerialize: grpc.serialize<Peer_pb.PingPeerMessage>;
    responseDeserialize: grpc.deserialize<Peer_pb.PingPeerMessage>;
}
interface IPeerService_IGetGitInfo extends grpc.MethodDefinition<Peer_pb.InfoRequest, Peer_pb.InfoReply> {
    path: "/peerInterface.Peer/GetGitInfo";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Peer_pb.InfoRequest>;
    requestDeserialize: grpc.deserialize<Peer_pb.InfoRequest>;
    responseSerialize: grpc.serialize<Peer_pb.InfoReply>;
    responseDeserialize: grpc.deserialize<Peer_pb.InfoReply>;
}
interface IPeerService_IGetGitPack extends grpc.MethodDefinition<Peer_pb.PackRequest, Peer_pb.PackReply> {
    path: "/peerInterface.Peer/GetGitPack";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Peer_pb.PackRequest>;
    requestDeserialize: grpc.deserialize<Peer_pb.PackRequest>;
    responseSerialize: grpc.serialize<Peer_pb.PackReply>;
    responseDeserialize: grpc.deserialize<Peer_pb.PackReply>;
}
interface IPeerService_IGetVaultNames extends grpc.MethodDefinition<Agent_pb.EmptyMessage, Peer_pb.VaultNamesReply> {
    path: "/peerInterface.Peer/GetVaultNames";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Peer_pb.VaultNamesReply>;
    responseDeserialize: grpc.deserialize<Peer_pb.VaultNamesReply>;
}
interface IPeerService_IGetUDPAddress extends grpc.MethodDefinition<Agent_pb.EmptyMessage, Agent_pb.StringMessage> {
    path: "/peerInterface.Peer/GetUDPAddress";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Agent_pb.StringMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
}
interface IPeerService_IRequestPublicRelay extends grpc.MethodDefinition<Agent_pb.PeerInfoReadOnlyMessage, Agent_pb.StringMessage> {
    path: "/peerInterface.Peer/RequestPublicRelay";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.PeerInfoReadOnlyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.PeerInfoReadOnlyMessage>;
    responseSerialize: grpc.serialize<Agent_pb.StringMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
}
interface IPeerService_IGetRootCertificate extends grpc.MethodDefinition<Agent_pb.EmptyMessage, Agent_pb.StringMessage> {
    path: "/peerInterface.Peer/GetRootCertificate";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Agent_pb.StringMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
}
interface IPeerService_IRequestCertificateSigning extends grpc.MethodDefinition<Agent_pb.StringMessage, Agent_pb.StringMessage> {
    path: "/peerInterface.Peer/RequestCertificateSigning";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Agent_pb.StringMessage>;
    requestDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
    responseSerialize: grpc.serialize<Agent_pb.StringMessage>;
    responseDeserialize: grpc.deserialize<Agent_pb.StringMessage>;
}
interface IPeerService_IPeerDHTFindNode extends grpc.MethodDefinition<Peer_pb.PeerDHTFindNodeRequest, Peer_pb.PeerDHTFindNodeReply> {
    path: "/peerInterface.Peer/PeerDHTFindNode";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Peer_pb.PeerDHTFindNodeRequest>;
    requestDeserialize: grpc.deserialize<Peer_pb.PeerDHTFindNodeRequest>;
    responseSerialize: grpc.serialize<Peer_pb.PeerDHTFindNodeReply>;
    responseDeserialize: grpc.deserialize<Peer_pb.PeerDHTFindNodeReply>;
}

export const PeerService: IPeerService;

export interface IPeerServer {
    pingPeer: grpc.handleUnaryCall<Peer_pb.PingPeerMessage, Peer_pb.PingPeerMessage>;
    getGitInfo: grpc.handleUnaryCall<Peer_pb.InfoRequest, Peer_pb.InfoReply>;
    getGitPack: grpc.handleUnaryCall<Peer_pb.PackRequest, Peer_pb.PackReply>;
    getVaultNames: grpc.handleUnaryCall<Agent_pb.EmptyMessage, Peer_pb.VaultNamesReply>;
    getUDPAddress: grpc.handleUnaryCall<Agent_pb.EmptyMessage, Agent_pb.StringMessage>;
    requestPublicRelay: grpc.handleUnaryCall<Agent_pb.PeerInfoReadOnlyMessage, Agent_pb.StringMessage>;
    getRootCertificate: grpc.handleUnaryCall<Agent_pb.EmptyMessage, Agent_pb.StringMessage>;
    requestCertificateSigning: grpc.handleUnaryCall<Agent_pb.StringMessage, Agent_pb.StringMessage>;
    peerDHTFindNode: grpc.handleUnaryCall<Peer_pb.PeerDHTFindNodeRequest, Peer_pb.PeerDHTFindNodeReply>;
}

export interface IPeerClient {
    pingPeer(request: Peer_pb.PingPeerMessage, callback: (error: grpc.ServiceError | null, response: Peer_pb.PingPeerMessage) => void): grpc.ClientUnaryCall;
    pingPeer(request: Peer_pb.PingPeerMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Peer_pb.PingPeerMessage) => void): grpc.ClientUnaryCall;
    pingPeer(request: Peer_pb.PingPeerMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Peer_pb.PingPeerMessage) => void): grpc.ClientUnaryCall;
    getGitInfo(request: Peer_pb.InfoRequest, callback: (error: grpc.ServiceError | null, response: Peer_pb.InfoReply) => void): grpc.ClientUnaryCall;
    getGitInfo(request: Peer_pb.InfoRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Peer_pb.InfoReply) => void): grpc.ClientUnaryCall;
    getGitInfo(request: Peer_pb.InfoRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Peer_pb.InfoReply) => void): grpc.ClientUnaryCall;
    getGitPack(request: Peer_pb.PackRequest, callback: (error: grpc.ServiceError | null, response: Peer_pb.PackReply) => void): grpc.ClientUnaryCall;
    getGitPack(request: Peer_pb.PackRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Peer_pb.PackReply) => void): grpc.ClientUnaryCall;
    getGitPack(request: Peer_pb.PackRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Peer_pb.PackReply) => void): grpc.ClientUnaryCall;
    getVaultNames(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Peer_pb.VaultNamesReply) => void): grpc.ClientUnaryCall;
    getVaultNames(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Peer_pb.VaultNamesReply) => void): grpc.ClientUnaryCall;
    getVaultNames(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Peer_pb.VaultNamesReply) => void): grpc.ClientUnaryCall;
    getUDPAddress(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    getUDPAddress(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    getUDPAddress(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    requestPublicRelay(request: Agent_pb.PeerInfoReadOnlyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    requestPublicRelay(request: Agent_pb.PeerInfoReadOnlyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    requestPublicRelay(request: Agent_pb.PeerInfoReadOnlyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    getRootCertificate(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    getRootCertificate(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    getRootCertificate(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    requestCertificateSigning(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    requestCertificateSigning(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    requestCertificateSigning(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    peerDHTFindNode(request: Peer_pb.PeerDHTFindNodeRequest, callback: (error: grpc.ServiceError | null, response: Peer_pb.PeerDHTFindNodeReply) => void): grpc.ClientUnaryCall;
    peerDHTFindNode(request: Peer_pb.PeerDHTFindNodeRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Peer_pb.PeerDHTFindNodeReply) => void): grpc.ClientUnaryCall;
    peerDHTFindNode(request: Peer_pb.PeerDHTFindNodeRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Peer_pb.PeerDHTFindNodeReply) => void): grpc.ClientUnaryCall;
}

export class PeerClient extends grpc.Client implements IPeerClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: object);
    public pingPeer(request: Peer_pb.PingPeerMessage, callback: (error: grpc.ServiceError | null, response: Peer_pb.PingPeerMessage) => void): grpc.ClientUnaryCall;
    public pingPeer(request: Peer_pb.PingPeerMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Peer_pb.PingPeerMessage) => void): grpc.ClientUnaryCall;
    public pingPeer(request: Peer_pb.PingPeerMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Peer_pb.PingPeerMessage) => void): grpc.ClientUnaryCall;
    public getGitInfo(request: Peer_pb.InfoRequest, callback: (error: grpc.ServiceError | null, response: Peer_pb.InfoReply) => void): grpc.ClientUnaryCall;
    public getGitInfo(request: Peer_pb.InfoRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Peer_pb.InfoReply) => void): grpc.ClientUnaryCall;
    public getGitInfo(request: Peer_pb.InfoRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Peer_pb.InfoReply) => void): grpc.ClientUnaryCall;
    public getGitPack(request: Peer_pb.PackRequest, callback: (error: grpc.ServiceError | null, response: Peer_pb.PackReply) => void): grpc.ClientUnaryCall;
    public getGitPack(request: Peer_pb.PackRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Peer_pb.PackReply) => void): grpc.ClientUnaryCall;
    public getGitPack(request: Peer_pb.PackRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Peer_pb.PackReply) => void): grpc.ClientUnaryCall;
    public getVaultNames(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Peer_pb.VaultNamesReply) => void): grpc.ClientUnaryCall;
    public getVaultNames(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Peer_pb.VaultNamesReply) => void): grpc.ClientUnaryCall;
    public getVaultNames(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Peer_pb.VaultNamesReply) => void): grpc.ClientUnaryCall;
    public getUDPAddress(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public getUDPAddress(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public getUDPAddress(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public requestPublicRelay(request: Agent_pb.PeerInfoReadOnlyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public requestPublicRelay(request: Agent_pb.PeerInfoReadOnlyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public requestPublicRelay(request: Agent_pb.PeerInfoReadOnlyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public getRootCertificate(request: Agent_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public getRootCertificate(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public getRootCertificate(request: Agent_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public requestCertificateSigning(request: Agent_pb.StringMessage, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public requestCertificateSigning(request: Agent_pb.StringMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public requestCertificateSigning(request: Agent_pb.StringMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Agent_pb.StringMessage) => void): grpc.ClientUnaryCall;
    public peerDHTFindNode(request: Peer_pb.PeerDHTFindNodeRequest, callback: (error: grpc.ServiceError | null, response: Peer_pb.PeerDHTFindNodeReply) => void): grpc.ClientUnaryCall;
    public peerDHTFindNode(request: Peer_pb.PeerDHTFindNodeRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Peer_pb.PeerDHTFindNodeReply) => void): grpc.ClientUnaryCall;
    public peerDHTFindNode(request: Peer_pb.PeerDHTFindNodeRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Peer_pb.PeerDHTFindNodeReply) => void): grpc.ClientUnaryCall;
}
