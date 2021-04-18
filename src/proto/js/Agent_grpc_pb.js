// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var Agent_pb = require('./Agent_pb.js');

function serialize_agentInterface_CertificateMessage(arg) {
  if (!(arg instanceof Agent_pb.CertificateMessage)) {
    throw new Error('Expected argument of type agentInterface.CertificateMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_CertificateMessage(buffer_arg) {
  return Agent_pb.CertificateMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agentInterface_ConnectionMessage(arg) {
  if (!(arg instanceof Agent_pb.ConnectionMessage)) {
    throw new Error('Expected argument of type agentInterface.ConnectionMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_ConnectionMessage(buffer_arg) {
  return Agent_pb.ConnectionMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agentInterface_EchoMessage(arg) {
  if (!(arg instanceof Agent_pb.EchoMessage)) {
    throw new Error('Expected argument of type agentInterface.EchoMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_EchoMessage(buffer_arg) {
  return Agent_pb.EchoMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agentInterface_EmptyMessage(arg) {
  if (!(arg instanceof Agent_pb.EmptyMessage)) {
    throw new Error('Expected argument of type agentInterface.EmptyMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_EmptyMessage(buffer_arg) {
  return Agent_pb.EmptyMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agentInterface_NodeIdMessage(arg) {
  if (!(arg instanceof Agent_pb.NodeIdMessage)) {
    throw new Error('Expected argument of type agentInterface.NodeIdMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_NodeIdMessage(buffer_arg) {
  return Agent_pb.NodeIdMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agentInterface_NodeTableMessage(arg) {
  if (!(arg instanceof Agent_pb.NodeTableMessage)) {
    throw new Error('Expected argument of type agentInterface.NodeTableMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_NodeTableMessage(buffer_arg) {
  return Agent_pb.NodeTableMessage.deserializeBinary(new Uint8Array(buffer_arg));
}


var AgentService = exports.AgentService = {
  echo: {
    path: '/agentInterface.Agent/Echo',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.EchoMessage,
    responseType: Agent_pb.EchoMessage,
    requestSerialize: serialize_agentInterface_EchoMessage,
    requestDeserialize: deserialize_agentInterface_EchoMessage,
    responseSerialize: serialize_agentInterface_EchoMessage,
    responseDeserialize: deserialize_agentInterface_EchoMessage,
  },
  getRootCertificate: {
    path: '/agentInterface.Agent/GetRootCertificate',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.EmptyMessage,
    responseType: Agent_pb.CertificateMessage,
    requestSerialize: serialize_agentInterface_EmptyMessage,
    requestDeserialize: deserialize_agentInterface_EmptyMessage,
    responseSerialize: serialize_agentInterface_CertificateMessage,
    responseDeserialize: deserialize_agentInterface_CertificateMessage,
  },
  requestCertificateSigning: {
    path: '/agentInterface.Agent/RequestCertificateSigning',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.CertificateMessage,
    responseType: Agent_pb.CertificateMessage,
    requestSerialize: serialize_agentInterface_CertificateMessage,
    requestDeserialize: deserialize_agentInterface_CertificateMessage,
    responseSerialize: serialize_agentInterface_CertificateMessage,
    responseDeserialize: deserialize_agentInterface_CertificateMessage,
  },
  getClosestLocalNodes: {
    path: '/agentInterface.Agent/GetClosestLocalNodes',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.NodeIdMessage,
    responseType: Agent_pb.NodeTableMessage,
    requestSerialize: serialize_agentInterface_NodeIdMessage,
    requestDeserialize: deserialize_agentInterface_NodeIdMessage,
    responseSerialize: serialize_agentInterface_NodeTableMessage,
    responseDeserialize: deserialize_agentInterface_NodeTableMessage,
  },
  synchronizeDHT: {
    path: '/agentInterface.Agent/SynchronizeDHT',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.EmptyMessage,
    responseType: Agent_pb.NodeTableMessage,
    requestSerialize: serialize_agentInterface_EmptyMessage,
    requestDeserialize: deserialize_agentInterface_EmptyMessage,
    responseSerialize: serialize_agentInterface_NodeTableMessage,
    responseDeserialize: deserialize_agentInterface_NodeTableMessage,
  },
  relayHolePunchMessage: {
    path: '/agentInterface.Agent/RelayHolePunchMessage',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.ConnectionMessage,
    responseType: Agent_pb.EmptyMessage,
    requestSerialize: serialize_agentInterface_ConnectionMessage,
    requestDeserialize: deserialize_agentInterface_ConnectionMessage,
    responseSerialize: serialize_agentInterface_EmptyMessage,
    responseDeserialize: deserialize_agentInterface_EmptyMessage,
  },
};

exports.AgentClient = grpc.makeGenericClientConstructor(AgentService);
