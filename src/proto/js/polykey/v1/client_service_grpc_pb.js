// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var polykey_v1_agent_agent_pb = require('../../polykey/v1/agent/agent_pb.js');
var polykey_v1_gestalts_gestalts_pb = require('../../polykey/v1/gestalts/gestalts_pb.js');
var polykey_v1_identities_identities_pb = require('../../polykey/v1/identities/identities_pb.js');
var polykey_v1_keys_keys_pb = require('../../polykey/v1/keys/keys_pb.js');
var polykey_v1_nodes_nodes_pb = require('../../polykey/v1/nodes/nodes_pb.js');
var polykey_v1_notifications_notifications_pb = require('../../polykey/v1/notifications/notifications_pb.js');
var polykey_v1_permissions_permissions_pb = require('../../polykey/v1/permissions/permissions_pb.js');
var polykey_v1_secrets_secrets_pb = require('../../polykey/v1/secrets/secrets_pb.js');
var polykey_v1_sessions_sessions_pb = require('../../polykey/v1/sessions/sessions_pb.js');
var polykey_v1_vaults_vaults_pb = require('../../polykey/v1/vaults/vaults_pb.js');
var polykey_v1_utils_utils_pb = require('../../polykey/v1/utils/utils_pb.js');

function serialize_polykey_v1_agent_InfoMessage(arg) {
  if (!(arg instanceof polykey_v1_agent_agent_pb.InfoMessage)) {
    throw new Error('Expected argument of type polykey.v1.agent.InfoMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_agent_InfoMessage(buffer_arg) {
  return polykey_v1_agent_agent_pb.InfoMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_gestalts_Gestalt(arg) {
  if (!(arg instanceof polykey_v1_gestalts_gestalts_pb.Gestalt)) {
    throw new Error('Expected argument of type polykey.v1.gestalts.Gestalt');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_gestalts_Gestalt(buffer_arg) {
  return polykey_v1_gestalts_gestalts_pb.Gestalt.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_gestalts_Graph(arg) {
  if (!(arg instanceof polykey_v1_gestalts_gestalts_pb.Graph)) {
    throw new Error('Expected argument of type polykey.v1.gestalts.Graph');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_gestalts_Graph(buffer_arg) {
  return polykey_v1_gestalts_gestalts_pb.Graph.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_identities_Info(arg) {
  if (!(arg instanceof polykey_v1_identities_identities_pb.Info)) {
    throw new Error('Expected argument of type polykey.v1.identities.Info');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_identities_Info(buffer_arg) {
  return polykey_v1_identities_identities_pb.Info.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_identities_Provider(arg) {
  if (!(arg instanceof polykey_v1_identities_identities_pb.Provider)) {
    throw new Error('Expected argument of type polykey.v1.identities.Provider');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_identities_Provider(buffer_arg) {
  return polykey_v1_identities_identities_pb.Provider.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_identities_ProviderSearch(arg) {
  if (!(arg instanceof polykey_v1_identities_identities_pb.ProviderSearch)) {
    throw new Error('Expected argument of type polykey.v1.identities.ProviderSearch');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_identities_ProviderSearch(buffer_arg) {
  return polykey_v1_identities_identities_pb.ProviderSearch.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_identities_Token(arg) {
  if (!(arg instanceof polykey_v1_identities_identities_pb.Token)) {
    throw new Error('Expected argument of type polykey.v1.identities.Token');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_identities_Token(buffer_arg) {
  return polykey_v1_identities_identities_pb.Token.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_identities_TokenSpecific(arg) {
  if (!(arg instanceof polykey_v1_identities_identities_pb.TokenSpecific)) {
    throw new Error('Expected argument of type polykey.v1.identities.TokenSpecific');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_identities_TokenSpecific(buffer_arg) {
  return polykey_v1_identities_identities_pb.TokenSpecific.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_keys_Certificate(arg) {
  if (!(arg instanceof polykey_v1_keys_keys_pb.Certificate)) {
    throw new Error('Expected argument of type polykey.v1.keys.Certificate');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_keys_Certificate(buffer_arg) {
  return polykey_v1_keys_keys_pb.Certificate.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_keys_Crypto(arg) {
  if (!(arg instanceof polykey_v1_keys_keys_pb.Crypto)) {
    throw new Error('Expected argument of type polykey.v1.keys.Crypto');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_keys_Crypto(buffer_arg) {
  return polykey_v1_keys_keys_pb.Crypto.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_keys_Key(arg) {
  if (!(arg instanceof polykey_v1_keys_keys_pb.Key)) {
    throw new Error('Expected argument of type polykey.v1.keys.Key');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_keys_Key(buffer_arg) {
  return polykey_v1_keys_keys_pb.Key.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_keys_KeyPair(arg) {
  if (!(arg instanceof polykey_v1_keys_keys_pb.KeyPair)) {
    throw new Error('Expected argument of type polykey.v1.keys.KeyPair');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_keys_KeyPair(buffer_arg) {
  return polykey_v1_keys_keys_pb.KeyPair.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_nodes_Claim(arg) {
  if (!(arg instanceof polykey_v1_nodes_nodes_pb.Claim)) {
    throw new Error('Expected argument of type polykey.v1.nodes.Claim');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_nodes_Claim(buffer_arg) {
  return polykey_v1_nodes_nodes_pb.Claim.deserializeBinary(new Uint8Array(buffer_arg));
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

function serialize_polykey_v1_nodes_NodeAddress(arg) {
  if (!(arg instanceof polykey_v1_nodes_nodes_pb.NodeAddress)) {
    throw new Error('Expected argument of type polykey.v1.nodes.NodeAddress');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_nodes_NodeAddress(buffer_arg) {
  return polykey_v1_nodes_nodes_pb.NodeAddress.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_notifications_List(arg) {
  if (!(arg instanceof polykey_v1_notifications_notifications_pb.List)) {
    throw new Error('Expected argument of type polykey.v1.notifications.List');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_notifications_List(buffer_arg) {
  return polykey_v1_notifications_notifications_pb.List.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_notifications_Read(arg) {
  if (!(arg instanceof polykey_v1_notifications_notifications_pb.Read)) {
    throw new Error('Expected argument of type polykey.v1.notifications.Read');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_notifications_Read(buffer_arg) {
  return polykey_v1_notifications_notifications_pb.Read.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_notifications_Send(arg) {
  if (!(arg instanceof polykey_v1_notifications_notifications_pb.Send)) {
    throw new Error('Expected argument of type polykey.v1.notifications.Send');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_notifications_Send(buffer_arg) {
  return polykey_v1_notifications_notifications_pb.Send.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_permissions_ActionSet(arg) {
  if (!(arg instanceof polykey_v1_permissions_permissions_pb.ActionSet)) {
    throw new Error('Expected argument of type polykey.v1.permissions.ActionSet');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_permissions_ActionSet(buffer_arg) {
  return polykey_v1_permissions_permissions_pb.ActionSet.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_permissions_Actions(arg) {
  if (!(arg instanceof polykey_v1_permissions_permissions_pb.Actions)) {
    throw new Error('Expected argument of type polykey.v1.permissions.Actions');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_permissions_Actions(buffer_arg) {
  return polykey_v1_permissions_permissions_pb.Actions.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_secrets_Directory(arg) {
  if (!(arg instanceof polykey_v1_secrets_secrets_pb.Directory)) {
    throw new Error('Expected argument of type polykey.v1.secrets.Directory');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_secrets_Directory(buffer_arg) {
  return polykey_v1_secrets_secrets_pb.Directory.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_secrets_Rename(arg) {
  if (!(arg instanceof polykey_v1_secrets_secrets_pb.Rename)) {
    throw new Error('Expected argument of type polykey.v1.secrets.Rename');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_secrets_Rename(buffer_arg) {
  return polykey_v1_secrets_secrets_pb.Rename.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_secrets_Secret(arg) {
  if (!(arg instanceof polykey_v1_secrets_secrets_pb.Secret)) {
    throw new Error('Expected argument of type polykey.v1.secrets.Secret');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_secrets_Secret(buffer_arg) {
  return polykey_v1_secrets_secrets_pb.Secret.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_sessions_Password(arg) {
  if (!(arg instanceof polykey_v1_sessions_sessions_pb.Password)) {
    throw new Error('Expected argument of type polykey.v1.sessions.Password');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_sessions_Password(buffer_arg) {
  return polykey_v1_sessions_sessions_pb.Password.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_sessions_Token(arg) {
  if (!(arg instanceof polykey_v1_sessions_sessions_pb.Token)) {
    throw new Error('Expected argument of type polykey.v1.sessions.Token');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_sessions_Token(buffer_arg) {
  return polykey_v1_sessions_sessions_pb.Token.deserializeBinary(new Uint8Array(buffer_arg));
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

function serialize_polykey_v1_utils_StatusMessage(arg) {
  if (!(arg instanceof polykey_v1_utils_utils_pb.StatusMessage)) {
    throw new Error('Expected argument of type polykey.v1.utils.StatusMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_utils_StatusMessage(buffer_arg) {
  return polykey_v1_utils_utils_pb.StatusMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_vaults_Clone(arg) {
  if (!(arg instanceof polykey_v1_vaults_vaults_pb.Clone)) {
    throw new Error('Expected argument of type polykey.v1.vaults.Clone');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_vaults_Clone(buffer_arg) {
  return polykey_v1_vaults_vaults_pb.Clone.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_vaults_List(arg) {
  if (!(arg instanceof polykey_v1_vaults_vaults_pb.List)) {
    throw new Error('Expected argument of type polykey.v1.vaults.List');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_vaults_List(buffer_arg) {
  return polykey_v1_vaults_vaults_pb.List.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_vaults_Log(arg) {
  if (!(arg instanceof polykey_v1_vaults_vaults_pb.Log)) {
    throw new Error('Expected argument of type polykey.v1.vaults.Log');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_vaults_Log(buffer_arg) {
  return polykey_v1_vaults_vaults_pb.Log.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_vaults_LogEntry(arg) {
  if (!(arg instanceof polykey_v1_vaults_vaults_pb.LogEntry)) {
    throw new Error('Expected argument of type polykey.v1.vaults.LogEntry');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_vaults_LogEntry(buffer_arg) {
  return polykey_v1_vaults_vaults_pb.LogEntry.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_vaults_Mkdir(arg) {
  if (!(arg instanceof polykey_v1_vaults_vaults_pb.Mkdir)) {
    throw new Error('Expected argument of type polykey.v1.vaults.Mkdir');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_vaults_Mkdir(buffer_arg) {
  return polykey_v1_vaults_vaults_pb.Mkdir.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_vaults_PermGet(arg) {
  if (!(arg instanceof polykey_v1_vaults_vaults_pb.PermGet)) {
    throw new Error('Expected argument of type polykey.v1.vaults.PermGet');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_vaults_PermGet(buffer_arg) {
  return polykey_v1_vaults_vaults_pb.PermGet.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_vaults_PermSet(arg) {
  if (!(arg instanceof polykey_v1_vaults_vaults_pb.PermSet)) {
    throw new Error('Expected argument of type polykey.v1.vaults.PermSet');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_vaults_PermSet(buffer_arg) {
  return polykey_v1_vaults_vaults_pb.PermSet.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_vaults_PermUnset(arg) {
  if (!(arg instanceof polykey_v1_vaults_vaults_pb.PermUnset)) {
    throw new Error('Expected argument of type polykey.v1.vaults.PermUnset');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_vaults_PermUnset(buffer_arg) {
  return polykey_v1_vaults_vaults_pb.PermUnset.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_vaults_Permission(arg) {
  if (!(arg instanceof polykey_v1_vaults_vaults_pb.Permission)) {
    throw new Error('Expected argument of type polykey.v1.vaults.Permission');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_vaults_Permission(buffer_arg) {
  return polykey_v1_vaults_vaults_pb.Permission.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_vaults_Pull(arg) {
  if (!(arg instanceof polykey_v1_vaults_vaults_pb.Pull)) {
    throw new Error('Expected argument of type polykey.v1.vaults.Pull');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_vaults_Pull(buffer_arg) {
  return polykey_v1_vaults_vaults_pb.Pull.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_vaults_Rename(arg) {
  if (!(arg instanceof polykey_v1_vaults_vaults_pb.Rename)) {
    throw new Error('Expected argument of type polykey.v1.vaults.Rename');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_vaults_Rename(buffer_arg) {
  return polykey_v1_vaults_vaults_pb.Rename.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_vaults_Stat(arg) {
  if (!(arg instanceof polykey_v1_vaults_vaults_pb.Stat)) {
    throw new Error('Expected argument of type polykey.v1.vaults.Stat');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_vaults_Stat(buffer_arg) {
  return polykey_v1_vaults_vaults_pb.Stat.deserializeBinary(new Uint8Array(buffer_arg));
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

function serialize_polykey_v1_vaults_Version(arg) {
  if (!(arg instanceof polykey_v1_vaults_vaults_pb.Version)) {
    throw new Error('Expected argument of type polykey.v1.vaults.Version');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_vaults_Version(buffer_arg) {
  return polykey_v1_vaults_vaults_pb.Version.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_polykey_v1_vaults_VersionResult(arg) {
  if (!(arg instanceof polykey_v1_vaults_vaults_pb.VersionResult)) {
    throw new Error('Expected argument of type polykey.v1.vaults.VersionResult');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_vaults_VersionResult(buffer_arg) {
  return polykey_v1_vaults_vaults_pb.VersionResult.deserializeBinary(new Uint8Array(buffer_arg));
}


var ClientServiceService = exports.ClientServiceService = {
  // Agent
agentStatus: {
    path: '/polykey.v1.ClientService/AgentStatus',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_utils_utils_pb.EmptyMessage,
    responseType: polykey_v1_agent_agent_pb.InfoMessage,
    requestSerialize: serialize_polykey_v1_utils_EmptyMessage,
    requestDeserialize: deserialize_polykey_v1_utils_EmptyMessage,
    responseSerialize: serialize_polykey_v1_agent_InfoMessage,
    responseDeserialize: deserialize_polykey_v1_agent_InfoMessage,
  },
  agentStop: {
    path: '/polykey.v1.ClientService/AgentStop',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_utils_utils_pb.EmptyMessage,
    responseType: polykey_v1_utils_utils_pb.EmptyMessage,
    requestSerialize: serialize_polykey_v1_utils_EmptyMessage,
    requestDeserialize: deserialize_polykey_v1_utils_EmptyMessage,
    responseSerialize: serialize_polykey_v1_utils_EmptyMessage,
    responseDeserialize: deserialize_polykey_v1_utils_EmptyMessage,
  },
  // Session
sessionsUnlock: {
    path: '/polykey.v1.ClientService/SessionsUnlock',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_sessions_sessions_pb.Password,
    responseType: polykey_v1_sessions_sessions_pb.Token,
    requestSerialize: serialize_polykey_v1_sessions_Password,
    requestDeserialize: deserialize_polykey_v1_sessions_Password,
    responseSerialize: serialize_polykey_v1_sessions_Token,
    responseDeserialize: deserialize_polykey_v1_sessions_Token,
  },
  sessionsRefresh: {
    path: '/polykey.v1.ClientService/SessionsRefresh',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_utils_utils_pb.EmptyMessage,
    responseType: polykey_v1_sessions_sessions_pb.Token,
    requestSerialize: serialize_polykey_v1_utils_EmptyMessage,
    requestDeserialize: deserialize_polykey_v1_utils_EmptyMessage,
    responseSerialize: serialize_polykey_v1_sessions_Token,
    responseDeserialize: deserialize_polykey_v1_sessions_Token,
  },
  sessionsLockAll: {
    path: '/polykey.v1.ClientService/SessionsLockAll',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_utils_utils_pb.EmptyMessage,
    responseType: polykey_v1_utils_utils_pb.StatusMessage,
    requestSerialize: serialize_polykey_v1_utils_EmptyMessage,
    requestDeserialize: deserialize_polykey_v1_utils_EmptyMessage,
    responseSerialize: serialize_polykey_v1_utils_StatusMessage,
    responseDeserialize: deserialize_polykey_v1_utils_StatusMessage,
  },
  // Nodes
nodesAdd: {
    path: '/polykey.v1.ClientService/NodesAdd',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_nodes_nodes_pb.NodeAddress,
    responseType: polykey_v1_utils_utils_pb.EmptyMessage,
    requestSerialize: serialize_polykey_v1_nodes_NodeAddress,
    requestDeserialize: deserialize_polykey_v1_nodes_NodeAddress,
    responseSerialize: serialize_polykey_v1_utils_EmptyMessage,
    responseDeserialize: deserialize_polykey_v1_utils_EmptyMessage,
  },
  nodesPing: {
    path: '/polykey.v1.ClientService/NodesPing',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_nodes_nodes_pb.Node,
    responseType: polykey_v1_utils_utils_pb.StatusMessage,
    requestSerialize: serialize_polykey_v1_nodes_Node,
    requestDeserialize: deserialize_polykey_v1_nodes_Node,
    responseSerialize: serialize_polykey_v1_utils_StatusMessage,
    responseDeserialize: deserialize_polykey_v1_utils_StatusMessage,
  },
  nodesClaim: {
    path: '/polykey.v1.ClientService/NodesClaim',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_nodes_nodes_pb.Claim,
    responseType: polykey_v1_utils_utils_pb.StatusMessage,
    requestSerialize: serialize_polykey_v1_nodes_Claim,
    requestDeserialize: deserialize_polykey_v1_nodes_Claim,
    responseSerialize: serialize_polykey_v1_utils_StatusMessage,
    responseDeserialize: deserialize_polykey_v1_utils_StatusMessage,
  },
  nodesFind: {
    path: '/polykey.v1.ClientService/NodesFind',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_nodes_nodes_pb.Node,
    responseType: polykey_v1_nodes_nodes_pb.NodeAddress,
    requestSerialize: serialize_polykey_v1_nodes_Node,
    requestDeserialize: deserialize_polykey_v1_nodes_Node,
    responseSerialize: serialize_polykey_v1_nodes_NodeAddress,
    responseDeserialize: deserialize_polykey_v1_nodes_NodeAddress,
  },
  // Keys
keysKeyPairRoot: {
    path: '/polykey.v1.ClientService/KeysKeyPairRoot',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_utils_utils_pb.EmptyMessage,
    responseType: polykey_v1_keys_keys_pb.KeyPair,
    requestSerialize: serialize_polykey_v1_utils_EmptyMessage,
    requestDeserialize: deserialize_polykey_v1_utils_EmptyMessage,
    responseSerialize: serialize_polykey_v1_keys_KeyPair,
    responseDeserialize: deserialize_polykey_v1_keys_KeyPair,
  },
  keysKeyPairReset: {
    path: '/polykey.v1.ClientService/KeysKeyPairReset',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_keys_keys_pb.Key,
    responseType: polykey_v1_utils_utils_pb.EmptyMessage,
    requestSerialize: serialize_polykey_v1_keys_Key,
    requestDeserialize: deserialize_polykey_v1_keys_Key,
    responseSerialize: serialize_polykey_v1_utils_EmptyMessage,
    responseDeserialize: deserialize_polykey_v1_utils_EmptyMessage,
  },
  keysKeyPairRenew: {
    path: '/polykey.v1.ClientService/KeysKeyPairRenew',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_keys_keys_pb.Key,
    responseType: polykey_v1_utils_utils_pb.EmptyMessage,
    requestSerialize: serialize_polykey_v1_keys_Key,
    requestDeserialize: deserialize_polykey_v1_keys_Key,
    responseSerialize: serialize_polykey_v1_utils_EmptyMessage,
    responseDeserialize: deserialize_polykey_v1_utils_EmptyMessage,
  },
  keysEncrypt: {
    path: '/polykey.v1.ClientService/KeysEncrypt',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_keys_keys_pb.Crypto,
    responseType: polykey_v1_keys_keys_pb.Crypto,
    requestSerialize: serialize_polykey_v1_keys_Crypto,
    requestDeserialize: deserialize_polykey_v1_keys_Crypto,
    responseSerialize: serialize_polykey_v1_keys_Crypto,
    responseDeserialize: deserialize_polykey_v1_keys_Crypto,
  },
  keysDecrypt: {
    path: '/polykey.v1.ClientService/KeysDecrypt',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_keys_keys_pb.Crypto,
    responseType: polykey_v1_keys_keys_pb.Crypto,
    requestSerialize: serialize_polykey_v1_keys_Crypto,
    requestDeserialize: deserialize_polykey_v1_keys_Crypto,
    responseSerialize: serialize_polykey_v1_keys_Crypto,
    responseDeserialize: deserialize_polykey_v1_keys_Crypto,
  },
  keysSign: {
    path: '/polykey.v1.ClientService/KeysSign',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_keys_keys_pb.Crypto,
    responseType: polykey_v1_keys_keys_pb.Crypto,
    requestSerialize: serialize_polykey_v1_keys_Crypto,
    requestDeserialize: deserialize_polykey_v1_keys_Crypto,
    responseSerialize: serialize_polykey_v1_keys_Crypto,
    responseDeserialize: deserialize_polykey_v1_keys_Crypto,
  },
  keysVerify: {
    path: '/polykey.v1.ClientService/KeysVerify',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_keys_keys_pb.Crypto,
    responseType: polykey_v1_utils_utils_pb.StatusMessage,
    requestSerialize: serialize_polykey_v1_keys_Crypto,
    requestDeserialize: deserialize_polykey_v1_keys_Crypto,
    responseSerialize: serialize_polykey_v1_utils_StatusMessage,
    responseDeserialize: deserialize_polykey_v1_utils_StatusMessage,
  },
  keysPasswordChange: {
    path: '/polykey.v1.ClientService/KeysPasswordChange',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_sessions_sessions_pb.Password,
    responseType: polykey_v1_utils_utils_pb.EmptyMessage,
    requestSerialize: serialize_polykey_v1_sessions_Password,
    requestDeserialize: deserialize_polykey_v1_sessions_Password,
    responseSerialize: serialize_polykey_v1_utils_EmptyMessage,
    responseDeserialize: deserialize_polykey_v1_utils_EmptyMessage,
  },
  keysCertsGet: {
    path: '/polykey.v1.ClientService/KeysCertsGet',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_utils_utils_pb.EmptyMessage,
    responseType: polykey_v1_keys_keys_pb.Certificate,
    requestSerialize: serialize_polykey_v1_utils_EmptyMessage,
    requestDeserialize: deserialize_polykey_v1_utils_EmptyMessage,
    responseSerialize: serialize_polykey_v1_keys_Certificate,
    responseDeserialize: deserialize_polykey_v1_keys_Certificate,
  },
  keysCertsChainGet: {
    path: '/polykey.v1.ClientService/KeysCertsChainGet',
    requestStream: false,
    responseStream: true,
    requestType: polykey_v1_utils_utils_pb.EmptyMessage,
    responseType: polykey_v1_keys_keys_pb.Certificate,
    requestSerialize: serialize_polykey_v1_utils_EmptyMessage,
    requestDeserialize: deserialize_polykey_v1_utils_EmptyMessage,
    responseSerialize: serialize_polykey_v1_keys_Certificate,
    responseDeserialize: deserialize_polykey_v1_keys_Certificate,
  },
  // Vaults
vaultsList: {
    path: '/polykey.v1.ClientService/VaultsList',
    requestStream: false,
    responseStream: true,
    requestType: polykey_v1_utils_utils_pb.EmptyMessage,
    responseType: polykey_v1_vaults_vaults_pb.List,
    requestSerialize: serialize_polykey_v1_utils_EmptyMessage,
    requestDeserialize: deserialize_polykey_v1_utils_EmptyMessage,
    responseSerialize: serialize_polykey_v1_vaults_List,
    responseDeserialize: deserialize_polykey_v1_vaults_List,
  },
  vaultsCreate: {
    path: '/polykey.v1.ClientService/VaultsCreate',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_vaults_vaults_pb.Vault,
    responseType: polykey_v1_vaults_vaults_pb.Vault,
    requestSerialize: serialize_polykey_v1_vaults_Vault,
    requestDeserialize: deserialize_polykey_v1_vaults_Vault,
    responseSerialize: serialize_polykey_v1_vaults_Vault,
    responseDeserialize: deserialize_polykey_v1_vaults_Vault,
  },
  vaultsRename: {
    path: '/polykey.v1.ClientService/VaultsRename',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_vaults_vaults_pb.Rename,
    responseType: polykey_v1_vaults_vaults_pb.Vault,
    requestSerialize: serialize_polykey_v1_vaults_Rename,
    requestDeserialize: deserialize_polykey_v1_vaults_Rename,
    responseSerialize: serialize_polykey_v1_vaults_Vault,
    responseDeserialize: deserialize_polykey_v1_vaults_Vault,
  },
  vaultsDelete: {
    path: '/polykey.v1.ClientService/VaultsDelete',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_vaults_vaults_pb.Vault,
    responseType: polykey_v1_utils_utils_pb.StatusMessage,
    requestSerialize: serialize_polykey_v1_vaults_Vault,
    requestDeserialize: deserialize_polykey_v1_vaults_Vault,
    responseSerialize: serialize_polykey_v1_utils_StatusMessage,
    responseDeserialize: deserialize_polykey_v1_utils_StatusMessage,
  },
  vaultsPull: {
    path: '/polykey.v1.ClientService/VaultsPull',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_vaults_vaults_pb.Pull,
    responseType: polykey_v1_utils_utils_pb.StatusMessage,
    requestSerialize: serialize_polykey_v1_vaults_Pull,
    requestDeserialize: deserialize_polykey_v1_vaults_Pull,
    responseSerialize: serialize_polykey_v1_utils_StatusMessage,
    responseDeserialize: deserialize_polykey_v1_utils_StatusMessage,
  },
  vaultsClone: {
    path: '/polykey.v1.ClientService/VaultsClone',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_vaults_vaults_pb.Clone,
    responseType: polykey_v1_utils_utils_pb.StatusMessage,
    requestSerialize: serialize_polykey_v1_vaults_Clone,
    requestDeserialize: deserialize_polykey_v1_vaults_Clone,
    responseSerialize: serialize_polykey_v1_utils_StatusMessage,
    responseDeserialize: deserialize_polykey_v1_utils_StatusMessage,
  },
  vaultsScan: {
    path: '/polykey.v1.ClientService/VaultsScan',
    requestStream: false,
    responseStream: true,
    requestType: polykey_v1_nodes_nodes_pb.Node,
    responseType: polykey_v1_vaults_vaults_pb.List,
    requestSerialize: serialize_polykey_v1_nodes_Node,
    requestDeserialize: deserialize_polykey_v1_nodes_Node,
    responseSerialize: serialize_polykey_v1_vaults_List,
    responseDeserialize: deserialize_polykey_v1_vaults_List,
  },
  vaultsSecretsList: {
    path: '/polykey.v1.ClientService/VaultsSecretsList',
    requestStream: false,
    responseStream: true,
    requestType: polykey_v1_vaults_vaults_pb.Vault,
    responseType: polykey_v1_secrets_secrets_pb.Secret,
    requestSerialize: serialize_polykey_v1_vaults_Vault,
    requestDeserialize: deserialize_polykey_v1_vaults_Vault,
    responseSerialize: serialize_polykey_v1_secrets_Secret,
    responseDeserialize: deserialize_polykey_v1_secrets_Secret,
  },
  vaultsSecretsMkdir: {
    path: '/polykey.v1.ClientService/VaultsSecretsMkdir',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_vaults_vaults_pb.Mkdir,
    responseType: polykey_v1_utils_utils_pb.StatusMessage,
    requestSerialize: serialize_polykey_v1_vaults_Mkdir,
    requestDeserialize: deserialize_polykey_v1_vaults_Mkdir,
    responseSerialize: serialize_polykey_v1_utils_StatusMessage,
    responseDeserialize: deserialize_polykey_v1_utils_StatusMessage,
  },
  vaultsSecretsStat: {
    path: '/polykey.v1.ClientService/VaultsSecretsStat',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_vaults_vaults_pb.Vault,
    responseType: polykey_v1_vaults_vaults_pb.Stat,
    requestSerialize: serialize_polykey_v1_vaults_Vault,
    requestDeserialize: deserialize_polykey_v1_vaults_Vault,
    responseSerialize: serialize_polykey_v1_vaults_Stat,
    responseDeserialize: deserialize_polykey_v1_vaults_Stat,
  },
  vaultsSecretsDelete: {
    path: '/polykey.v1.ClientService/VaultsSecretsDelete',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_secrets_secrets_pb.Secret,
    responseType: polykey_v1_utils_utils_pb.StatusMessage,
    requestSerialize: serialize_polykey_v1_secrets_Secret,
    requestDeserialize: deserialize_polykey_v1_secrets_Secret,
    responseSerialize: serialize_polykey_v1_utils_StatusMessage,
    responseDeserialize: deserialize_polykey_v1_utils_StatusMessage,
  },
  vaultsSecretsEdit: {
    path: '/polykey.v1.ClientService/VaultsSecretsEdit',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_secrets_secrets_pb.Secret,
    responseType: polykey_v1_utils_utils_pb.StatusMessage,
    requestSerialize: serialize_polykey_v1_secrets_Secret,
    requestDeserialize: deserialize_polykey_v1_secrets_Secret,
    responseSerialize: serialize_polykey_v1_utils_StatusMessage,
    responseDeserialize: deserialize_polykey_v1_utils_StatusMessage,
  },
  vaultsSecretsGet: {
    path: '/polykey.v1.ClientService/VaultsSecretsGet',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_secrets_secrets_pb.Secret,
    responseType: polykey_v1_secrets_secrets_pb.Secret,
    requestSerialize: serialize_polykey_v1_secrets_Secret,
    requestDeserialize: deserialize_polykey_v1_secrets_Secret,
    responseSerialize: serialize_polykey_v1_secrets_Secret,
    responseDeserialize: deserialize_polykey_v1_secrets_Secret,
  },
  vaultsSecretsRename: {
    path: '/polykey.v1.ClientService/VaultsSecretsRename',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_secrets_secrets_pb.Rename,
    responseType: polykey_v1_utils_utils_pb.StatusMessage,
    requestSerialize: serialize_polykey_v1_secrets_Rename,
    requestDeserialize: deserialize_polykey_v1_secrets_Rename,
    responseSerialize: serialize_polykey_v1_utils_StatusMessage,
    responseDeserialize: deserialize_polykey_v1_utils_StatusMessage,
  },
  vaultsSecretsNew: {
    path: '/polykey.v1.ClientService/VaultsSecretsNew',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_secrets_secrets_pb.Secret,
    responseType: polykey_v1_utils_utils_pb.StatusMessage,
    requestSerialize: serialize_polykey_v1_secrets_Secret,
    requestDeserialize: deserialize_polykey_v1_secrets_Secret,
    responseSerialize: serialize_polykey_v1_utils_StatusMessage,
    responseDeserialize: deserialize_polykey_v1_utils_StatusMessage,
  },
  vaultsSecretsNewDir: {
    path: '/polykey.v1.ClientService/VaultsSecretsNewDir',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_secrets_secrets_pb.Directory,
    responseType: polykey_v1_utils_utils_pb.StatusMessage,
    requestSerialize: serialize_polykey_v1_secrets_Directory,
    requestDeserialize: deserialize_polykey_v1_secrets_Directory,
    responseSerialize: serialize_polykey_v1_utils_StatusMessage,
    responseDeserialize: deserialize_polykey_v1_utils_StatusMessage,
  },
  vaultsPermissionsSet: {
    path: '/polykey.v1.ClientService/VaultsPermissionsSet',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_vaults_vaults_pb.PermSet,
    responseType: polykey_v1_utils_utils_pb.StatusMessage,
    requestSerialize: serialize_polykey_v1_vaults_PermSet,
    requestDeserialize: deserialize_polykey_v1_vaults_PermSet,
    responseSerialize: serialize_polykey_v1_utils_StatusMessage,
    responseDeserialize: deserialize_polykey_v1_utils_StatusMessage,
  },
  vaultsPermissionsUnset: {
    path: '/polykey.v1.ClientService/VaultsPermissionsUnset',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_vaults_vaults_pb.PermUnset,
    responseType: polykey_v1_utils_utils_pb.StatusMessage,
    requestSerialize: serialize_polykey_v1_vaults_PermUnset,
    requestDeserialize: deserialize_polykey_v1_vaults_PermUnset,
    responseSerialize: serialize_polykey_v1_utils_StatusMessage,
    responseDeserialize: deserialize_polykey_v1_utils_StatusMessage,
  },
  vaultsPermissions: {
    path: '/polykey.v1.ClientService/VaultsPermissions',
    requestStream: false,
    responseStream: true,
    requestType: polykey_v1_vaults_vaults_pb.PermGet,
    responseType: polykey_v1_vaults_vaults_pb.Permission,
    requestSerialize: serialize_polykey_v1_vaults_PermGet,
    requestDeserialize: deserialize_polykey_v1_vaults_PermGet,
    responseSerialize: serialize_polykey_v1_vaults_Permission,
    responseDeserialize: deserialize_polykey_v1_vaults_Permission,
  },
  vaultsVersion: {
    path: '/polykey.v1.ClientService/VaultsVersion',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_vaults_vaults_pb.Version,
    responseType: polykey_v1_vaults_vaults_pb.VersionResult,
    requestSerialize: serialize_polykey_v1_vaults_Version,
    requestDeserialize: deserialize_polykey_v1_vaults_Version,
    responseSerialize: serialize_polykey_v1_vaults_VersionResult,
    responseDeserialize: deserialize_polykey_v1_vaults_VersionResult,
  },
  vaultsLog: {
    path: '/polykey.v1.ClientService/VaultsLog',
    requestStream: false,
    responseStream: true,
    requestType: polykey_v1_vaults_vaults_pb.Log,
    responseType: polykey_v1_vaults_vaults_pb.LogEntry,
    requestSerialize: serialize_polykey_v1_vaults_Log,
    requestDeserialize: deserialize_polykey_v1_vaults_Log,
    responseSerialize: serialize_polykey_v1_vaults_LogEntry,
    responseDeserialize: deserialize_polykey_v1_vaults_LogEntry,
  },
  // Identities
identitiesAuthenticate: {
    path: '/polykey.v1.ClientService/IdentitiesAuthenticate',
    requestStream: false,
    responseStream: true,
    requestType: polykey_v1_identities_identities_pb.Provider,
    responseType: polykey_v1_identities_identities_pb.Provider,
    requestSerialize: serialize_polykey_v1_identities_Provider,
    requestDeserialize: deserialize_polykey_v1_identities_Provider,
    responseSerialize: serialize_polykey_v1_identities_Provider,
    responseDeserialize: deserialize_polykey_v1_identities_Provider,
  },
  identitiesTokenPut: {
    path: '/polykey.v1.ClientService/IdentitiesTokenPut',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_identities_identities_pb.TokenSpecific,
    responseType: polykey_v1_utils_utils_pb.EmptyMessage,
    requestSerialize: serialize_polykey_v1_identities_TokenSpecific,
    requestDeserialize: deserialize_polykey_v1_identities_TokenSpecific,
    responseSerialize: serialize_polykey_v1_utils_EmptyMessage,
    responseDeserialize: deserialize_polykey_v1_utils_EmptyMessage,
  },
  identitiesTokenGet: {
    path: '/polykey.v1.ClientService/IdentitiesTokenGet',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_identities_identities_pb.Provider,
    responseType: polykey_v1_identities_identities_pb.Token,
    requestSerialize: serialize_polykey_v1_identities_Provider,
    requestDeserialize: deserialize_polykey_v1_identities_Provider,
    responseSerialize: serialize_polykey_v1_identities_Token,
    responseDeserialize: deserialize_polykey_v1_identities_Token,
  },
  identitiesTokenDelete: {
    path: '/polykey.v1.ClientService/IdentitiesTokenDelete',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_identities_identities_pb.Provider,
    responseType: polykey_v1_utils_utils_pb.EmptyMessage,
    requestSerialize: serialize_polykey_v1_identities_Provider,
    requestDeserialize: deserialize_polykey_v1_identities_Provider,
    responseSerialize: serialize_polykey_v1_utils_EmptyMessage,
    responseDeserialize: deserialize_polykey_v1_utils_EmptyMessage,
  },
  identitiesProvidersList: {
    path: '/polykey.v1.ClientService/IdentitiesProvidersList',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_utils_utils_pb.EmptyMessage,
    responseType: polykey_v1_identities_identities_pb.Provider,
    requestSerialize: serialize_polykey_v1_utils_EmptyMessage,
    requestDeserialize: deserialize_polykey_v1_utils_EmptyMessage,
    responseSerialize: serialize_polykey_v1_identities_Provider,
    responseDeserialize: deserialize_polykey_v1_identities_Provider,
  },
  identitiesInfoGet: {
    path: '/polykey.v1.ClientService/IdentitiesInfoGet',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_identities_identities_pb.Provider,
    responseType: polykey_v1_identities_identities_pb.Provider,
    requestSerialize: serialize_polykey_v1_identities_Provider,
    requestDeserialize: deserialize_polykey_v1_identities_Provider,
    responseSerialize: serialize_polykey_v1_identities_Provider,
    responseDeserialize: deserialize_polykey_v1_identities_Provider,
  },
  identitiesInfoGetConnected: {
    path: '/polykey.v1.ClientService/IdentitiesInfoGetConnected',
    requestStream: false,
    responseStream: true,
    requestType: polykey_v1_identities_identities_pb.ProviderSearch,
    responseType: polykey_v1_identities_identities_pb.Info,
    requestSerialize: serialize_polykey_v1_identities_ProviderSearch,
    requestDeserialize: deserialize_polykey_v1_identities_ProviderSearch,
    responseSerialize: serialize_polykey_v1_identities_Info,
    responseDeserialize: deserialize_polykey_v1_identities_Info,
  },
  identitiesClaim: {
    path: '/polykey.v1.ClientService/IdentitiesClaim',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_identities_identities_pb.Provider,
    responseType: polykey_v1_utils_utils_pb.EmptyMessage,
    requestSerialize: serialize_polykey_v1_identities_Provider,
    requestDeserialize: deserialize_polykey_v1_identities_Provider,
    responseSerialize: serialize_polykey_v1_utils_EmptyMessage,
    responseDeserialize: deserialize_polykey_v1_utils_EmptyMessage,
  },
  // Gestalts
gestaltsGestaltList: {
    path: '/polykey.v1.ClientService/GestaltsGestaltList',
    requestStream: false,
    responseStream: true,
    requestType: polykey_v1_utils_utils_pb.EmptyMessage,
    responseType: polykey_v1_gestalts_gestalts_pb.Gestalt,
    requestSerialize: serialize_polykey_v1_utils_EmptyMessage,
    requestDeserialize: deserialize_polykey_v1_utils_EmptyMessage,
    responseSerialize: serialize_polykey_v1_gestalts_Gestalt,
    responseDeserialize: deserialize_polykey_v1_gestalts_Gestalt,
  },
  gestaltsGestaltGetByNode: {
    path: '/polykey.v1.ClientService/GestaltsGestaltGetByNode',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_nodes_nodes_pb.Node,
    responseType: polykey_v1_gestalts_gestalts_pb.Graph,
    requestSerialize: serialize_polykey_v1_nodes_Node,
    requestDeserialize: deserialize_polykey_v1_nodes_Node,
    responseSerialize: serialize_polykey_v1_gestalts_Graph,
    responseDeserialize: deserialize_polykey_v1_gestalts_Graph,
  },
  gestaltsGestaltGetByIdentity: {
    path: '/polykey.v1.ClientService/GestaltsGestaltGetByIdentity',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_identities_identities_pb.Provider,
    responseType: polykey_v1_gestalts_gestalts_pb.Graph,
    requestSerialize: serialize_polykey_v1_identities_Provider,
    requestDeserialize: deserialize_polykey_v1_identities_Provider,
    responseSerialize: serialize_polykey_v1_gestalts_Graph,
    responseDeserialize: deserialize_polykey_v1_gestalts_Graph,
  },
  gestaltsDiscoveryByNode: {
    path: '/polykey.v1.ClientService/GestaltsDiscoveryByNode',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_nodes_nodes_pb.Node,
    responseType: polykey_v1_utils_utils_pb.EmptyMessage,
    requestSerialize: serialize_polykey_v1_nodes_Node,
    requestDeserialize: deserialize_polykey_v1_nodes_Node,
    responseSerialize: serialize_polykey_v1_utils_EmptyMessage,
    responseDeserialize: deserialize_polykey_v1_utils_EmptyMessage,
  },
  gestaltsDiscoveryByIdentity: {
    path: '/polykey.v1.ClientService/GestaltsDiscoveryByIdentity',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_identities_identities_pb.Provider,
    responseType: polykey_v1_utils_utils_pb.EmptyMessage,
    requestSerialize: serialize_polykey_v1_identities_Provider,
    requestDeserialize: deserialize_polykey_v1_identities_Provider,
    responseSerialize: serialize_polykey_v1_utils_EmptyMessage,
    responseDeserialize: deserialize_polykey_v1_utils_EmptyMessage,
  },
  gestaltsActionsGetByNode: {
    path: '/polykey.v1.ClientService/GestaltsActionsGetByNode',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_nodes_nodes_pb.Node,
    responseType: polykey_v1_permissions_permissions_pb.Actions,
    requestSerialize: serialize_polykey_v1_nodes_Node,
    requestDeserialize: deserialize_polykey_v1_nodes_Node,
    responseSerialize: serialize_polykey_v1_permissions_Actions,
    responseDeserialize: deserialize_polykey_v1_permissions_Actions,
  },
  gestaltsActionsGetByIdentity: {
    path: '/polykey.v1.ClientService/GestaltsActionsGetByIdentity',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_identities_identities_pb.Provider,
    responseType: polykey_v1_permissions_permissions_pb.Actions,
    requestSerialize: serialize_polykey_v1_identities_Provider,
    requestDeserialize: deserialize_polykey_v1_identities_Provider,
    responseSerialize: serialize_polykey_v1_permissions_Actions,
    responseDeserialize: deserialize_polykey_v1_permissions_Actions,
  },
  gestaltsActionsSetByNode: {
    path: '/polykey.v1.ClientService/GestaltsActionsSetByNode',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_permissions_permissions_pb.ActionSet,
    responseType: polykey_v1_utils_utils_pb.EmptyMessage,
    requestSerialize: serialize_polykey_v1_permissions_ActionSet,
    requestDeserialize: deserialize_polykey_v1_permissions_ActionSet,
    responseSerialize: serialize_polykey_v1_utils_EmptyMessage,
    responseDeserialize: deserialize_polykey_v1_utils_EmptyMessage,
  },
  gestaltsActionsSetByIdentity: {
    path: '/polykey.v1.ClientService/GestaltsActionsSetByIdentity',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_permissions_permissions_pb.ActionSet,
    responseType: polykey_v1_utils_utils_pb.EmptyMessage,
    requestSerialize: serialize_polykey_v1_permissions_ActionSet,
    requestDeserialize: deserialize_polykey_v1_permissions_ActionSet,
    responseSerialize: serialize_polykey_v1_utils_EmptyMessage,
    responseDeserialize: deserialize_polykey_v1_utils_EmptyMessage,
  },
  gestaltsActionsUnsetByNode: {
    path: '/polykey.v1.ClientService/GestaltsActionsUnsetByNode',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_permissions_permissions_pb.ActionSet,
    responseType: polykey_v1_utils_utils_pb.EmptyMessage,
    requestSerialize: serialize_polykey_v1_permissions_ActionSet,
    requestDeserialize: deserialize_polykey_v1_permissions_ActionSet,
    responseSerialize: serialize_polykey_v1_utils_EmptyMessage,
    responseDeserialize: deserialize_polykey_v1_utils_EmptyMessage,
  },
  gestaltsActionsUnsetByIdentity: {
    path: '/polykey.v1.ClientService/GestaltsActionsUnsetByIdentity',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_permissions_permissions_pb.ActionSet,
    responseType: polykey_v1_utils_utils_pb.EmptyMessage,
    requestSerialize: serialize_polykey_v1_permissions_ActionSet,
    requestDeserialize: deserialize_polykey_v1_permissions_ActionSet,
    responseSerialize: serialize_polykey_v1_utils_EmptyMessage,
    responseDeserialize: deserialize_polykey_v1_utils_EmptyMessage,
  },
  // Notifications
notificationsSend: {
    path: '/polykey.v1.ClientService/NotificationsSend',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_notifications_notifications_pb.Send,
    responseType: polykey_v1_utils_utils_pb.EmptyMessage,
    requestSerialize: serialize_polykey_v1_notifications_Send,
    requestDeserialize: deserialize_polykey_v1_notifications_Send,
    responseSerialize: serialize_polykey_v1_utils_EmptyMessage,
    responseDeserialize: deserialize_polykey_v1_utils_EmptyMessage,
  },
  notificationsRead: {
    path: '/polykey.v1.ClientService/NotificationsRead',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_notifications_notifications_pb.Read,
    responseType: polykey_v1_notifications_notifications_pb.List,
    requestSerialize: serialize_polykey_v1_notifications_Read,
    requestDeserialize: deserialize_polykey_v1_notifications_Read,
    responseSerialize: serialize_polykey_v1_notifications_List,
    responseDeserialize: deserialize_polykey_v1_notifications_List,
  },
  notificationsClear: {
    path: '/polykey.v1.ClientService/NotificationsClear',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_utils_utils_pb.EmptyMessage,
    responseType: polykey_v1_utils_utils_pb.EmptyMessage,
    requestSerialize: serialize_polykey_v1_utils_EmptyMessage,
    requestDeserialize: deserialize_polykey_v1_utils_EmptyMessage,
    responseSerialize: serialize_polykey_v1_utils_EmptyMessage,
    responseDeserialize: deserialize_polykey_v1_utils_EmptyMessage,
  },
};

exports.ClientServiceClient = grpc.makeGenericClientConstructor(ClientServiceService);
