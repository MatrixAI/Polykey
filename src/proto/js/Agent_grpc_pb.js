// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var Agent_pb = require('./Agent_pb.js');

function serialize_agentInterface_ChainDataMessage(arg) {
  if (!(arg instanceof Agent_pb.ChainDataMessage)) {
    throw new Error('Expected argument of type agentInterface.ChainDataMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_ChainDataMessage(buffer_arg) {
  return Agent_pb.ChainDataMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agentInterface_ClaimTypeMessage(arg) {
  if (!(arg instanceof Agent_pb.ClaimTypeMessage)) {
    throw new Error('Expected argument of type agentInterface.ClaimTypeMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_ClaimTypeMessage(buffer_arg) {
  return Agent_pb.ClaimTypeMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agentInterface_ClaimsMessage(arg) {
  if (!(arg instanceof Agent_pb.ClaimsMessage)) {
    throw new Error('Expected argument of type agentInterface.ClaimsMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_ClaimsMessage(buffer_arg) {
  return Agent_pb.ClaimsMessage.deserializeBinary(new Uint8Array(buffer_arg));
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

function serialize_agentInterface_InfoRequest(arg) {
  if (!(arg instanceof Agent_pb.InfoRequest)) {
    throw new Error('Expected argument of type agentInterface.InfoRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_InfoRequest(buffer_arg) {
  return Agent_pb.InfoRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agentInterface_NodeDetailsMessage(arg) {
  if (!(arg instanceof Agent_pb.NodeDetailsMessage)) {
    throw new Error('Expected argument of type agentInterface.NodeDetailsMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_NodeDetailsMessage(buffer_arg) {
  return Agent_pb.NodeDetailsMessage.deserializeBinary(new Uint8Array(buffer_arg));
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

function serialize_agentInterface_NotificationMessage(arg) {
  if (!(arg instanceof Agent_pb.NotificationMessage)) {
    throw new Error('Expected argument of type agentInterface.NotificationMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_NotificationMessage(buffer_arg) {
  return Agent_pb.NotificationMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agentInterface_PackChunk(arg) {
  if (!(arg instanceof Agent_pb.PackChunk)) {
    throw new Error('Expected argument of type agentInterface.PackChunk');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_PackChunk(buffer_arg) {
  return Agent_pb.PackChunk.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agentInterface_PermissionMessage(arg) {
  if (!(arg instanceof Agent_pb.PermissionMessage)) {
    throw new Error('Expected argument of type agentInterface.PermissionMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_PermissionMessage(buffer_arg) {
  return Agent_pb.PermissionMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agentInterface_RelayMessage(arg) {
  if (!(arg instanceof Agent_pb.RelayMessage)) {
    throw new Error('Expected argument of type agentInterface.RelayMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_RelayMessage(buffer_arg) {
  return Agent_pb.RelayMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agentInterface_VaultListMessage(arg) {
  if (!(arg instanceof Agent_pb.VaultListMessage)) {
    throw new Error('Expected argument of type agentInterface.VaultListMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_VaultListMessage(buffer_arg) {
  return Agent_pb.VaultListMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agentInterface_VaultPermMessage(arg) {
  if (!(arg instanceof Agent_pb.VaultPermMessage)) {
    throw new Error('Expected argument of type agentInterface.VaultPermMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_VaultPermMessage(buffer_arg) {
  return Agent_pb.VaultPermMessage.deserializeBinary(new Uint8Array(buffer_arg));
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
  getGitInfo: {
    path: '/agentInterface.Agent/GetGitInfo',
    requestStream: false,
    responseStream: true,
    requestType: Agent_pb.InfoRequest,
    responseType: Agent_pb.PackChunk,
    requestSerialize: serialize_agentInterface_InfoRequest,
    requestDeserialize: deserialize_agentInterface_InfoRequest,
    responseSerialize: serialize_agentInterface_PackChunk,
    responseDeserialize: deserialize_agentInterface_PackChunk,
  },
  getGitPack: {
    path: '/agentInterface.Agent/GetGitPack',
    requestStream: true,
    responseStream: true,
    requestType: Agent_pb.PackChunk,
    responseType: Agent_pb.PackChunk,
    requestSerialize: serialize_agentInterface_PackChunk,
    requestDeserialize: deserialize_agentInterface_PackChunk,
    responseSerialize: serialize_agentInterface_PackChunk,
    responseDeserialize: deserialize_agentInterface_PackChunk,
  },
  scanVaults: {
    path: '/agentInterface.Agent/ScanVaults',
    requestStream: false,
    responseStream: true,
    requestType: Agent_pb.NodeIdMessage,
    responseType: Agent_pb.VaultListMessage,
    requestSerialize: serialize_agentInterface_NodeIdMessage,
    requestDeserialize: deserialize_agentInterface_NodeIdMessage,
    responseSerialize: serialize_agentInterface_VaultListMessage,
    responseDeserialize: deserialize_agentInterface_VaultListMessage,
  },
  getNodeDetails: {
    path: '/agentInterface.Agent/GetNodeDetails',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.EmptyMessage,
    responseType: Agent_pb.NodeDetailsMessage,
    requestSerialize: serialize_agentInterface_EmptyMessage,
    requestDeserialize: deserialize_agentInterface_EmptyMessage,
    responseSerialize: serialize_agentInterface_NodeDetailsMessage,
    responseDeserialize: deserialize_agentInterface_NodeDetailsMessage,
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
  getClaims: {
    path: '/agentInterface.Agent/GetClaims',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.ClaimTypeMessage,
    responseType: Agent_pb.ClaimsMessage,
    requestSerialize: serialize_agentInterface_ClaimTypeMessage,
    requestDeserialize: deserialize_agentInterface_ClaimTypeMessage,
    responseSerialize: serialize_agentInterface_ClaimsMessage,
    responseDeserialize: deserialize_agentInterface_ClaimsMessage,
  },
  getChainData: {
    path: '/agentInterface.Agent/GetChainData',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.EmptyMessage,
    responseType: Agent_pb.ChainDataMessage,
    requestSerialize: serialize_agentInterface_EmptyMessage,
    requestDeserialize: deserialize_agentInterface_EmptyMessage,
    responseSerialize: serialize_agentInterface_ChainDataMessage,
    responseDeserialize: deserialize_agentInterface_ChainDataMessage,
  },
  sendHolePunchMessage: {
    path: '/agentInterface.Agent/SendHolePunchMessage',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.RelayMessage,
    responseType: Agent_pb.EmptyMessage,
    requestSerialize: serialize_agentInterface_RelayMessage,
    requestDeserialize: deserialize_agentInterface_RelayMessage,
    responseSerialize: serialize_agentInterface_EmptyMessage,
    responseDeserialize: deserialize_agentInterface_EmptyMessage,
  },
  notificationsSend: {
    path: '/agentInterface.Agent/NotificationsSend',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.NotificationMessage,
    responseType: Agent_pb.EmptyMessage,
    requestSerialize: serialize_agentInterface_NotificationMessage,
    requestDeserialize: deserialize_agentInterface_NotificationMessage,
    responseSerialize: serialize_agentInterface_EmptyMessage,
    responseDeserialize: deserialize_agentInterface_EmptyMessage,
  },
  checkVaultPermisssions: {
    path: '/agentInterface.Agent/checkVaultPermisssions',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.VaultPermMessage,
    responseType: Agent_pb.PermissionMessage,
    requestSerialize: serialize_agentInterface_VaultPermMessage,
    requestDeserialize: deserialize_agentInterface_VaultPermMessage,
    responseSerialize: serialize_agentInterface_PermissionMessage,
    responseDeserialize: deserialize_agentInterface_PermissionMessage,
  },
};

exports.AgentClient = grpc.makeGenericClientConstructor(AgentService);
