// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var Client_pb = require('./Client_pb.js');

function serialize_clientInterface_CommitMessage(arg) {
  if (!(arg instanceof Client_pb.CommitMessage)) {
    throw new Error('Expected argument of type clientInterface.CommitMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_clientInterface_CommitMessage(buffer_arg) {
  return Client_pb.CommitMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_clientInterface_EchoMessage(arg) {
  if (!(arg instanceof Client_pb.EchoMessage)) {
    throw new Error('Expected argument of type clientInterface.EchoMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_clientInterface_EchoMessage(buffer_arg) {
  return Client_pb.EchoMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_clientInterface_EmptyMessage(arg) {
  if (!(arg instanceof Client_pb.EmptyMessage)) {
    throw new Error('Expected argument of type clientInterface.EmptyMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_clientInterface_EmptyMessage(buffer_arg) {
  return Client_pb.EmptyMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_clientInterface_GestaltMessage(arg) {
  if (!(arg instanceof Client_pb.GestaltMessage)) {
    throw new Error('Expected argument of type clientInterface.GestaltMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_clientInterface_GestaltMessage(buffer_arg) {
  return Client_pb.GestaltMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_clientInterface_NodeMessage(arg) {
  if (!(arg instanceof Client_pb.NodeMessage)) {
    throw new Error('Expected argument of type clientInterface.NodeMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_clientInterface_NodeMessage(buffer_arg) {
  return Client_pb.NodeMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_clientInterface_SecretMessage(arg) {
  if (!(arg instanceof Client_pb.SecretMessage)) {
    throw new Error('Expected argument of type clientInterface.SecretMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_clientInterface_SecretMessage(buffer_arg) {
  return Client_pb.SecretMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_clientInterface_StatusMessage(arg) {
  if (!(arg instanceof Client_pb.StatusMessage)) {
    throw new Error('Expected argument of type clientInterface.StatusMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_clientInterface_StatusMessage(buffer_arg) {
  return Client_pb.StatusMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_clientInterface_VaultMessage(arg) {
  if (!(arg instanceof Client_pb.VaultMessage)) {
    throw new Error('Expected argument of type clientInterface.VaultMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_clientInterface_VaultMessage(buffer_arg) {
  return Client_pb.VaultMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_clientInterface_VaultSpecificMessage(arg) {
  if (!(arg instanceof Client_pb.VaultSpecificMessage)) {
    throw new Error('Expected argument of type clientInterface.VaultSpecificMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_clientInterface_VaultSpecificMessage(buffer_arg) {
  return Client_pb.VaultSpecificMessage.deserializeBinary(new Uint8Array(buffer_arg));
}


var ClientService = exports.ClientService = {
  echo: {
    path: '/clientInterface.Client/Echo',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.EchoMessage,
    responseType: Client_pb.EchoMessage,
    requestSerialize: serialize_clientInterface_EchoMessage,
    requestDeserialize: deserialize_clientInterface_EchoMessage,
    responseSerialize: serialize_clientInterface_EchoMessage,
    responseDeserialize: deserialize_clientInterface_EchoMessage,
  },
  nodesList: {
    path: '/clientInterface.Client/NodesList',
    requestStream: false,
    responseStream: true,
    requestType: Client_pb.EmptyMessage,
    responseType: Client_pb.NodeMessage,
    requestSerialize: serialize_clientInterface_EmptyMessage,
    requestDeserialize: deserialize_clientInterface_EmptyMessage,
    responseSerialize: serialize_clientInterface_NodeMessage,
    responseDeserialize: deserialize_clientInterface_NodeMessage,
  },
  vaultsList: {
    path: '/clientInterface.Client/VaultsList',
    requestStream: false,
    responseStream: true,
    requestType: Client_pb.EmptyMessage,
    responseType: Client_pb.VaultMessage,
    requestSerialize: serialize_clientInterface_EmptyMessage,
    requestDeserialize: deserialize_clientInterface_EmptyMessage,
    responseSerialize: serialize_clientInterface_VaultMessage,
    responseDeserialize: deserialize_clientInterface_VaultMessage,
  },
  vaultsCreate: {
    path: '/clientInterface.Client/VaultsCreate',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.VaultMessage,
    responseType: Client_pb.StatusMessage,
    requestSerialize: serialize_clientInterface_VaultMessage,
    requestDeserialize: deserialize_clientInterface_VaultMessage,
    responseSerialize: serialize_clientInterface_StatusMessage,
    responseDeserialize: deserialize_clientInterface_StatusMessage,
  },
  vaultsDelete: {
    path: '/clientInterface.Client/VaultsDelete',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.VaultMessage,
    responseType: Client_pb.StatusMessage,
    requestSerialize: serialize_clientInterface_VaultMessage,
    requestDeserialize: deserialize_clientInterface_VaultMessage,
    responseSerialize: serialize_clientInterface_StatusMessage,
    responseDeserialize: deserialize_clientInterface_StatusMessage,
  },
  vaultsListSecrets: {
    path: '/clientInterface.Client/VaultsListSecrets',
    requestStream: false,
    responseStream: true,
    requestType: Client_pb.VaultMessage,
    responseType: Client_pb.SecretMessage,
    requestSerialize: serialize_clientInterface_VaultMessage,
    requestDeserialize: deserialize_clientInterface_VaultMessage,
    responseSerialize: serialize_clientInterface_SecretMessage,
    responseDeserialize: deserialize_clientInterface_SecretMessage,
  },
  vaultsMkdir: {
    path: '/clientInterface.Client/VaultsMkdir',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.VaultSpecificMessage,
    responseType: Client_pb.EmptyMessage,
    requestSerialize: serialize_clientInterface_VaultSpecificMessage,
    requestDeserialize: deserialize_clientInterface_VaultSpecificMessage,
    responseSerialize: serialize_clientInterface_EmptyMessage,
    responseDeserialize: deserialize_clientInterface_EmptyMessage,
  },
  commitSync: {
    path: '/clientInterface.Client/CommitSync',
    requestStream: true,
    responseStream: false,
    requestType: Client_pb.CommitMessage,
    responseType: Client_pb.CommitMessage,
    requestSerialize: serialize_clientInterface_CommitMessage,
    requestDeserialize: deserialize_clientInterface_CommitMessage,
    responseSerialize: serialize_clientInterface_CommitMessage,
    responseDeserialize: deserialize_clientInterface_CommitMessage,
  },
  gestaltSync: {
    path: '/clientInterface.Client/GestaltSync',
    requestStream: true,
    responseStream: true,
    requestType: Client_pb.GestaltMessage,
    responseType: Client_pb.GestaltMessage,
    requestSerialize: serialize_clientInterface_GestaltMessage,
    requestDeserialize: deserialize_clientInterface_GestaltMessage,
    responseSerialize: serialize_clientInterface_GestaltMessage,
    responseDeserialize: deserialize_clientInterface_GestaltMessage,
  },
};

exports.ClientClient = grpc.makeGenericClientConstructor(ClientService);
