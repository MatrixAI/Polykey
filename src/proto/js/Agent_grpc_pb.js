// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var Common_pb = require('./Common_pb.js');
var Nodes_pb = require('./Nodes_pb.js');
var Vaults_pb = require('./Vaults_pb.js');
var Notifications_pb = require('./Notifications_pb.js');

function serialize_common_EchoMessage(arg) {
  if (!(arg instanceof Common_pb.EchoMessage)) {
    throw new Error('Expected argument of type common.EchoMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_common_EchoMessage(buffer_arg) {
  return Common_pb.EchoMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_common_EmptyMessage(arg) {
  if (!(arg instanceof Common_pb.EmptyMessage)) {
    throw new Error('Expected argument of type common.EmptyMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_common_EmptyMessage(buffer_arg) {
  return Common_pb.EmptyMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_node_ChainData(arg) {
  if (!(arg instanceof Nodes_pb.ChainData)) {
    throw new Error('Expected argument of type node.ChainData');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_node_ChainData(buffer_arg) {
  return Nodes_pb.ChainData.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_node_ClaimType(arg) {
  if (!(arg instanceof Nodes_pb.ClaimType)) {
    throw new Error('Expected argument of type node.ClaimType');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_node_ClaimType(buffer_arg) {
  return Nodes_pb.ClaimType.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_node_Claims(arg) {
  if (!(arg instanceof Nodes_pb.Claims)) {
    throw new Error('Expected argument of type node.Claims');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_node_Claims(buffer_arg) {
  return Nodes_pb.Claims.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_node_CrossSign(arg) {
  if (!(arg instanceof Nodes_pb.CrossSign)) {
    throw new Error('Expected argument of type node.CrossSign');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_node_CrossSign(buffer_arg) {
  return Nodes_pb.CrossSign.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_node_Node(arg) {
  if (!(arg instanceof Nodes_pb.Node)) {
    throw new Error('Expected argument of type node.Node');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_node_Node(buffer_arg) {
  return Nodes_pb.Node.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_node_NodeTable(arg) {
  if (!(arg instanceof Nodes_pb.NodeTable)) {
    throw new Error('Expected argument of type node.NodeTable');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_node_NodeTable(buffer_arg) {
  return Nodes_pb.NodeTable.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_node_Relay(arg) {
  if (!(arg instanceof Nodes_pb.Relay)) {
    throw new Error('Expected argument of type node.Relay');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_node_Relay(buffer_arg) {
  return Nodes_pb.Relay.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_notification_AgentNotification(arg) {
  if (!(arg instanceof Notifications_pb.AgentNotification)) {
    throw new Error('Expected argument of type notification.AgentNotification');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_notification_AgentNotification(buffer_arg) {
  return Notifications_pb.AgentNotification.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_vault_NodePermission(arg) {
  if (!(arg instanceof Vaults_pb.NodePermission)) {
    throw new Error('Expected argument of type vault.NodePermission');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_vault_NodePermission(buffer_arg) {
  return Vaults_pb.NodePermission.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_vault_NodePermissionAllowed(arg) {
  if (!(arg instanceof Vaults_pb.NodePermissionAllowed)) {
    throw new Error('Expected argument of type vault.NodePermissionAllowed');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_vault_NodePermissionAllowed(buffer_arg) {
  return Vaults_pb.NodePermissionAllowed.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_vault_PackChunk(arg) {
  if (!(arg instanceof Vaults_pb.PackChunk)) {
    throw new Error('Expected argument of type vault.PackChunk');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_vault_PackChunk(buffer_arg) {
  return Vaults_pb.PackChunk.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_vault_Vault(arg) {
  if (!(arg instanceof Vaults_pb.Vault)) {
    throw new Error('Expected argument of type vault.Vault');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_vault_Vault(buffer_arg) {
  return Vaults_pb.Vault.deserializeBinary(new Uint8Array(buffer_arg));
}


var AgentService = exports.AgentService = {
  // Echo
echo: {
    path: '/agentInterface.Agent/Echo',
    requestStream: false,
    responseStream: false,
    requestType: Common_pb.EchoMessage,
    responseType: Common_pb.EchoMessage,
    requestSerialize: serialize_common_EchoMessage,
    requestDeserialize: deserialize_common_EchoMessage,
    responseSerialize: serialize_common_EchoMessage,
    responseDeserialize: deserialize_common_EchoMessage,
  },
  // Vaults
vaultsGitInfoGet: {
    path: '/agentInterface.Agent/VaultsGitInfoGet',
    requestStream: false,
    responseStream: true,
    requestType: Vaults_pb.Vault,
    responseType: Vaults_pb.PackChunk,
    requestSerialize: serialize_vault_Vault,
    requestDeserialize: deserialize_vault_Vault,
    responseSerialize: serialize_vault_PackChunk,
    responseDeserialize: deserialize_vault_PackChunk,
  },
  vaultsGitPackGet: {
    path: '/agentInterface.Agent/VaultsGitPackGet',
    requestStream: true,
    responseStream: true,
    requestType: Vaults_pb.PackChunk,
    responseType: Vaults_pb.PackChunk,
    requestSerialize: serialize_vault_PackChunk,
    requestDeserialize: deserialize_vault_PackChunk,
    responseSerialize: serialize_vault_PackChunk,
    responseDeserialize: deserialize_vault_PackChunk,
  },
  vaultsScan: {
    path: '/agentInterface.Agent/VaultsScan',
    requestStream: false,
    responseStream: true,
    requestType: Nodes_pb.Node,
    responseType: Vaults_pb.Vault,
    requestSerialize: serialize_node_Node,
    requestDeserialize: deserialize_node_Node,
    responseSerialize: serialize_vault_Vault,
    responseDeserialize: deserialize_vault_Vault,
  },
  vaultsPermisssionsCheck: {
    path: '/agentInterface.Agent/VaultsPermisssionsCheck',
    requestStream: false,
    responseStream: false,
    requestType: Vaults_pb.NodePermission,
    responseType: Vaults_pb.NodePermissionAllowed,
    requestSerialize: serialize_vault_NodePermission,
    requestDeserialize: deserialize_vault_NodePermission,
    responseSerialize: serialize_vault_NodePermissionAllowed,
    responseDeserialize: deserialize_vault_NodePermissionAllowed,
  },
  // Nodes
nodesClosestLocalNodesGet: {
    path: '/agentInterface.Agent/NodesClosestLocalNodesGet',
    requestStream: false,
    responseStream: false,
    requestType: Nodes_pb.Node,
    responseType: Nodes_pb.NodeTable,
    requestSerialize: serialize_node_Node,
    requestDeserialize: deserialize_node_Node,
    responseSerialize: serialize_node_NodeTable,
    responseDeserialize: deserialize_node_NodeTable,
  },
  nodesClaimsGet: {
    path: '/agentInterface.Agent/NodesClaimsGet',
    requestStream: false,
    responseStream: false,
    requestType: Nodes_pb.ClaimType,
    responseType: Nodes_pb.Claims,
    requestSerialize: serialize_node_ClaimType,
    requestDeserialize: deserialize_node_ClaimType,
    responseSerialize: serialize_node_Claims,
    responseDeserialize: deserialize_node_Claims,
  },
  nodesChainDataGet: {
    path: '/agentInterface.Agent/NodesChainDataGet',
    requestStream: false,
    responseStream: false,
    requestType: Common_pb.EmptyMessage,
    responseType: Nodes_pb.ChainData,
    requestSerialize: serialize_common_EmptyMessage,
    requestDeserialize: deserialize_common_EmptyMessage,
    responseSerialize: serialize_node_ChainData,
    responseDeserialize: deserialize_node_ChainData,
  },
  nodesHolePunchMessageSend: {
    path: '/agentInterface.Agent/NodesHolePunchMessageSend',
    requestStream: false,
    responseStream: false,
    requestType: Nodes_pb.Relay,
    responseType: Common_pb.EmptyMessage,
    requestSerialize: serialize_node_Relay,
    requestDeserialize: deserialize_node_Relay,
    responseSerialize: serialize_common_EmptyMessage,
    responseDeserialize: deserialize_common_EmptyMessage,
  },
  nodesCrossSignClaim: {
    path: '/agentInterface.Agent/NodesCrossSignClaim',
    requestStream: true,
    responseStream: true,
    requestType: Nodes_pb.CrossSign,
    responseType: Nodes_pb.CrossSign,
    requestSerialize: serialize_node_CrossSign,
    requestDeserialize: deserialize_node_CrossSign,
    responseSerialize: serialize_node_CrossSign,
    responseDeserialize: deserialize_node_CrossSign,
  },
  // Notifications
notificationsSend: {
    path: '/agentInterface.Agent/NotificationsSend',
    requestStream: false,
    responseStream: false,
    requestType: Notifications_pb.AgentNotification,
    responseType: Common_pb.EmptyMessage,
    requestSerialize: serialize_notification_AgentNotification,
    requestDeserialize: deserialize_notification_AgentNotification,
    responseSerialize: serialize_common_EmptyMessage,
    responseDeserialize: deserialize_common_EmptyMessage,
  },
};

exports.AgentClient = grpc.makeGenericClientConstructor(AgentService);
