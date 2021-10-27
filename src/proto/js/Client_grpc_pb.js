// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var Gestalts_pb = require('./Gestalts_pb.js');
var Identities_pb = require('./Identities_pb.js');
var Keys_pb = require('./Keys_pb.js');
var Nodes_pb = require('./Nodes_pb.js');
var Notifications_pb = require('./Notifications_pb.js');
var Permissions_pb = require('./Permissions_pb.js');
var Secrets_pb = require('./Secrets_pb.js');
var Sessions_pb = require('./Sessions_pb.js');
var Vaults_pb = require('./Vaults_pb.js');
var Common_pb = require('./Common_pb.js');

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

function serialize_common_StatusMessage(arg) {
  if (!(arg instanceof Common_pb.StatusMessage)) {
    throw new Error('Expected argument of type common.StatusMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_common_StatusMessage(buffer_arg) {
  return Common_pb.StatusMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_gestalt_Gestalt(arg) {
  if (!(arg instanceof Gestalts_pb.Gestalt)) {
    throw new Error('Expected argument of type gestalt.Gestalt');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_gestalt_Gestalt(buffer_arg) {
  return Gestalts_pb.Gestalt.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_gestalt_Graph(arg) {
  if (!(arg instanceof Gestalts_pb.Graph)) {
    throw new Error('Expected argument of type gestalt.Graph');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_gestalt_Graph(buffer_arg) {
  return Gestalts_pb.Graph.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_identity_Info(arg) {
  if (!(arg instanceof Identities_pb.Info)) {
    throw new Error('Expected argument of type identity.Info');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_identity_Info(buffer_arg) {
  return Identities_pb.Info.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_identity_Provider(arg) {
  if (!(arg instanceof Identities_pb.Provider)) {
    throw new Error('Expected argument of type identity.Provider');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_identity_Provider(buffer_arg) {
  return Identities_pb.Provider.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_identity_ProviderSearch(arg) {
  if (!(arg instanceof Identities_pb.ProviderSearch)) {
    throw new Error('Expected argument of type identity.ProviderSearch');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_identity_ProviderSearch(buffer_arg) {
  return Identities_pb.ProviderSearch.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_identity_Token(arg) {
  if (!(arg instanceof Identities_pb.Token)) {
    throw new Error('Expected argument of type identity.Token');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_identity_Token(buffer_arg) {
  return Identities_pb.Token.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_identity_TokenSpecific(arg) {
  if (!(arg instanceof Identities_pb.TokenSpecific)) {
    throw new Error('Expected argument of type identity.TokenSpecific');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_identity_TokenSpecific(buffer_arg) {
  return Identities_pb.TokenSpecific.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_key_Certificate(arg) {
  if (!(arg instanceof Keys_pb.Certificate)) {
    throw new Error('Expected argument of type key.Certificate');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_key_Certificate(buffer_arg) {
  return Keys_pb.Certificate.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_key_Crypto(arg) {
  if (!(arg instanceof Keys_pb.Crypto)) {
    throw new Error('Expected argument of type key.Crypto');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_key_Crypto(buffer_arg) {
  return Keys_pb.Crypto.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_key_Key(arg) {
  if (!(arg instanceof Keys_pb.Key)) {
    throw new Error('Expected argument of type key.Key');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_key_Key(buffer_arg) {
  return Keys_pb.Key.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_key_KeyPair(arg) {
  if (!(arg instanceof Keys_pb.KeyPair)) {
    throw new Error('Expected argument of type key.KeyPair');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_key_KeyPair(buffer_arg) {
  return Keys_pb.KeyPair.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_node_Claim(arg) {
  if (!(arg instanceof Nodes_pb.Claim)) {
    throw new Error('Expected argument of type node.Claim');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_node_Claim(buffer_arg) {
  return Nodes_pb.Claim.deserializeBinary(new Uint8Array(buffer_arg));
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

function serialize_node_NodeAddress(arg) {
  if (!(arg instanceof Nodes_pb.NodeAddress)) {
    throw new Error('Expected argument of type node.NodeAddress');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_node_NodeAddress(buffer_arg) {
  return Nodes_pb.NodeAddress.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_notification_List(arg) {
  if (!(arg instanceof Notifications_pb.List)) {
    throw new Error('Expected argument of type notification.List');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_notification_List(buffer_arg) {
  return Notifications_pb.List.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_notification_Read(arg) {
  if (!(arg instanceof Notifications_pb.Read)) {
    throw new Error('Expected argument of type notification.Read');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_notification_Read(buffer_arg) {
  return Notifications_pb.Read.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_notification_Send(arg) {
  if (!(arg instanceof Notifications_pb.Send)) {
    throw new Error('Expected argument of type notification.Send');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_notification_Send(buffer_arg) {
  return Notifications_pb.Send.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_permission_ActionSet(arg) {
  if (!(arg instanceof Permissions_pb.ActionSet)) {
    throw new Error('Expected argument of type permission.ActionSet');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_permission_ActionSet(buffer_arg) {
  return Permissions_pb.ActionSet.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_permission_Actions(arg) {
  if (!(arg instanceof Permissions_pb.Actions)) {
    throw new Error('Expected argument of type permission.Actions');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_permission_Actions(buffer_arg) {
  return Permissions_pb.Actions.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_secret_Directory(arg) {
  if (!(arg instanceof Secrets_pb.Directory)) {
    throw new Error('Expected argument of type secret.Directory');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_secret_Directory(buffer_arg) {
  return Secrets_pb.Directory.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_secret_Rename(arg) {
  if (!(arg instanceof Secrets_pb.Rename)) {
    throw new Error('Expected argument of type secret.Rename');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_secret_Rename(buffer_arg) {
  return Secrets_pb.Rename.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_secret_Secret(arg) {
  if (!(arg instanceof Secrets_pb.Secret)) {
    throw new Error('Expected argument of type secret.Secret');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_secret_Secret(buffer_arg) {
  return Secrets_pb.Secret.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_session_Password(arg) {
  if (!(arg instanceof Sessions_pb.Password)) {
    throw new Error('Expected argument of type session.Password');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_session_Password(buffer_arg) {
  return Sessions_pb.Password.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_session_Token(arg) {
  if (!(arg instanceof Sessions_pb.Token)) {
    throw new Error('Expected argument of type session.Token');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_session_Token(buffer_arg) {
  return Sessions_pb.Token.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_vault_Clone(arg) {
  if (!(arg instanceof Vaults_pb.Clone)) {
    throw new Error('Expected argument of type vault.Clone');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_vault_Clone(buffer_arg) {
  return Vaults_pb.Clone.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_vault_List(arg) {
  if (!(arg instanceof Vaults_pb.List)) {
    throw new Error('Expected argument of type vault.List');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_vault_List(buffer_arg) {
  return Vaults_pb.List.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_vault_Log(arg) {
  if (!(arg instanceof Vaults_pb.Log)) {
    throw new Error('Expected argument of type vault.Log');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_vault_Log(buffer_arg) {
  return Vaults_pb.Log.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_vault_LogEntry(arg) {
  if (!(arg instanceof Vaults_pb.LogEntry)) {
    throw new Error('Expected argument of type vault.LogEntry');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_vault_LogEntry(buffer_arg) {
  return Vaults_pb.LogEntry.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_vault_Mkdir(arg) {
  if (!(arg instanceof Vaults_pb.Mkdir)) {
    throw new Error('Expected argument of type vault.Mkdir');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_vault_Mkdir(buffer_arg) {
  return Vaults_pb.Mkdir.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_vault_PermGet(arg) {
  if (!(arg instanceof Vaults_pb.PermGet)) {
    throw new Error('Expected argument of type vault.PermGet');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_vault_PermGet(buffer_arg) {
  return Vaults_pb.PermGet.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_vault_PermSet(arg) {
  if (!(arg instanceof Vaults_pb.PermSet)) {
    throw new Error('Expected argument of type vault.PermSet');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_vault_PermSet(buffer_arg) {
  return Vaults_pb.PermSet.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_vault_PermUnset(arg) {
  if (!(arg instanceof Vaults_pb.PermUnset)) {
    throw new Error('Expected argument of type vault.PermUnset');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_vault_PermUnset(buffer_arg) {
  return Vaults_pb.PermUnset.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_vault_Permission(arg) {
  if (!(arg instanceof Vaults_pb.Permission)) {
    throw new Error('Expected argument of type vault.Permission');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_vault_Permission(buffer_arg) {
  return Vaults_pb.Permission.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_vault_Pull(arg) {
  if (!(arg instanceof Vaults_pb.Pull)) {
    throw new Error('Expected argument of type vault.Pull');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_vault_Pull(buffer_arg) {
  return Vaults_pb.Pull.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_vault_Rename(arg) {
  if (!(arg instanceof Vaults_pb.Rename)) {
    throw new Error('Expected argument of type vault.Rename');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_vault_Rename(buffer_arg) {
  return Vaults_pb.Rename.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_vault_Stat(arg) {
  if (!(arg instanceof Vaults_pb.Stat)) {
    throw new Error('Expected argument of type vault.Stat');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_vault_Stat(buffer_arg) {
  return Vaults_pb.Stat.deserializeBinary(new Uint8Array(buffer_arg));
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

function serialize_vault_Version(arg) {
  if (!(arg instanceof Vaults_pb.Version)) {
    throw new Error('Expected argument of type vault.Version');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_vault_Version(buffer_arg) {
  return Vaults_pb.Version.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_vault_VersionResult(arg) {
  if (!(arg instanceof Vaults_pb.VersionResult)) {
    throw new Error('Expected argument of type vault.VersionResult');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_vault_VersionResult(buffer_arg) {
  return Vaults_pb.VersionResult.deserializeBinary(new Uint8Array(buffer_arg));
}


var ClientService = exports.ClientService = {
  echo: {
    path: '/clientInterface.Client/Echo',
    requestStream: false,
    responseStream: false,
    requestType: Common_pb.EchoMessage,
    responseType: Common_pb.EchoMessage,
    requestSerialize: serialize_common_EchoMessage,
    requestDeserialize: deserialize_common_EchoMessage,
    responseSerialize: serialize_common_EchoMessage,
    responseDeserialize: deserialize_common_EchoMessage,
  },
  // Agent
agentStop: {
    path: '/clientInterface.Client/AgentStop',
    requestStream: false,
    responseStream: false,
    requestType: Common_pb.EmptyMessage,
    responseType: Common_pb.EmptyMessage,
    requestSerialize: serialize_common_EmptyMessage,
    requestDeserialize: deserialize_common_EmptyMessage,
    responseSerialize: serialize_common_EmptyMessage,
    responseDeserialize: deserialize_common_EmptyMessage,
  },
  // Session
sessionUnlock: {
    path: '/clientInterface.Client/SessionUnlock',
    requestStream: false,
    responseStream: false,
    requestType: Sessions_pb.Password,
    responseType: Sessions_pb.Token,
    requestSerialize: serialize_session_Password,
    requestDeserialize: deserialize_session_Password,
    responseSerialize: serialize_session_Token,
    responseDeserialize: deserialize_session_Token,
  },
  sessionRefresh: {
    path: '/clientInterface.Client/SessionRefresh',
    requestStream: false,
    responseStream: false,
    requestType: Common_pb.EmptyMessage,
    responseType: Sessions_pb.Token,
    requestSerialize: serialize_common_EmptyMessage,
    requestDeserialize: deserialize_common_EmptyMessage,
    responseSerialize: serialize_session_Token,
    responseDeserialize: deserialize_session_Token,
  },
  sessionLockAll: {
    path: '/clientInterface.Client/SessionLockAll',
    requestStream: false,
    responseStream: false,
    requestType: Common_pb.EmptyMessage,
    responseType: Common_pb.StatusMessage,
    requestSerialize: serialize_common_EmptyMessage,
    requestDeserialize: deserialize_common_EmptyMessage,
    responseSerialize: serialize_common_StatusMessage,
    responseDeserialize: deserialize_common_StatusMessage,
  },
  // Nodes
nodesAdd: {
    path: '/clientInterface.Client/NodesAdd',
    requestStream: false,
    responseStream: false,
    requestType: Nodes_pb.NodeAddress,
    responseType: Common_pb.EmptyMessage,
    requestSerialize: serialize_node_NodeAddress,
    requestDeserialize: deserialize_node_NodeAddress,
    responseSerialize: serialize_common_EmptyMessage,
    responseDeserialize: deserialize_common_EmptyMessage,
  },
  nodesPing: {
    path: '/clientInterface.Client/NodesPing',
    requestStream: false,
    responseStream: false,
    requestType: Nodes_pb.Node,
    responseType: Common_pb.StatusMessage,
    requestSerialize: serialize_node_Node,
    requestDeserialize: deserialize_node_Node,
    responseSerialize: serialize_common_StatusMessage,
    responseDeserialize: deserialize_common_StatusMessage,
  },
  nodesClaim: {
    path: '/clientInterface.Client/NodesClaim',
    requestStream: false,
    responseStream: false,
    requestType: Nodes_pb.Claim,
    responseType: Common_pb.StatusMessage,
    requestSerialize: serialize_node_Claim,
    requestDeserialize: deserialize_node_Claim,
    responseSerialize: serialize_common_StatusMessage,
    responseDeserialize: deserialize_common_StatusMessage,
  },
  nodesFind: {
    path: '/clientInterface.Client/NodesFind',
    requestStream: false,
    responseStream: false,
    requestType: Nodes_pb.Node,
    responseType: Nodes_pb.NodeAddress,
    requestSerialize: serialize_node_Node,
    requestDeserialize: deserialize_node_Node,
    responseSerialize: serialize_node_NodeAddress,
    responseDeserialize: deserialize_node_NodeAddress,
  },
  // Keys
keysKeyPairRoot: {
    path: '/clientInterface.Client/KeysKeyPairRoot',
    requestStream: false,
    responseStream: false,
    requestType: Common_pb.EmptyMessage,
    responseType: Keys_pb.KeyPair,
    requestSerialize: serialize_common_EmptyMessage,
    requestDeserialize: deserialize_common_EmptyMessage,
    responseSerialize: serialize_key_KeyPair,
    responseDeserialize: deserialize_key_KeyPair,
  },
  keysKeyPairReset: {
    path: '/clientInterface.Client/KeysKeyPairReset',
    requestStream: false,
    responseStream: false,
    requestType: Keys_pb.Key,
    responseType: Common_pb.EmptyMessage,
    requestSerialize: serialize_key_Key,
    requestDeserialize: deserialize_key_Key,
    responseSerialize: serialize_common_EmptyMessage,
    responseDeserialize: deserialize_common_EmptyMessage,
  },
  keysKeyPairRenew: {
    path: '/clientInterface.Client/KeysKeyPairRenew',
    requestStream: false,
    responseStream: false,
    requestType: Keys_pb.Key,
    responseType: Common_pb.EmptyMessage,
    requestSerialize: serialize_key_Key,
    requestDeserialize: deserialize_key_Key,
    responseSerialize: serialize_common_EmptyMessage,
    responseDeserialize: deserialize_common_EmptyMessage,
  },
  keysEncrypt: {
    path: '/clientInterface.Client/KeysEncrypt',
    requestStream: false,
    responseStream: false,
    requestType: Keys_pb.Crypto,
    responseType: Keys_pb.Crypto,
    requestSerialize: serialize_key_Crypto,
    requestDeserialize: deserialize_key_Crypto,
    responseSerialize: serialize_key_Crypto,
    responseDeserialize: deserialize_key_Crypto,
  },
  keysDecrypt: {
    path: '/clientInterface.Client/KeysDecrypt',
    requestStream: false,
    responseStream: false,
    requestType: Keys_pb.Crypto,
    responseType: Keys_pb.Crypto,
    requestSerialize: serialize_key_Crypto,
    requestDeserialize: deserialize_key_Crypto,
    responseSerialize: serialize_key_Crypto,
    responseDeserialize: deserialize_key_Crypto,
  },
  keysSign: {
    path: '/clientInterface.Client/KeysSign',
    requestStream: false,
    responseStream: false,
    requestType: Keys_pb.Crypto,
    responseType: Keys_pb.Crypto,
    requestSerialize: serialize_key_Crypto,
    requestDeserialize: deserialize_key_Crypto,
    responseSerialize: serialize_key_Crypto,
    responseDeserialize: deserialize_key_Crypto,
  },
  keysVerify: {
    path: '/clientInterface.Client/KeysVerify',
    requestStream: false,
    responseStream: false,
    requestType: Keys_pb.Crypto,
    responseType: Common_pb.StatusMessage,
    requestSerialize: serialize_key_Crypto,
    requestDeserialize: deserialize_key_Crypto,
    responseSerialize: serialize_common_StatusMessage,
    responseDeserialize: deserialize_common_StatusMessage,
  },
  keysPasswordChange: {
    path: '/clientInterface.Client/KeysPasswordChange',
    requestStream: false,
    responseStream: false,
    requestType: Sessions_pb.Password,
    responseType: Common_pb.EmptyMessage,
    requestSerialize: serialize_session_Password,
    requestDeserialize: deserialize_session_Password,
    responseSerialize: serialize_common_EmptyMessage,
    responseDeserialize: deserialize_common_EmptyMessage,
  },
  // FIXME: passwordMessage is shared.
keysCertsGet: {
    path: '/clientInterface.Client/KeysCertsGet',
    requestStream: false,
    responseStream: false,
    requestType: Common_pb.EmptyMessage,
    responseType: Keys_pb.Certificate,
    requestSerialize: serialize_common_EmptyMessage,
    requestDeserialize: deserialize_common_EmptyMessage,
    responseSerialize: serialize_key_Certificate,
    responseDeserialize: deserialize_key_Certificate,
  },
  keysCertsChainGet: {
    path: '/clientInterface.Client/KeysCertsChainGet',
    requestStream: false,
    responseStream: true,
    requestType: Common_pb.EmptyMessage,
    responseType: Keys_pb.Certificate,
    requestSerialize: serialize_common_EmptyMessage,
    requestDeserialize: deserialize_common_EmptyMessage,
    responseSerialize: serialize_key_Certificate,
    responseDeserialize: deserialize_key_Certificate,
  },
  // Vaults
vaultsList: {
    path: '/clientInterface.Client/VaultsList',
    requestStream: false,
    responseStream: true,
    requestType: Common_pb.EmptyMessage,
    responseType: Vaults_pb.List,
    requestSerialize: serialize_common_EmptyMessage,
    requestDeserialize: deserialize_common_EmptyMessage,
    responseSerialize: serialize_vault_List,
    responseDeserialize: deserialize_vault_List,
  },
  vaultsCreate: {
    path: '/clientInterface.Client/VaultsCreate',
    requestStream: false,
    responseStream: false,
    requestType: Vaults_pb.Vault,
    responseType: Vaults_pb.Vault,
    requestSerialize: serialize_vault_Vault,
    requestDeserialize: deserialize_vault_Vault,
    responseSerialize: serialize_vault_Vault,
    responseDeserialize: deserialize_vault_Vault,
  },
  vaultsRename: {
    path: '/clientInterface.Client/VaultsRename',
    requestStream: false,
    responseStream: false,
    requestType: Vaults_pb.Rename,
    responseType: Vaults_pb.Vault,
    requestSerialize: serialize_vault_Rename,
    requestDeserialize: deserialize_vault_Rename,
    responseSerialize: serialize_vault_Vault,
    responseDeserialize: deserialize_vault_Vault,
  },
  vaultsDelete: {
    path: '/clientInterface.Client/VaultsDelete',
    requestStream: false,
    responseStream: false,
    requestType: Vaults_pb.Vault,
    responseType: Common_pb.StatusMessage,
    requestSerialize: serialize_vault_Vault,
    requestDeserialize: deserialize_vault_Vault,
    responseSerialize: serialize_common_StatusMessage,
    responseDeserialize: deserialize_common_StatusMessage,
  },
  vaultsPull: {
    path: '/clientInterface.Client/VaultsPull',
    requestStream: false,
    responseStream: false,
    requestType: Vaults_pb.Pull,
    responseType: Common_pb.StatusMessage,
    requestSerialize: serialize_vault_Pull,
    requestDeserialize: deserialize_vault_Pull,
    responseSerialize: serialize_common_StatusMessage,
    responseDeserialize: deserialize_common_StatusMessage,
  },
  vaultsClone: {
    path: '/clientInterface.Client/VaultsClone',
    requestStream: false,
    responseStream: false,
    requestType: Vaults_pb.Clone,
    responseType: Common_pb.StatusMessage,
    requestSerialize: serialize_vault_Clone,
    requestDeserialize: deserialize_vault_Clone,
    responseSerialize: serialize_common_StatusMessage,
    responseDeserialize: deserialize_common_StatusMessage,
  },
  vaultsScan: {
    path: '/clientInterface.Client/VaultsScan',
    requestStream: false,
    responseStream: true,
    requestType: Nodes_pb.Node,
    responseType: Vaults_pb.List,
    requestSerialize: serialize_node_Node,
    requestDeserialize: deserialize_node_Node,
    responseSerialize: serialize_vault_List,
    responseDeserialize: deserialize_vault_List,
  },
  vaultsSecretsList: {
    path: '/clientInterface.Client/VaultsSecretsList',
    requestStream: false,
    responseStream: true,
    requestType: Vaults_pb.Vault,
    responseType: Secrets_pb.Secret,
    requestSerialize: serialize_vault_Vault,
    requestDeserialize: deserialize_vault_Vault,
    responseSerialize: serialize_secret_Secret,
    responseDeserialize: deserialize_secret_Secret,
  },
  vaultsSecretsMkdir: {
    path: '/clientInterface.Client/VaultsSecretsMkdir',
    requestStream: false,
    responseStream: false,
    requestType: Vaults_pb.Mkdir,
    responseType: Common_pb.StatusMessage,
    requestSerialize: serialize_vault_Mkdir,
    requestDeserialize: deserialize_vault_Mkdir,
    responseSerialize: serialize_common_StatusMessage,
    responseDeserialize: deserialize_common_StatusMessage,
  },
  vaultsSecretsStat: {
    path: '/clientInterface.Client/VaultsSecretsStat',
    requestStream: false,
    responseStream: false,
    requestType: Vaults_pb.Vault,
    responseType: Vaults_pb.Stat,
    requestSerialize: serialize_vault_Vault,
    requestDeserialize: deserialize_vault_Vault,
    responseSerialize: serialize_vault_Stat,
    responseDeserialize: deserialize_vault_Stat,
  },
  vaultsSecretsDelete: {
    path: '/clientInterface.Client/VaultsSecretsDelete',
    requestStream: false,
    responseStream: false,
    requestType: Secrets_pb.Secret,
    responseType: Common_pb.StatusMessage,
    requestSerialize: serialize_secret_Secret,
    requestDeserialize: deserialize_secret_Secret,
    responseSerialize: serialize_common_StatusMessage,
    responseDeserialize: deserialize_common_StatusMessage,
  },
  vaultsSecretsEdit: {
    path: '/clientInterface.Client/VaultsSecretsEdit',
    requestStream: false,
    responseStream: false,
    requestType: Secrets_pb.Secret,
    responseType: Common_pb.StatusMessage,
    requestSerialize: serialize_secret_Secret,
    requestDeserialize: deserialize_secret_Secret,
    responseSerialize: serialize_common_StatusMessage,
    responseDeserialize: deserialize_common_StatusMessage,
  },
  vaultsSecretsGet: {
    path: '/clientInterface.Client/VaultsSecretsGet',
    requestStream: false,
    responseStream: false,
    requestType: Secrets_pb.Secret,
    responseType: Secrets_pb.Secret,
    requestSerialize: serialize_secret_Secret,
    requestDeserialize: deserialize_secret_Secret,
    responseSerialize: serialize_secret_Secret,
    responseDeserialize: deserialize_secret_Secret,
  },
  vaultsSecretsRename: {
    path: '/clientInterface.Client/VaultsSecretsRename',
    requestStream: false,
    responseStream: false,
    requestType: Secrets_pb.Rename,
    responseType: Common_pb.StatusMessage,
    requestSerialize: serialize_secret_Rename,
    requestDeserialize: deserialize_secret_Rename,
    responseSerialize: serialize_common_StatusMessage,
    responseDeserialize: deserialize_common_StatusMessage,
  },
  vaultsSecretsNew: {
    path: '/clientInterface.Client/VaultsSecretsNew',
    requestStream: false,
    responseStream: false,
    requestType: Secrets_pb.Secret,
    responseType: Common_pb.StatusMessage,
    requestSerialize: serialize_secret_Secret,
    requestDeserialize: deserialize_secret_Secret,
    responseSerialize: serialize_common_StatusMessage,
    responseDeserialize: deserialize_common_StatusMessage,
  },
  vaultsSecretsNewDir: {
    path: '/clientInterface.Client/VaultsSecretsNewDir',
    requestStream: false,
    responseStream: false,
    requestType: Secrets_pb.Directory,
    responseType: Common_pb.StatusMessage,
    requestSerialize: serialize_secret_Directory,
    requestDeserialize: deserialize_secret_Directory,
    responseSerialize: serialize_common_StatusMessage,
    responseDeserialize: deserialize_common_StatusMessage,
  },
  vaultsPermissionsSet: {
    path: '/clientInterface.Client/VaultsPermissionsSet',
    requestStream: false,
    responseStream: false,
    requestType: Vaults_pb.PermSet,
    responseType: Common_pb.StatusMessage,
    requestSerialize: serialize_vault_PermSet,
    requestDeserialize: deserialize_vault_PermSet,
    responseSerialize: serialize_common_StatusMessage,
    responseDeserialize: deserialize_common_StatusMessage,
  },
  vaultsPermissionsUnset: {
    path: '/clientInterface.Client/VaultsPermissionsUnset',
    requestStream: false,
    responseStream: false,
    requestType: Vaults_pb.PermUnset,
    responseType: Common_pb.StatusMessage,
    requestSerialize: serialize_vault_PermUnset,
    requestDeserialize: deserialize_vault_PermUnset,
    responseSerialize: serialize_common_StatusMessage,
    responseDeserialize: deserialize_common_StatusMessage,
  },
  vaultsPermissions: {
    path: '/clientInterface.Client/VaultsPermissions',
    requestStream: false,
    responseStream: true,
    requestType: Vaults_pb.PermGet,
    responseType: Vaults_pb.Permission,
    requestSerialize: serialize_vault_PermGet,
    requestDeserialize: deserialize_vault_PermGet,
    responseSerialize: serialize_vault_Permission,
    responseDeserialize: deserialize_vault_Permission,
  },
  vaultsVersion: {
    path: '/clientInterface.Client/VaultsVersion',
    requestStream: false,
    responseStream: false,
    requestType: Vaults_pb.Version,
    responseType: Vaults_pb.VersionResult,
    requestSerialize: serialize_vault_Version,
    requestDeserialize: deserialize_vault_Version,
    responseSerialize: serialize_vault_VersionResult,
    responseDeserialize: deserialize_vault_VersionResult,
  },
  vaultsLog: {
    path: '/clientInterface.Client/VaultsLog',
    requestStream: false,
    responseStream: true,
    requestType: Vaults_pb.Log,
    responseType: Vaults_pb.LogEntry,
    requestSerialize: serialize_vault_Log,
    requestDeserialize: deserialize_vault_Log,
    responseSerialize: serialize_vault_LogEntry,
    responseDeserialize: deserialize_vault_LogEntry,
  },
  // Identities
identitiesAuthenticate: {
    path: '/clientInterface.Client/IdentitiesAuthenticate',
    requestStream: false,
    responseStream: true,
    requestType: Identities_pb.Provider,
    responseType: Identities_pb.Provider,
    requestSerialize: serialize_identity_Provider,
    requestDeserialize: deserialize_identity_Provider,
    responseSerialize: serialize_identity_Provider,
    responseDeserialize: deserialize_identity_Provider,
  },
  identitiesTokenPut: {
    path: '/clientInterface.Client/IdentitiesTokenPut',
    requestStream: false,
    responseStream: false,
    requestType: Identities_pb.TokenSpecific,
    responseType: Common_pb.EmptyMessage,
    requestSerialize: serialize_identity_TokenSpecific,
    requestDeserialize: deserialize_identity_TokenSpecific,
    responseSerialize: serialize_common_EmptyMessage,
    responseDeserialize: deserialize_common_EmptyMessage,
  },
  identitiesTokenGet: {
    path: '/clientInterface.Client/IdentitiesTokenGet',
    requestStream: false,
    responseStream: false,
    requestType: Identities_pb.Provider,
    responseType: Identities_pb.Token,
    requestSerialize: serialize_identity_Provider,
    requestDeserialize: deserialize_identity_Provider,
    responseSerialize: serialize_identity_Token,
    responseDeserialize: deserialize_identity_Token,
  },
  identitiesTokenDelete: {
    path: '/clientInterface.Client/IdentitiesTokenDelete',
    requestStream: false,
    responseStream: false,
    requestType: Identities_pb.Provider,
    responseType: Common_pb.EmptyMessage,
    requestSerialize: serialize_identity_Provider,
    requestDeserialize: deserialize_identity_Provider,
    responseSerialize: serialize_common_EmptyMessage,
    responseDeserialize: deserialize_common_EmptyMessage,
  },
  identitiesProvidersList: {
    path: '/clientInterface.Client/IdentitiesProvidersList',
    requestStream: false,
    responseStream: false,
    requestType: Common_pb.EmptyMessage,
    responseType: Identities_pb.Provider,
    requestSerialize: serialize_common_EmptyMessage,
    requestDeserialize: deserialize_common_EmptyMessage,
    responseSerialize: serialize_identity_Provider,
    responseDeserialize: deserialize_identity_Provider,
  },
  identitiesInfoGet: {
    path: '/clientInterface.Client/IdentitiesInfoGet',
    requestStream: false,
    responseStream: false,
    requestType: Identities_pb.Provider,
    responseType: Identities_pb.Provider,
    requestSerialize: serialize_identity_Provider,
    requestDeserialize: deserialize_identity_Provider,
    responseSerialize: serialize_identity_Provider,
    responseDeserialize: deserialize_identity_Provider,
  },
  identitiesInfoGetConnected: {
    path: '/clientInterface.Client/IdentitiesInfoGetConnected',
    requestStream: false,
    responseStream: true,
    requestType: Identities_pb.ProviderSearch,
    responseType: Identities_pb.Info,
    requestSerialize: serialize_identity_ProviderSearch,
    requestDeserialize: deserialize_identity_ProviderSearch,
    responseSerialize: serialize_identity_Info,
    responseDeserialize: deserialize_identity_Info,
  },
  identitiesClaim: {
    path: '/clientInterface.Client/IdentitiesClaim',
    requestStream: false,
    responseStream: false,
    requestType: Identities_pb.Provider,
    responseType: Common_pb.EmptyMessage,
    requestSerialize: serialize_identity_Provider,
    requestDeserialize: deserialize_identity_Provider,
    responseSerialize: serialize_common_EmptyMessage,
    responseDeserialize: deserialize_common_EmptyMessage,
  },
  // Gestalts
gestaltsGestaltList: {
    path: '/clientInterface.Client/GestaltsGestaltList',
    requestStream: false,
    responseStream: true,
    requestType: Common_pb.EmptyMessage,
    responseType: Gestalts_pb.Gestalt,
    requestSerialize: serialize_common_EmptyMessage,
    requestDeserialize: deserialize_common_EmptyMessage,
    responseSerialize: serialize_gestalt_Gestalt,
    responseDeserialize: deserialize_gestalt_Gestalt,
  },
  gestaltsGestaltGetByNode: {
    path: '/clientInterface.Client/GestaltsGestaltGetByNode',
    requestStream: false,
    responseStream: false,
    requestType: Nodes_pb.Node,
    responseType: Gestalts_pb.Graph,
    requestSerialize: serialize_node_Node,
    requestDeserialize: deserialize_node_Node,
    responseSerialize: serialize_gestalt_Graph,
    responseDeserialize: deserialize_gestalt_Graph,
  },
  gestaltsGestaltGetByIdentity: {
    path: '/clientInterface.Client/GestaltsGestaltGetByIdentity',
    requestStream: false,
    responseStream: false,
    requestType: Identities_pb.Provider,
    responseType: Gestalts_pb.Graph,
    requestSerialize: serialize_identity_Provider,
    requestDeserialize: deserialize_identity_Provider,
    responseSerialize: serialize_gestalt_Graph,
    responseDeserialize: deserialize_gestalt_Graph,
  },
  gestaltsDiscoveryByNode: {
    path: '/clientInterface.Client/GestaltsDiscoveryByNode',
    requestStream: false,
    responseStream: false,
    requestType: Nodes_pb.Node,
    responseType: Common_pb.EmptyMessage,
    requestSerialize: serialize_node_Node,
    requestDeserialize: deserialize_node_Node,
    responseSerialize: serialize_common_EmptyMessage,
    responseDeserialize: deserialize_common_EmptyMessage,
  },
  gestaltsDiscoveryByIdentity: {
    path: '/clientInterface.Client/GestaltsDiscoveryByIdentity',
    requestStream: false,
    responseStream: false,
    requestType: Identities_pb.Provider,
    responseType: Common_pb.EmptyMessage,
    requestSerialize: serialize_identity_Provider,
    requestDeserialize: deserialize_identity_Provider,
    responseSerialize: serialize_common_EmptyMessage,
    responseDeserialize: deserialize_common_EmptyMessage,
  },
  gestaltsActionsGetByNode: {
    path: '/clientInterface.Client/GestaltsActionsGetByNode',
    requestStream: false,
    responseStream: false,
    requestType: Nodes_pb.Node,
    responseType: Permissions_pb.Actions,
    requestSerialize: serialize_node_Node,
    requestDeserialize: deserialize_node_Node,
    responseSerialize: serialize_permission_Actions,
    responseDeserialize: deserialize_permission_Actions,
  },
  gestaltsActionsGetByIdentity: {
    path: '/clientInterface.Client/GestaltsActionsGetByIdentity',
    requestStream: false,
    responseStream: false,
    requestType: Identities_pb.Provider,
    responseType: Permissions_pb.Actions,
    requestSerialize: serialize_identity_Provider,
    requestDeserialize: deserialize_identity_Provider,
    responseSerialize: serialize_permission_Actions,
    responseDeserialize: deserialize_permission_Actions,
  },
  gestaltsActionsSetByNode: {
    path: '/clientInterface.Client/GestaltsActionsSetByNode',
    requestStream: false,
    responseStream: false,
    requestType: Permissions_pb.ActionSet,
    responseType: Common_pb.EmptyMessage,
    requestSerialize: serialize_permission_ActionSet,
    requestDeserialize: deserialize_permission_ActionSet,
    responseSerialize: serialize_common_EmptyMessage,
    responseDeserialize: deserialize_common_EmptyMessage,
  },
  gestaltsActionsSetByIdentity: {
    path: '/clientInterface.Client/GestaltsActionsSetByIdentity',
    requestStream: false,
    responseStream: false,
    requestType: Permissions_pb.ActionSet,
    responseType: Common_pb.EmptyMessage,
    requestSerialize: serialize_permission_ActionSet,
    requestDeserialize: deserialize_permission_ActionSet,
    responseSerialize: serialize_common_EmptyMessage,
    responseDeserialize: deserialize_common_EmptyMessage,
  },
  gestaltsActionsUnsetByNode: {
    path: '/clientInterface.Client/GestaltsActionsUnsetByNode',
    requestStream: false,
    responseStream: false,
    requestType: Permissions_pb.ActionSet,
    responseType: Common_pb.EmptyMessage,
    requestSerialize: serialize_permission_ActionSet,
    requestDeserialize: deserialize_permission_ActionSet,
    responseSerialize: serialize_common_EmptyMessage,
    responseDeserialize: deserialize_common_EmptyMessage,
  },
  gestaltsActionsUnsetByIdentity: {
    path: '/clientInterface.Client/GestaltsActionsUnsetByIdentity',
    requestStream: false,
    responseStream: false,
    requestType: Permissions_pb.ActionSet,
    responseType: Common_pb.EmptyMessage,
    requestSerialize: serialize_permission_ActionSet,
    requestDeserialize: deserialize_permission_ActionSet,
    responseSerialize: serialize_common_EmptyMessage,
    responseDeserialize: deserialize_common_EmptyMessage,
  },
  // Notifications
notificationsSend: {
    path: '/clientInterface.Client/NotificationsSend',
    requestStream: false,
    responseStream: false,
    requestType: Notifications_pb.Send,
    responseType: Common_pb.EmptyMessage,
    requestSerialize: serialize_notification_Send,
    requestDeserialize: deserialize_notification_Send,
    responseSerialize: serialize_common_EmptyMessage,
    responseDeserialize: deserialize_common_EmptyMessage,
  },
  notificationsRead: {
    path: '/clientInterface.Client/NotificationsRead',
    requestStream: false,
    responseStream: false,
    requestType: Notifications_pb.Read,
    responseType: Notifications_pb.List,
    requestSerialize: serialize_notification_Read,
    requestDeserialize: deserialize_notification_Read,
    responseSerialize: serialize_notification_List,
    responseDeserialize: deserialize_notification_List,
  },
  notificationsClear: {
    path: '/clientInterface.Client/NotificationsClear',
    requestStream: false,
    responseStream: false,
    requestType: Common_pb.EmptyMessage,
    responseType: Common_pb.EmptyMessage,
    requestSerialize: serialize_common_EmptyMessage,
    requestDeserialize: deserialize_common_EmptyMessage,
    responseSerialize: serialize_common_EmptyMessage,
    responseDeserialize: deserialize_common_EmptyMessage,
  },
};

exports.ClientClient = grpc.makeGenericClientConstructor(ClientService);
