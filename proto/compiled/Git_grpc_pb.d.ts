// package: git
// file: Git.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as Git_pb from "./Git_pb";

interface IGitServerService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    requestInfo: IGitServerService_IRequestInfo;
    requestPack: IGitServerService_IRequestPack;
}

interface IGitServerService_IRequestInfo extends grpc.MethodDefinition<Git_pb.InfoRequest, Git_pb.InfoReply> {
    path: string; // "/git.GitServer/RequestInfo"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Git_pb.InfoRequest>;
    requestDeserialize: grpc.deserialize<Git_pb.InfoRequest>;
    responseSerialize: grpc.serialize<Git_pb.InfoReply>;
    responseDeserialize: grpc.deserialize<Git_pb.InfoReply>;
}
interface IGitServerService_IRequestPack extends grpc.MethodDefinition<Git_pb.PackRequest, Git_pb.PackReply> {
    path: string; // "/git.GitServer/RequestPack"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Git_pb.PackRequest>;
    requestDeserialize: grpc.deserialize<Git_pb.PackRequest>;
    responseSerialize: grpc.serialize<Git_pb.PackReply>;
    responseDeserialize: grpc.deserialize<Git_pb.PackReply>;
}

export const GitServerService: IGitServerService;

export interface IGitServerServer {
    requestInfo: grpc.handleUnaryCall<Git_pb.InfoRequest, Git_pb.InfoReply>;
    requestPack: grpc.handleUnaryCall<Git_pb.PackRequest, Git_pb.PackReply>;
}

export interface IGitServerClient {
    requestInfo(request: Git_pb.InfoRequest, callback: (error: grpc.ServiceError | null, response: Git_pb.InfoReply) => void): grpc.ClientUnaryCall;
    requestInfo(request: Git_pb.InfoRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Git_pb.InfoReply) => void): grpc.ClientUnaryCall;
    requestInfo(request: Git_pb.InfoRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Git_pb.InfoReply) => void): grpc.ClientUnaryCall;
    requestPack(request: Git_pb.PackRequest, callback: (error: grpc.ServiceError | null, response: Git_pb.PackReply) => void): grpc.ClientUnaryCall;
    requestPack(request: Git_pb.PackRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Git_pb.PackReply) => void): grpc.ClientUnaryCall;
    requestPack(request: Git_pb.PackRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Git_pb.PackReply) => void): grpc.ClientUnaryCall;
}

export class GitServerClient extends grpc.Client implements IGitServerClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: object);
    public requestInfo(request: Git_pb.InfoRequest, callback: (error: grpc.ServiceError | null, response: Git_pb.InfoReply) => void): grpc.ClientUnaryCall;
    public requestInfo(request: Git_pb.InfoRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Git_pb.InfoReply) => void): grpc.ClientUnaryCall;
    public requestInfo(request: Git_pb.InfoRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Git_pb.InfoReply) => void): grpc.ClientUnaryCall;
    public requestPack(request: Git_pb.PackRequest, callback: (error: grpc.ServiceError | null, response: Git_pb.PackReply) => void): grpc.ClientUnaryCall;
    public requestPack(request: Git_pb.PackRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Git_pb.PackReply) => void): grpc.ClientUnaryCall;
    public requestPack(request: Git_pb.PackRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Git_pb.PackReply) => void): grpc.ClientUnaryCall;
}
