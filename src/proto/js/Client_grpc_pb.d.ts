// package: clientInterface
// file: Client.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import {handleClientStreamingCall} from "@grpc/grpc-js/build/src/server-call";
import * as Client_pb from "./Client_pb";

interface IClientService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    echo: IClientService_IEcho;
    nodesList: IClientService_INodesList;
    vaultsList: IClientService_IVaultsList;
    vaultsCreate: IClientService_IVaultsCreate;
    vaultsDelete: IClientService_IVaultsDelete;
    vaultsListSecrets: IClientService_IVaultsListSecrets;
    vaultsMkdir: IClientService_IVaultsMkdir;
    commitSync: IClientService_ICommitSync;
    gestaltSync: IClientService_IGestaltSync;
}

interface IClientService_IEcho extends grpc.MethodDefinition<Client_pb.EchoMessage, Client_pb.EchoMessage> {
    path: "/clientInterface.Client/Echo";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.EchoMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.EchoMessage>;
    responseSerialize: grpc.serialize<Client_pb.EchoMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.EchoMessage>;
}
interface IClientService_INodesList extends grpc.MethodDefinition<Client_pb.EmptyMessage, Client_pb.NodeMessage> {
    path: "/clientInterface.Client/NodesList";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Client_pb.NodeMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.NodeMessage>;
}
interface IClientService_IVaultsList extends grpc.MethodDefinition<Client_pb.EmptyMessage, Client_pb.VaultMessage> {
    path: "/clientInterface.Client/VaultsList";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Client_pb.VaultMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.VaultMessage>;
}
interface IClientService_IVaultsCreate extends grpc.MethodDefinition<Client_pb.VaultMessage, Client_pb.StatusMessage> {
    path: "/clientInterface.Client/VaultsCreate";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.VaultMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.VaultMessage>;
    responseSerialize: grpc.serialize<Client_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.StatusMessage>;
}
interface IClientService_IVaultsDelete extends grpc.MethodDefinition<Client_pb.VaultMessage, Client_pb.StatusMessage> {
    path: "/clientInterface.Client/VaultsDelete";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.VaultMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.VaultMessage>;
    responseSerialize: grpc.serialize<Client_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.StatusMessage>;
}
interface IClientService_IVaultsListSecrets extends grpc.MethodDefinition<Client_pb.VaultMessage, Client_pb.SecretMessage> {
    path: "/clientInterface.Client/VaultsListSecrets";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<Client_pb.VaultMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.VaultMessage>;
    responseSerialize: grpc.serialize<Client_pb.SecretMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.SecretMessage>;
}
interface IClientService_IVaultsMkdir extends grpc.MethodDefinition<Client_pb.VaultSpecificMessage, Client_pb.EmptyMessage> {
    path: "/clientInterface.Client/VaultsMkdir";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.VaultSpecificMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.VaultSpecificMessage>;
    responseSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
}
interface IClientService_ICommitSync extends grpc.MethodDefinition<Client_pb.CommitMessage, Client_pb.CommitMessage> {
    path: "/clientInterface.Client/CommitSync";
    requestStream: true;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.CommitMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.CommitMessage>;
    responseSerialize: grpc.serialize<Client_pb.CommitMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.CommitMessage>;
}
interface IClientService_IGestaltSync extends grpc.MethodDefinition<Client_pb.GestaltMessage, Client_pb.GestaltMessage> {
    path: "/clientInterface.Client/GestaltSync";
    requestStream: true;
    responseStream: true;
    requestSerialize: grpc.serialize<Client_pb.GestaltMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.GestaltMessage>;
    responseSerialize: grpc.serialize<Client_pb.GestaltMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.GestaltMessage>;
}

export const ClientService: IClientService;

export interface IClientServer extends grpc.UntypedServiceImplementation {
    echo: grpc.handleUnaryCall<Client_pb.EchoMessage, Client_pb.EchoMessage>;
    nodesList: grpc.handleServerStreamingCall<Client_pb.EmptyMessage, Client_pb.NodeMessage>;
    vaultsList: grpc.handleServerStreamingCall<Client_pb.EmptyMessage, Client_pb.VaultMessage>;
    vaultsCreate: grpc.handleUnaryCall<Client_pb.VaultMessage, Client_pb.StatusMessage>;
    vaultsDelete: grpc.handleUnaryCall<Client_pb.VaultMessage, Client_pb.StatusMessage>;
    vaultsListSecrets: grpc.handleServerStreamingCall<Client_pb.VaultMessage, Client_pb.SecretMessage>;
    vaultsMkdir: grpc.handleUnaryCall<Client_pb.VaultSpecificMessage, Client_pb.EmptyMessage>;
    commitSync: handleClientStreamingCall<Client_pb.CommitMessage, Client_pb.CommitMessage>;
    gestaltSync: grpc.handleBidiStreamingCall<Client_pb.GestaltMessage, Client_pb.GestaltMessage>;
}

export interface IClientClient {
    echo(request: Client_pb.EchoMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    echo(request: Client_pb.EchoMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    echo(request: Client_pb.EchoMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    nodesList(request: Client_pb.EmptyMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.NodeMessage>;
    nodesList(request: Client_pb.EmptyMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.NodeMessage>;
    vaultsList(request: Client_pb.EmptyMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.VaultMessage>;
    vaultsList(request: Client_pb.EmptyMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.VaultMessage>;
    vaultsCreate(request: Client_pb.VaultMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsCreate(request: Client_pb.VaultMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsCreate(request: Client_pb.VaultMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsDelete(request: Client_pb.VaultMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsDelete(request: Client_pb.VaultMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsDelete(request: Client_pb.VaultMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsListSecrets(request: Client_pb.VaultMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.SecretMessage>;
    vaultsListSecrets(request: Client_pb.VaultMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.SecretMessage>;
    vaultsMkdir(request: Client_pb.VaultSpecificMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    vaultsMkdir(request: Client_pb.VaultSpecificMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    vaultsMkdir(request: Client_pb.VaultSpecificMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    commitSync(callback: (error: grpc.ServiceError | null, response: Client_pb.CommitMessage) => void): grpc.ClientWritableStream<Client_pb.CommitMessage>;
    commitSync(metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.CommitMessage) => void): grpc.ClientWritableStream<Client_pb.CommitMessage>;
    commitSync(options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.CommitMessage) => void): grpc.ClientWritableStream<Client_pb.CommitMessage>;
    commitSync(metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.CommitMessage) => void): grpc.ClientWritableStream<Client_pb.CommitMessage>;
    gestaltSync(): grpc.ClientDuplexStream<Client_pb.GestaltMessage, Client_pb.GestaltMessage>;
    gestaltSync(options: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<Client_pb.GestaltMessage, Client_pb.GestaltMessage>;
    gestaltSync(metadata: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<Client_pb.GestaltMessage, Client_pb.GestaltMessage>;
}

export class ClientClient extends grpc.Client implements IClientClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: Partial<grpc.ClientOptions>);
    public echo(request: Client_pb.EchoMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    public echo(request: Client_pb.EchoMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    public echo(request: Client_pb.EchoMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    public nodesList(request: Client_pb.EmptyMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.NodeMessage>;
    public nodesList(request: Client_pb.EmptyMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.NodeMessage>;
    public vaultsList(request: Client_pb.EmptyMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.VaultMessage>;
    public vaultsList(request: Client_pb.EmptyMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.VaultMessage>;
    public vaultsCreate(request: Client_pb.VaultMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsCreate(request: Client_pb.VaultMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsCreate(request: Client_pb.VaultMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsDelete(request: Client_pb.VaultMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsDelete(request: Client_pb.VaultMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsDelete(request: Client_pb.VaultMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsListSecrets(request: Client_pb.VaultMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.SecretMessage>;
    public vaultsListSecrets(request: Client_pb.VaultMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.SecretMessage>;
    public vaultsMkdir(request: Client_pb.VaultSpecificMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public vaultsMkdir(request: Client_pb.VaultSpecificMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public vaultsMkdir(request: Client_pb.VaultSpecificMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public commitSync(callback: (error: grpc.ServiceError | null, response: Client_pb.CommitMessage) => void): grpc.ClientWritableStream<Client_pb.CommitMessage>;
    public commitSync(metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.CommitMessage) => void): grpc.ClientWritableStream<Client_pb.CommitMessage>;
    public commitSync(options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.CommitMessage) => void): grpc.ClientWritableStream<Client_pb.CommitMessage>;
    public commitSync(metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.CommitMessage) => void): grpc.ClientWritableStream<Client_pb.CommitMessage>;
    public gestaltSync(options?: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<Client_pb.GestaltMessage, Client_pb.GestaltMessage>;
    public gestaltSync(metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<Client_pb.GestaltMessage, Client_pb.GestaltMessage>;
}
