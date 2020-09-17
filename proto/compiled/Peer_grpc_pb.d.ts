// package: peer
// file: Peer.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as Peer_pb from "./Peer_pb";

interface IPeerService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    messagePeer: IPeerService_IMessagePeer;
}

interface IPeerService_IMessagePeer extends grpc.MethodDefinition<Peer_pb.PeerMessage, Peer_pb.PeerMessage> {
    path: string; // "/peer.Peer/MessagePeer"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Peer_pb.PeerMessage>;
    requestDeserialize: grpc.deserialize<Peer_pb.PeerMessage>;
    responseSerialize: grpc.serialize<Peer_pb.PeerMessage>;
    responseDeserialize: grpc.deserialize<Peer_pb.PeerMessage>;
}

export const PeerService: IPeerService;

export interface IPeerServer {
    messagePeer: grpc.handleUnaryCall<Peer_pb.PeerMessage, Peer_pb.PeerMessage>;
}

export interface IPeerClient {
    messagePeer(request: Peer_pb.PeerMessage, callback: (error: grpc.ServiceError | null, response: Peer_pb.PeerMessage) => void): grpc.ClientUnaryCall;
    messagePeer(request: Peer_pb.PeerMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Peer_pb.PeerMessage) => void): grpc.ClientUnaryCall;
    messagePeer(request: Peer_pb.PeerMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Peer_pb.PeerMessage) => void): grpc.ClientUnaryCall;
}

export class PeerClient extends grpc.Client implements IPeerClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: object);
    public messagePeer(request: Peer_pb.PeerMessage, callback: (error: grpc.ServiceError | null, response: Peer_pb.PeerMessage) => void): grpc.ClientUnaryCall;
    public messagePeer(request: Peer_pb.PeerMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Peer_pb.PeerMessage) => void): grpc.ClientUnaryCall;
    public messagePeer(request: Peer_pb.PeerMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Peer_pb.PeerMessage) => void): grpc.ClientUnaryCall;
}
