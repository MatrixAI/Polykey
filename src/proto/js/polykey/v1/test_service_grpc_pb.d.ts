// package: polykey.v1
// file: polykey/v1/test_service.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as polykey_v1_test_service_pb from "../../polykey/v1/test_service_pb";
import * as polykey_v1_utils_utils_pb from "../../polykey/v1/utils/utils_pb";

interface ITestServiceService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    unary: ITestServiceService_IUnary;
    serverStream: ITestServiceService_IServerStream;
    clientStream: ITestServiceService_IClientStream;
    duplexStream: ITestServiceService_IDuplexStream;
    unaryAuthenticated: ITestServiceService_IUnaryAuthenticated;
}

interface ITestServiceService_IUnary extends grpc.MethodDefinition<polykey_v1_utils_utils_pb.EchoMessage, polykey_v1_utils_utils_pb.EchoMessage> {
    path: "/polykey.v1.TestService/Unary";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EchoMessage>;
    requestDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EchoMessage>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EchoMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EchoMessage>;
}
interface ITestServiceService_IServerStream extends grpc.MethodDefinition<polykey_v1_utils_utils_pb.EchoMessage, polykey_v1_utils_utils_pb.EchoMessage> {
    path: "/polykey.v1.TestService/ServerStream";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EchoMessage>;
    requestDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EchoMessage>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EchoMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EchoMessage>;
}
interface ITestServiceService_IClientStream extends grpc.MethodDefinition<polykey_v1_utils_utils_pb.EchoMessage, polykey_v1_utils_utils_pb.EchoMessage> {
    path: "/polykey.v1.TestService/ClientStream";
    requestStream: true;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EchoMessage>;
    requestDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EchoMessage>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EchoMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EchoMessage>;
}
interface ITestServiceService_IDuplexStream extends grpc.MethodDefinition<polykey_v1_utils_utils_pb.EchoMessage, polykey_v1_utils_utils_pb.EchoMessage> {
    path: "/polykey.v1.TestService/DuplexStream";
    requestStream: true;
    responseStream: true;
    requestSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EchoMessage>;
    requestDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EchoMessage>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EchoMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EchoMessage>;
}
interface ITestServiceService_IUnaryAuthenticated extends grpc.MethodDefinition<polykey_v1_utils_utils_pb.EchoMessage, polykey_v1_utils_utils_pb.EchoMessage> {
    path: "/polykey.v1.TestService/UnaryAuthenticated";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EchoMessage>;
    requestDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EchoMessage>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EchoMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EchoMessage>;
}

export const TestServiceService: ITestServiceService;

export interface ITestServiceServer extends grpc.UntypedServiceImplementation {
    unary: grpc.handleUnaryCall<polykey_v1_utils_utils_pb.EchoMessage, polykey_v1_utils_utils_pb.EchoMessage>;
    serverStream: grpc.handleServerStreamingCall<polykey_v1_utils_utils_pb.EchoMessage, polykey_v1_utils_utils_pb.EchoMessage>;
    clientStream: grpc.handleClientStreamingCall<polykey_v1_utils_utils_pb.EchoMessage, polykey_v1_utils_utils_pb.EchoMessage>;
    duplexStream: grpc.handleBidiStreamingCall<polykey_v1_utils_utils_pb.EchoMessage, polykey_v1_utils_utils_pb.EchoMessage>;
    unaryAuthenticated: grpc.handleUnaryCall<polykey_v1_utils_utils_pb.EchoMessage, polykey_v1_utils_utils_pb.EchoMessage>;
}

export interface ITestServiceClient {
    unary(request: polykey_v1_utils_utils_pb.EchoMessage, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    unary(request: polykey_v1_utils_utils_pb.EchoMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    unary(request: polykey_v1_utils_utils_pb.EchoMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    serverStream(request: polykey_v1_utils_utils_pb.EchoMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_utils_utils_pb.EchoMessage>;
    serverStream(request: polykey_v1_utils_utils_pb.EchoMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_utils_utils_pb.EchoMessage>;
    clientStream(callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EchoMessage) => void): grpc.ClientWritableStream<polykey_v1_utils_utils_pb.EchoMessage>;
    clientStream(metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EchoMessage) => void): grpc.ClientWritableStream<polykey_v1_utils_utils_pb.EchoMessage>;
    clientStream(options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EchoMessage) => void): grpc.ClientWritableStream<polykey_v1_utils_utils_pb.EchoMessage>;
    clientStream(metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EchoMessage) => void): grpc.ClientWritableStream<polykey_v1_utils_utils_pb.EchoMessage>;
    duplexStream(): grpc.ClientDuplexStream<polykey_v1_utils_utils_pb.EchoMessage, polykey_v1_utils_utils_pb.EchoMessage>;
    duplexStream(options: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<polykey_v1_utils_utils_pb.EchoMessage, polykey_v1_utils_utils_pb.EchoMessage>;
    duplexStream(metadata: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<polykey_v1_utils_utils_pb.EchoMessage, polykey_v1_utils_utils_pb.EchoMessage>;
    unaryAuthenticated(request: polykey_v1_utils_utils_pb.EchoMessage, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    unaryAuthenticated(request: polykey_v1_utils_utils_pb.EchoMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    unaryAuthenticated(request: polykey_v1_utils_utils_pb.EchoMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EchoMessage) => void): grpc.ClientUnaryCall;
}

export class TestServiceClient extends grpc.Client implements ITestServiceClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: Partial<grpc.ClientOptions>);
    public unary(request: polykey_v1_utils_utils_pb.EchoMessage, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    public unary(request: polykey_v1_utils_utils_pb.EchoMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    public unary(request: polykey_v1_utils_utils_pb.EchoMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    public serverStream(request: polykey_v1_utils_utils_pb.EchoMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_utils_utils_pb.EchoMessage>;
    public serverStream(request: polykey_v1_utils_utils_pb.EchoMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_utils_utils_pb.EchoMessage>;
    public clientStream(callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EchoMessage) => void): grpc.ClientWritableStream<polykey_v1_utils_utils_pb.EchoMessage>;
    public clientStream(metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EchoMessage) => void): grpc.ClientWritableStream<polykey_v1_utils_utils_pb.EchoMessage>;
    public clientStream(options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EchoMessage) => void): grpc.ClientWritableStream<polykey_v1_utils_utils_pb.EchoMessage>;
    public clientStream(metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EchoMessage) => void): grpc.ClientWritableStream<polykey_v1_utils_utils_pb.EchoMessage>;
    public duplexStream(options?: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<polykey_v1_utils_utils_pb.EchoMessage, polykey_v1_utils_utils_pb.EchoMessage>;
    public duplexStream(metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<polykey_v1_utils_utils_pb.EchoMessage, polykey_v1_utils_utils_pb.EchoMessage>;
    public unaryAuthenticated(request: polykey_v1_utils_utils_pb.EchoMessage, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    public unaryAuthenticated(request: polykey_v1_utils_utils_pb.EchoMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    public unaryAuthenticated(request: polykey_v1_utils_utils_pb.EchoMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EchoMessage) => void): grpc.ClientUnaryCall;
}
