// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var polykey_v1_utils_utils_pb = require('../../polykey/v1/utils/utils_pb.js');
var polykey_v1_nodes_nodes_pb = require('../../polykey/v1/nodes/nodes_pb.js');
var polykey_v1_vaults_vaults_pb = require('../../polykey/v1/vaults/vaults_pb.js');
var polykey_v1_notifications_notifications_pb = require('../../polykey/v1/notifications/notifications_pb.js');

function serialize_polykey_v1_nodes_ChainData(arg) {
  if (!(arg instanceof polykey_v1_nodes_nodes_pb.ChainData)) {
    throw new Error('Expected argument of type polykey.v1.nodes.ChainData');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_nodes_ChainData(buffer_arg) {
  return polykey_v1_nodes_nodes_pb.ChainData.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_nodes_ClaimType(arg) {
  if (!(arg instanceof polykey_v1_nodes_nodes_pb.ClaimType)) {
    throw new Error('Expected argument of type polykey.v1.nodes.ClaimType');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_nodes_ClaimType(buffer_arg) {
  return polykey_v1_nodes_nodes_pb.ClaimType.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_nodes_Claims(arg) {
  if (!(arg instanceof polykey_v1_nodes_nodes_pb.Claims)) {
    throw new Error('Expected argument of type polykey.v1.nodes.Claims');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_nodes_Claims(buffer_arg) {
  return polykey_v1_nodes_nodes_pb.Claims.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_nodes_CrossSign(arg) {
  if (!(arg instanceof polykey_v1_nodes_nodes_pb.CrossSign)) {
    throw new Error('Expected argument of type polykey.v1.nodes.CrossSign');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_nodes_CrossSign(buffer_arg) {
  return polykey_v1_nodes_nodes_pb.CrossSign.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_nodes_Node(arg) {
  if (!(arg instanceof polykey_v1_nodes_nodes_pb.Node)) {
    throw new Error('Expected argument of type polykey.v1.nodes.Node');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_nodes_Node(buffer_arg) {
  return polykey_v1_nodes_nodes_pb.Node.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_nodes_NodeTable(arg) {
  if (!(arg instanceof polykey_v1_nodes_nodes_pb.NodeTable)) {
    throw new Error('Expected argument of type polykey.v1.nodes.NodeTable');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_nodes_NodeTable(buffer_arg) {
  return polykey_v1_nodes_nodes_pb.NodeTable.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_nodes_Relay(arg) {
  if (!(arg instanceof polykey_v1_nodes_nodes_pb.Relay)) {
    throw new Error('Expected argument of type polykey.v1.nodes.Relay');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_nodes_Relay(buffer_arg) {
  return polykey_v1_nodes_nodes_pb.Relay.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_notifications_AgentNotification(arg) {
  if (!(arg instanceof polykey_v1_notifications_notifications_pb.AgentNotification)) {
    throw new Error('Expected argument of type polykey.v1.notifications.AgentNotification');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_notifications_AgentNotification(buffer_arg) {
  return polykey_v1_notifications_notifications_pb.AgentNotification.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_utils_EchoMessage(arg) {
  if (!(arg instanceof polykey_v1_utils_utils_pb.EchoMessage)) {
    throw new Error('Expected argument of type polykey.v1.utils.EchoMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_utils_EchoMessage(buffer_arg) {
  return polykey_v1_utils_utils_pb.EchoMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_utils_EmptyMessage(arg) {
  if (!(arg instanceof polykey_v1_utils_utils_pb.EmptyMessage)) {
    throw new Error('Expected argument of type polykey.v1.utils.EmptyMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_utils_EmptyMessage(buffer_arg) {
  return polykey_v1_utils_utils_pb.EmptyMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_vaults_NodePermission(arg) {
  if (!(arg instanceof polykey_v1_vaults_vaults_pb.NodePermission)) {
    throw new Error('Expected argument of type polykey.v1.vaults.NodePermission');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_vaults_NodePermission(buffer_arg) {
  return polykey_v1_vaults_vaults_pb.NodePermission.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_vaults_NodePermissionAllowed(arg) {
  if (!(arg instanceof polykey_v1_vaults_vaults_pb.NodePermissionAllowed)) {
    throw new Error('Expected argument of type polykey.v1.vaults.NodePermissionAllowed');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_vaults_NodePermissionAllowed(buffer_arg) {
  return polykey_v1_vaults_vaults_pb.NodePermissionAllowed.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_vaults_PackChunk(arg) {
  if (!(arg instanceof polykey_v1_vaults_vaults_pb.PackChunk)) {
    throw new Error('Expected argument of type polykey.v1.vaults.PackChunk');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_vaults_PackChunk(buffer_arg) {
  return polykey_v1_vaults_vaults_pb.PackChunk.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_vaults_Vault(arg) {
  if (!(arg instanceof polykey_v1_vaults_vaults_pb.Vault)) {
    throw new Error('Expected argument of type polykey.v1.vaults.Vault');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_vaults_Vault(buffer_arg) {
  return polykey_v1_vaults_vaults_pb.Vault.deserializeBinary(new Uint8Array(buffer_arg));
}


var AgentServiceService = exports.AgentServiceService = {
  // Echo
echo: {
    path: '/polykey.v1.AgentService/Echo',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_utils_utils_pb.EchoMessage,
    responseType: polykey_v1_utils_utils_pb.EchoMessage,
    requestSerialize: serialize_polykey_v1_utils_EchoMessage,
    requestDeserialize: deserialize_polykey_v1_utils_EchoMessage,
    responseSerialize: serialize_polykey_v1_utils_EchoMessage,
    responseDeserialize: deserialize_polykey_v1_utils_EchoMessage,
  },
  // Vaults
vaultsGitInfoGet: {
    path: '/polykey.v1.AgentService/VaultsGitInfoGet',
    requestStream: false,
    responseStream: true,
    requestType: polykey_v1_vaults_vaults_pb.Vault,
    responseType: polykey_v1_vaults_vaults_pb.PackChunk,
    requestSerialize: serialize_polykey_v1_vaults_Vault,
    requestDeserialize: deserialize_polykey_v1_vaults_Vault,
    responseSerialize: serialize_polykey_v1_vaults_PackChunk,
    responseDeserialize: deserialize_polykey_v1_vaults_PackChunk,
  },
  vaultsGitPackGet: {
    path: '/polykey.v1.AgentService/VaultsGitPackGet',
    requestStream: true,
    responseStream: true,
    requestType: polykey_v1_vaults_vaults_pb.PackChunk,
    responseType: polykey_v1_vaults_vaults_pb.PackChunk,
    requestSerialize: serialize_polykey_v1_vaults_PackChunk,
    requestDeserialize: deserialize_polykey_v1_vaults_PackChunk,
    responseSerialize: serialize_polykey_v1_vaults_PackChunk,
    responseDeserialize: deserialize_polykey_v1_vaults_PackChunk,
  },
  vaultsScan: {
    path: '/polykey.v1.AgentService/VaultsScan',
    requestStream: false,
    responseStream: true,
    requestType: polykey_v1_nodes_nodes_pb.Node,
    responseType: polykey_v1_vaults_vaults_pb.Vault,
    requestSerialize: serialize_polykey_v1_nodes_Node,
    requestDeserialize: deserialize_polykey_v1_nodes_Node,
    responseSerialize: serialize_polykey_v1_vaults_Vault,
    responseDeserialize: deserialize_polykey_v1_vaults_Vault,
  },
  vaultsPermisssionsCheck: {
    path: '/polykey.v1.AgentService/VaultsPermisssionsCheck',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_vaults_vaults_pb.NodePermission,
    responseType: polykey_v1_vaults_vaults_pb.NodePermissionAllowed,
    requestSerialize: serialize_polykey_v1_vaults_NodePermission,
    requestDeserialize: deserialize_polykey_v1_vaults_NodePermission,
    responseSerialize: serialize_polykey_v1_vaults_NodePermissionAllowed,
    responseDeserialize: deserialize_polykey_v1_vaults_NodePermissionAllowed,
  },
  // Nodes
nodesClosestLocalNodesGet: {
    path: '/polykey.v1.AgentService/NodesClosestLocalNodesGet',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_nodes_nodes_pb.Node,
    responseType: polykey_v1_nodes_nodes_pb.NodeTable,
    requestSerialize: serialize_polykey_v1_nodes_Node,
    requestDeserialize: deserialize_polykey_v1_nodes_Node,
    responseSerialize: serialize_polykey_v1_nodes_NodeTable,
    responseDeserialize: deserialize_polykey_v1_nodes_NodeTable,
  },
  nodesClaimsGet: {
    path: '/polykey.v1.AgentService/NodesClaimsGet',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_nodes_nodes_pb.ClaimType,
    responseType: polykey_v1_nodes_nodes_pb.Claims,
    requestSerialize: serialize_polykey_v1_nodes_ClaimType,
    requestDeserialize: deserialize_polykey_v1_nodes_ClaimType,
    responseSerialize: serialize_polykey_v1_nodes_Claims,
    responseDeserialize: deserialize_polykey_v1_nodes_Claims,
  },
  nodesChainDataGet: {
    path: '/polykey.v1.AgentService/NodesChainDataGet',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_utils_utils_pb.EmptyMessage,
    responseType: polykey_v1_nodes_nodes_pb.ChainData,
    requestSerialize: serialize_polykey_v1_utils_EmptyMessage,
    requestDeserialize: deserialize_polykey_v1_utils_EmptyMessage,
    responseSerialize: serialize_polykey_v1_nodes_ChainData,
    responseDeserialize: deserialize_polykey_v1_nodes_ChainData,
  },
  nodesHolePunchMessageSend: {
    path: '/polykey.v1.AgentService/NodesHolePunchMessageSend',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_nodes_nodes_pb.Relay,
    responseType: polykey_v1_utils_utils_pb.EmptyMessage,
    requestSerialize: serialize_polykey_v1_nodes_Relay,
    requestDeserialize: deserialize_polykey_v1_nodes_Relay,
    responseSerialize: serialize_polykey_v1_utils_EmptyMessage,
    responseDeserialize: deserialize_polykey_v1_utils_EmptyMessage,
  },
  nodesCrossSignClaim: {
    path: '/polykey.v1.AgentService/NodesCrossSignClaim',
    requestStream: true,
    responseStream: true,
    requestType: polykey_v1_nodes_nodes_pb.CrossSign,
    responseType: polykey_v1_nodes_nodes_pb.CrossSign,
    requestSerialize: serialize_polykey_v1_nodes_CrossSign,
    requestDeserialize: deserialize_polykey_v1_nodes_CrossSign,
    responseSerialize: serialize_polykey_v1_nodes_CrossSign,
    responseDeserialize: deserialize_polykey_v1_nodes_CrossSign,
  },
  // Notifications
notificationsSend: {
    path: '/polykey.v1.AgentService/NotificationsSend',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_notifications_notifications_pb.AgentNotification,
    responseType: polykey_v1_utils_utils_pb.EmptyMessage,
    requestSerialize: serialize_polykey_v1_notifications_AgentNotification,
    requestDeserialize: deserialize_polykey_v1_notifications_AgentNotification,
    responseSerialize: serialize_polykey_v1_utils_EmptyMessage,
    responseDeserialize: deserialize_polykey_v1_utils_EmptyMessage,
  },
};

exports.AgentServiceClient = grpc.makeGenericClientConstructor(AgentServiceService);
