// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var Client_pb = require('./Client_pb.js');
var Gestalts_pb = require('./Gestalts_pb.js');
var Identities_pb = require('./Identities_pb.js');
var Keys_pb = require('./Keys_pb.js');
var Nodes_pb = require('./Nodes_pb.js');
var Notifications_pb = require('./Notifications_pb.js');
var Permissions_pb = require('./Permissions_pb.js');
var Secrets_pb = require('./Secrets_pb.js');
var Sessions_pb = require('./Sessions_pb.js');
var Vaults_pb = require('./Vaults_pb.js');

function serialize_Gestalt_Gestalt(arg) {
  if (!(arg instanceof Gestalts_pb.Gestalt)) {
    throw new Error('Expected argument of type Gestalt.Gestalt');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_Gestalt_Gestalt(buffer_arg) {
  return Gestalts_pb.Gestalt.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_Gestalt_Graph(arg) {
  if (!(arg instanceof Gestalts_pb.Graph)) {
    throw new Error('Expected argument of type Gestalt.Graph');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_Gestalt_Graph(buffer_arg) {
  return Gestalts_pb.Graph.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_Identitiy_Info(arg) {
  if (!(arg instanceof Identities_pb.Info)) {
    throw new Error('Expected argument of type Identitiy.Info');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_Identitiy_Info(buffer_arg) {
  return Identities_pb.Info.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_Identitiy_Provider(arg) {
  if (!(arg instanceof Identities_pb.Provider)) {
    throw new Error('Expected argument of type Identitiy.Provider');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_Identitiy_Provider(buffer_arg) {
  return Identities_pb.Provider.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_Identitiy_ProviderSearch(arg) {
  if (!(arg instanceof Identities_pb.ProviderSearch)) {
    throw new Error('Expected argument of type Identitiy.ProviderSearch');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_Identitiy_ProviderSearch(buffer_arg) {
  return Identities_pb.ProviderSearch.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_Identitiy_Token(arg) {
  if (!(arg instanceof Identities_pb.Token)) {
    throw new Error('Expected argument of type Identitiy.Token');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_Identitiy_Token(buffer_arg) {
  return Identities_pb.Token.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_Identitiy_TokenSpecific(arg) {
  if (!(arg instanceof Identities_pb.TokenSpecific)) {
    throw new Error('Expected argument of type Identitiy.TokenSpecific');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_Identitiy_TokenSpecific(buffer_arg) {
  return Identities_pb.TokenSpecific.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_Key_Certificate(arg) {
  if (!(arg instanceof Keys_pb.Certificate)) {
    throw new Error('Expected argument of type Key.Certificate');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_Key_Certificate(buffer_arg) {
  return Keys_pb.Certificate.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_Key_Crypto(arg) {
  if (!(arg instanceof Keys_pb.Crypto)) {
    throw new Error('Expected argument of type Key.Crypto');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_Key_Crypto(buffer_arg) {
  return Keys_pb.Crypto.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_Key_Key(arg) {
  if (!(arg instanceof Keys_pb.Key)) {
    throw new Error('Expected argument of type Key.Key');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_Key_Key(buffer_arg) {
  return Keys_pb.Key.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_Key_KeyPair(arg) {
  if (!(arg instanceof Keys_pb.KeyPair)) {
    throw new Error('Expected argument of type Key.KeyPair');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_Key_KeyPair(buffer_arg) {
  return Keys_pb.KeyPair.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_Node_Address(arg) {
  if (!(arg instanceof Nodes_pb.Address)) {
    throw new Error('Expected argument of type Node.Address');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_Node_Address(buffer_arg) {
  return Nodes_pb.Address.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_Node_Claim(arg) {
  if (!(arg instanceof Nodes_pb.Claim)) {
    throw new Error('Expected argument of type Node.Claim');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_Node_Claim(buffer_arg) {
  return Nodes_pb.Claim.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_Node_Node(arg) {
  if (!(arg instanceof Nodes_pb.Node)) {
    throw new Error('Expected argument of type Node.Node');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_Node_Node(buffer_arg) {
  return Nodes_pb.Node.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_Notification_List(arg) {
  if (!(arg instanceof Notifications_pb.List)) {
    throw new Error('Expected argument of type Notification.List');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_Notification_List(buffer_arg) {
  return Notifications_pb.List.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_Notification_Read(arg) {
  if (!(arg instanceof Notifications_pb.Read)) {
    throw new Error('Expected argument of type Notification.Read');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_Notification_Read(buffer_arg) {
  return Notifications_pb.Read.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_Notification_Send(arg) {
  if (!(arg instanceof Notifications_pb.Send)) {
    throw new Error('Expected argument of type Notification.Send');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_Notification_Send(buffer_arg) {
  return Notifications_pb.Send.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_Permission_ActionSet(arg) {
  if (!(arg instanceof Permissions_pb.ActionSet)) {
    throw new Error('Expected argument of type Permission.ActionSet');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_Permission_ActionSet(buffer_arg) {
  return Permissions_pb.ActionSet.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_Permission_Actions(arg) {
  if (!(arg instanceof Permissions_pb.Actions)) {
    throw new Error('Expected argument of type Permission.Actions');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_Permission_Actions(buffer_arg) {
  return Permissions_pb.Actions.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_Session_Password(arg) {
  if (!(arg instanceof Sessions_pb.Password)) {
    throw new Error('Expected argument of type Session.Password');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_Session_Password(buffer_arg) {
  return Sessions_pb.Password.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_Session_Token(arg) {
  if (!(arg instanceof Sessions_pb.Token)) {
    throw new Error('Expected argument of type Session.Token');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_Session_Token(buffer_arg) {
  return Sessions_pb.Token.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_Vault_Clone(arg) {
  if (!(arg instanceof Vaults_pb.Clone)) {
    throw new Error('Expected argument of type Vault.Clone');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_Vault_Clone(buffer_arg) {
  return Vaults_pb.Clone.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_Vault_List(arg) {
  if (!(arg instanceof Vaults_pb.List)) {
    throw new Error('Expected argument of type Vault.List');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_Vault_List(buffer_arg) {
  return Vaults_pb.List.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_Vault_Log(arg) {
  if (!(arg instanceof Vaults_pb.Log)) {
    throw new Error('Expected argument of type Vault.Log');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_Vault_Log(buffer_arg) {
  return Vaults_pb.Log.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_Vault_LogEntry(arg) {
  if (!(arg instanceof Vaults_pb.LogEntry)) {
    throw new Error('Expected argument of type Vault.LogEntry');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_Vault_LogEntry(buffer_arg) {
  return Vaults_pb.LogEntry.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_Vault_Mkdir(arg) {
  if (!(arg instanceof Vaults_pb.Mkdir)) {
    throw new Error('Expected argument of type Vault.Mkdir');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_Vault_Mkdir(buffer_arg) {
  return Vaults_pb.Mkdir.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_Vault_PermGet(arg) {
  if (!(arg instanceof Vaults_pb.PermGet)) {
    throw new Error('Expected argument of type Vault.PermGet');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_Vault_PermGet(buffer_arg) {
  return Vaults_pb.PermGet.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_Vault_PermSet(arg) {
  if (!(arg instanceof Vaults_pb.PermSet)) {
    throw new Error('Expected argument of type Vault.PermSet');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_Vault_PermSet(buffer_arg) {
  return Vaults_pb.PermSet.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_Vault_PermUnset(arg) {
  if (!(arg instanceof Vaults_pb.PermUnset)) {
    throw new Error('Expected argument of type Vault.PermUnset');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_Vault_PermUnset(buffer_arg) {
  return Vaults_pb.PermUnset.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_Vault_Permission(arg) {
  if (!(arg instanceof Vaults_pb.Permission)) {
    throw new Error('Expected argument of type Vault.Permission');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_Vault_Permission(buffer_arg) {
  return Vaults_pb.Permission.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_Vault_Pull(arg) {
  if (!(arg instanceof Vaults_pb.Pull)) {
    throw new Error('Expected argument of type Vault.Pull');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_Vault_Pull(buffer_arg) {
  return Vaults_pb.Pull.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_Vault_Rename(arg) {
  if (!(arg instanceof Vaults_pb.Rename)) {
    throw new Error('Expected argument of type Vault.Rename');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_Vault_Rename(buffer_arg) {
  return Vaults_pb.Rename.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_Vault_Stat(arg) {
  if (!(arg instanceof Vaults_pb.Stat)) {
    throw new Error('Expected argument of type Vault.Stat');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_Vault_Stat(buffer_arg) {
  return Vaults_pb.Stat.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_Vault_Vault(arg) {
  if (!(arg instanceof Vaults_pb.Vault)) {
    throw new Error('Expected argument of type Vault.Vault');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_Vault_Vault(buffer_arg) {
  return Vaults_pb.Vault.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_Vault_Version(arg) {
  if (!(arg instanceof Vaults_pb.Version)) {
    throw new Error('Expected argument of type Vault.Version');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_Vault_Version(buffer_arg) {
  return Vaults_pb.Version.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_Vault_VersionResult(arg) {
  if (!(arg instanceof Vaults_pb.VersionResult)) {
    throw new Error('Expected argument of type Vault.VersionResult');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_Vault_VersionResult(buffer_arg) {
  return Vaults_pb.VersionResult.deserializeBinary(new Uint8Array(buffer_arg));
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

function serialize_clientInterface_StatusMessage(arg) {
  if (!(arg instanceof Client_pb.StatusMessage)) {
    throw new Error('Expected argument of type clientInterface.StatusMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_clientInterface_StatusMessage(buffer_arg) {
  return Client_pb.StatusMessage.deserializeBinary(new Uint8Array(buffer_arg));
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
  // Agent
agentStop: {
    path: '/clientInterface.Client/AgentStop',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.EmptyMessage,
    responseType: Client_pb.EmptyMessage,
    requestSerialize: serialize_clientInterface_EmptyMessage,
    requestDeserialize: deserialize_clientInterface_EmptyMessage,
    responseSerialize: serialize_clientInterface_EmptyMessage,
    responseDeserialize: deserialize_clientInterface_EmptyMessage,
  },
  // Session
sessionUnlock: {
    path: '/clientInterface.Client/SessionUnlock',
    requestStream: false,
    responseStream: false,
    requestType: Sessions_pb.Password,
    responseType: Sessions_pb.Token,
    requestSerialize: serialize_Session_Password,
    requestDeserialize: deserialize_Session_Password,
    responseSerialize: serialize_Session_Token,
    responseDeserialize: deserialize_Session_Token,
  },
  sessionRefresh: {
    path: '/clientInterface.Client/SessionRefresh',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.EmptyMessage,
    responseType: Sessions_pb.Token,
    requestSerialize: serialize_clientInterface_EmptyMessage,
    requestDeserialize: deserialize_clientInterface_EmptyMessage,
    responseSerialize: serialize_Session_Token,
    responseDeserialize: deserialize_Session_Token,
  },
  sessionLockAll: {
    path: '/clientInterface.Client/SessionLockAll',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.EmptyMessage,
    responseType: Client_pb.StatusMessage,
    requestSerialize: serialize_clientInterface_EmptyMessage,
    requestDeserialize: deserialize_clientInterface_EmptyMessage,
    responseSerialize: serialize_clientInterface_StatusMessage,
    responseDeserialize: deserialize_clientInterface_StatusMessage,
  },
  // Nodes
nodesAdd: {
    path: '/clientInterface.Client/NodesAdd',
    requestStream: false,
    responseStream: false,
    requestType: Nodes_pb.Address,
    responseType: Client_pb.EmptyMessage,
    requestSerialize: serialize_Node_Address,
    requestDeserialize: deserialize_Node_Address,
    responseSerialize: serialize_clientInterface_EmptyMessage,
    responseDeserialize: deserialize_clientInterface_EmptyMessage,
  },
  nodesPing: {
    path: '/clientInterface.Client/NodesPing',
    requestStream: false,
    responseStream: false,
    requestType: Nodes_pb.Node,
    responseType: Client_pb.StatusMessage,
    requestSerialize: serialize_Node_Node,
    requestDeserialize: deserialize_Node_Node,
    responseSerialize: serialize_clientInterface_StatusMessage,
    responseDeserialize: deserialize_clientInterface_StatusMessage,
  },
  nodesClaim: {
    path: '/clientInterface.Client/NodesClaim',
    requestStream: false,
    responseStream: false,
    requestType: Nodes_pb.Claim,
    responseType: Client_pb.StatusMessage,
    requestSerialize: serialize_Node_Claim,
    requestDeserialize: deserialize_Node_Claim,
    responseSerialize: serialize_clientInterface_StatusMessage,
    responseDeserialize: deserialize_clientInterface_StatusMessage,
  },
  nodesFind: {
    path: '/clientInterface.Client/NodesFind',
    requestStream: false,
    responseStream: false,
    requestType: Nodes_pb.Node,
    responseType: Nodes_pb.Address,
    requestSerialize: serialize_Node_Node,
    requestDeserialize: deserialize_Node_Node,
    responseSerialize: serialize_Node_Address,
    responseDeserialize: deserialize_Node_Address,
  },
  // Keys
keysKeyPairRoot: {
    path: '/clientInterface.Client/KeysKeyPairRoot',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.EmptyMessage,
    responseType: Keys_pb.KeyPair,
    requestSerialize: serialize_clientInterface_EmptyMessage,
    requestDeserialize: deserialize_clientInterface_EmptyMessage,
    responseSerialize: serialize_Key_KeyPair,
    responseDeserialize: deserialize_Key_KeyPair,
  },
  keysKeyPairReset: {
    path: '/clientInterface.Client/KeysKeyPairReset',
    requestStream: false,
    responseStream: false,
    requestType: Keys_pb.Key,
    responseType: Client_pb.EmptyMessage,
    requestSerialize: serialize_Key_Key,
    requestDeserialize: deserialize_Key_Key,
    responseSerialize: serialize_clientInterface_EmptyMessage,
    responseDeserialize: deserialize_clientInterface_EmptyMessage,
  },
  keysKeyPairRenew: {
    path: '/clientInterface.Client/KeysKeyPairRenew',
    requestStream: false,
    responseStream: false,
    requestType: Keys_pb.Key,
    responseType: Client_pb.EmptyMessage,
    requestSerialize: serialize_Key_Key,
    requestDeserialize: deserialize_Key_Key,
    responseSerialize: serialize_clientInterface_EmptyMessage,
    responseDeserialize: deserialize_clientInterface_EmptyMessage,
  },
  keysEncrypt: {
    path: '/clientInterface.Client/KeysEncrypt',
    requestStream: false,
    responseStream: false,
    requestType: Keys_pb.Crypto,
    responseType: Keys_pb.Crypto,
    requestSerialize: serialize_Key_Crypto,
    requestDeserialize: deserialize_Key_Crypto,
    responseSerialize: serialize_Key_Crypto,
    responseDeserialize: deserialize_Key_Crypto,
  },
  keysDecrypt: {
    path: '/clientInterface.Client/KeysDecrypt',
    requestStream: false,
    responseStream: false,
    requestType: Keys_pb.Crypto,
    responseType: Keys_pb.Crypto,
    requestSerialize: serialize_Key_Crypto,
    requestDeserialize: deserialize_Key_Crypto,
    responseSerialize: serialize_Key_Crypto,
    responseDeserialize: deserialize_Key_Crypto,
  },
  keysSign: {
    path: '/clientInterface.Client/KeysSign',
    requestStream: false,
    responseStream: false,
    requestType: Keys_pb.Crypto,
    responseType: Keys_pb.Crypto,
    requestSerialize: serialize_Key_Crypto,
    requestDeserialize: deserialize_Key_Crypto,
    responseSerialize: serialize_Key_Crypto,
    responseDeserialize: deserialize_Key_Crypto,
  },
  keysVerify: {
    path: '/clientInterface.Client/KeysVerify',
    requestStream: false,
    responseStream: false,
    requestType: Keys_pb.Crypto,
    responseType: Client_pb.StatusMessage,
    requestSerialize: serialize_Key_Crypto,
    requestDeserialize: deserialize_Key_Crypto,
    responseSerialize: serialize_clientInterface_StatusMessage,
    responseDeserialize: deserialize_clientInterface_StatusMessage,
  },
  keysPasswordChange: {
    path: '/clientInterface.Client/KeysPasswordChange',
    requestStream: false,
    responseStream: false,
    requestType: Sessions_pb.Password,
    responseType: Client_pb.EmptyMessage,
    requestSerialize: serialize_Session_Password,
    requestDeserialize: deserialize_Session_Password,
    responseSerialize: serialize_clientInterface_EmptyMessage,
    responseDeserialize: deserialize_clientInterface_EmptyMessage,
  },
  // FIXME: passwordMessage is shared.
keysCertsGet: {
    path: '/clientInterface.Client/KeysCertsGet',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.EmptyMessage,
    responseType: Keys_pb.Certificate,
    requestSerialize: serialize_clientInterface_EmptyMessage,
    requestDeserialize: deserialize_clientInterface_EmptyMessage,
    responseSerialize: serialize_Key_Certificate,
    responseDeserialize: deserialize_Key_Certificate,
  },
  keysCertsChainGet: {
    path: '/clientInterface.Client/KeysCertsChainGet',
    requestStream: false,
    responseStream: true,
    requestType: Client_pb.EmptyMessage,
    responseType: Keys_pb.Certificate,
    requestSerialize: serialize_clientInterface_EmptyMessage,
    requestDeserialize: deserialize_clientInterface_EmptyMessage,
    responseSerialize: serialize_Key_Certificate,
    responseDeserialize: deserialize_Key_Certificate,
  },
  // Vaults
vaultsList: {
    path: '/clientInterface.Client/VaultsList',
    requestStream: false,
    responseStream: true,
    requestType: Client_pb.EmptyMessage,
    responseType: Vaults_pb.List,
    requestSerialize: serialize_clientInterface_EmptyMessage,
    requestDeserialize: deserialize_clientInterface_EmptyMessage,
    responseSerialize: serialize_Vault_List,
    responseDeserialize: deserialize_Vault_List,
  },
  vaultsCreate: {
    path: '/clientInterface.Client/VaultsCreate',
    requestStream: false,
    responseStream: false,
    requestType: Vaults_pb.Vault,
    responseType: Vaults_pb.Vault,
    requestSerialize: serialize_Vault_Vault,
    requestDeserialize: deserialize_Vault_Vault,
    responseSerialize: serialize_Vault_Vault,
    responseDeserialize: deserialize_Vault_Vault,
  },
  vaultsRename: {
    path: '/clientInterface.Client/VaultsRename',
    requestStream: false,
    responseStream: false,
    requestType: Vaults_pb.Rename,
    responseType: Vaults_pb.Vault,
    requestSerialize: serialize_Vault_Rename,
    requestDeserialize: deserialize_Vault_Rename,
    responseSerialize: serialize_Vault_Vault,
    responseDeserialize: deserialize_Vault_Vault,
  },
  vaultsDelete: {
    path: '/clientInterface.Client/VaultsDelete',
    requestStream: false,
    responseStream: false,
    requestType: Vaults_pb.Vault,
    responseType: Client_pb.StatusMessage,
    requestSerialize: serialize_Vault_Vault,
    requestDeserialize: deserialize_Vault_Vault,
    responseSerialize: serialize_clientInterface_StatusMessage,
    responseDeserialize: deserialize_clientInterface_StatusMessage,
  },
  vaultsPull: {
    path: '/clientInterface.Client/VaultsPull',
    requestStream: false,
    responseStream: false,
    requestType: Vaults_pb.Pull,
    responseType: Client_pb.StatusMessage,
    requestSerialize: serialize_Vault_Pull,
    requestDeserialize: deserialize_Vault_Pull,
    responseSerialize: serialize_clientInterface_StatusMessage,
    responseDeserialize: deserialize_clientInterface_StatusMessage,
  },
  vaultsClone: {
    path: '/clientInterface.Client/VaultsClone',
    requestStream: false,
    responseStream: false,
    requestType: Vaults_pb.Clone,
    responseType: Client_pb.StatusMessage,
    requestSerialize: serialize_Vault_Clone,
    requestDeserialize: deserialize_Vault_Clone,
    responseSerialize: serialize_clientInterface_StatusMessage,
    responseDeserialize: deserialize_clientInterface_StatusMessage,
  },
  vaultsScan: {
    path: '/clientInterface.Client/VaultsScan',
    requestStream: false,
    responseStream: true,
    requestType: Nodes_pb.Node,
    responseType: Vaults_pb.List,
    requestSerialize: serialize_Node_Node,
    requestDeserialize: deserialize_Node_Node,
    responseSerialize: serialize_Vault_List,
    responseDeserialize: deserialize_Vault_List,
  },
  vaultsSecretsList: {
    path: '/clientInterface.Client/VaultsSecretsList',
    requestStream: false,
    responseStream: true,
    requestType: Vaults_pb.Vault,
    responseType: Secrets_pb.Secret,
    requestSerialize: serialize_Vault_Vault,
    requestDeserialize: deserialize_Vault_Vault,
    responseSerialize: serialize_secret_Secret,
    responseDeserialize: deserialize_secret_Secret,
  },
  vaultsSecretsMkdir: {
    path: '/clientInterface.Client/VaultsSecretsMkdir',
    requestStream: false,
    responseStream: false,
    requestType: Vaults_pb.Mkdir,
    responseType: Client_pb.StatusMessage,
    requestSerialize: serialize_Vault_Mkdir,
    requestDeserialize: deserialize_Vault_Mkdir,
    responseSerialize: serialize_clientInterface_StatusMessage,
    responseDeserialize: deserialize_clientInterface_StatusMessage,
  },
  vaultsSecretsStat: {
    path: '/clientInterface.Client/VaultsSecretsStat',
    requestStream: false,
    responseStream: false,
    requestType: Vaults_pb.Vault,
    responseType: Vaults_pb.Stat,
    requestSerialize: serialize_Vault_Vault,
    requestDeserialize: deserialize_Vault_Vault,
    responseSerialize: serialize_Vault_Stat,
    responseDeserialize: deserialize_Vault_Stat,
  },
  vaultsSecretsDelete: {
    path: '/clientInterface.Client/VaultsSecretsDelete',
    requestStream: false,
    responseStream: false,
    requestType: Secrets_pb.Secret,
    responseType: Client_pb.StatusMessage,
    requestSerialize: serialize_secret_Secret,
    requestDeserialize: deserialize_secret_Secret,
    responseSerialize: serialize_clientInterface_StatusMessage,
    responseDeserialize: deserialize_clientInterface_StatusMessage,
  },
  vaultsSecretsEdit: {
    path: '/clientInterface.Client/VaultsSecretsEdit',
    requestStream: false,
    responseStream: false,
    requestType: Secrets_pb.Secret,
    responseType: Client_pb.StatusMessage,
    requestSerialize: serialize_secret_Secret,
    requestDeserialize: deserialize_secret_Secret,
    responseSerialize: serialize_clientInterface_StatusMessage,
    responseDeserialize: deserialize_clientInterface_StatusMessage,
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
    responseType: Client_pb.StatusMessage,
    requestSerialize: serialize_secret_Rename,
    requestDeserialize: deserialize_secret_Rename,
    responseSerialize: serialize_clientInterface_StatusMessage,
    responseDeserialize: deserialize_clientInterface_StatusMessage,
  },
  vaultsSecretsNew: {
    path: '/clientInterface.Client/VaultsSecretsNew',
    requestStream: false,
    responseStream: false,
    requestType: Secrets_pb.Secret,
    responseType: Client_pb.StatusMessage,
    requestSerialize: serialize_secret_Secret,
    requestDeserialize: deserialize_secret_Secret,
    responseSerialize: serialize_clientInterface_StatusMessage,
    responseDeserialize: deserialize_clientInterface_StatusMessage,
  },
  vaultsSecretsNewDir: {
    path: '/clientInterface.Client/VaultsSecretsNewDir',
    requestStream: false,
    responseStream: false,
    requestType: Secrets_pb.Directory,
    responseType: Client_pb.StatusMessage,
    requestSerialize: serialize_secret_Directory,
    requestDeserialize: deserialize_secret_Directory,
    responseSerialize: serialize_clientInterface_StatusMessage,
    responseDeserialize: deserialize_clientInterface_StatusMessage,
  },
  vaultsPermissionsSet: {
    path: '/clientInterface.Client/VaultsPermissionsSet',
    requestStream: false,
    responseStream: false,
    requestType: Vaults_pb.PermSet,
    responseType: Client_pb.StatusMessage,
    requestSerialize: serialize_Vault_PermSet,
    requestDeserialize: deserialize_Vault_PermSet,
    responseSerialize: serialize_clientInterface_StatusMessage,
    responseDeserialize: deserialize_clientInterface_StatusMessage,
  },
  vaultsPermissionsUnset: {
    path: '/clientInterface.Client/VaultsPermissionsUnset',
    requestStream: false,
    responseStream: false,
    requestType: Vaults_pb.PermUnset,
    responseType: Client_pb.StatusMessage,
    requestSerialize: serialize_Vault_PermUnset,
    requestDeserialize: deserialize_Vault_PermUnset,
    responseSerialize: serialize_clientInterface_StatusMessage,
    responseDeserialize: deserialize_clientInterface_StatusMessage,
  },
  vaultsPermissions: {
    path: '/clientInterface.Client/VaultsPermissions',
    requestStream: false,
    responseStream: true,
    requestType: Vaults_pb.PermGet,
    responseType: Vaults_pb.Permission,
    requestSerialize: serialize_Vault_PermGet,
    requestDeserialize: deserialize_Vault_PermGet,
    responseSerialize: serialize_Vault_Permission,
    responseDeserialize: deserialize_Vault_Permission,
  },
  vaultsVersion: {
    path: '/clientInterface.Client/VaultsVersion',
    requestStream: false,
    responseStream: false,
    requestType: Vaults_pb.Version,
    responseType: Vaults_pb.VersionResult,
    requestSerialize: serialize_Vault_Version,
    requestDeserialize: deserialize_Vault_Version,
    responseSerialize: serialize_Vault_VersionResult,
    responseDeserialize: deserialize_Vault_VersionResult,
  },
  vaultsLog: {
    path: '/clientInterface.Client/VaultsLog',
    requestStream: false,
    responseStream: true,
    requestType: Vaults_pb.Log,
    responseType: Vaults_pb.LogEntry,
    requestSerialize: serialize_Vault_Log,
    requestDeserialize: deserialize_Vault_Log,
    responseSerialize: serialize_Vault_LogEntry,
    responseDeserialize: deserialize_Vault_LogEntry,
  },
  // Identities
identitiesAuthenticate: {
    path: '/clientInterface.Client/IdentitiesAuthenticate',
    requestStream: false,
    responseStream: true,
    requestType: Identities_pb.Provider,
    responseType: Identities_pb.Provider,
    requestSerialize: serialize_Identitiy_Provider,
    requestDeserialize: deserialize_Identitiy_Provider,
    responseSerialize: serialize_Identitiy_Provider,
    responseDeserialize: deserialize_Identitiy_Provider,
  },
  identitiesTokenPut: {
    path: '/clientInterface.Client/IdentitiesTokenPut',
    requestStream: false,
    responseStream: false,
    requestType: Identities_pb.TokenSpecific,
    responseType: Client_pb.EmptyMessage,
    requestSerialize: serialize_Identitiy_TokenSpecific,
    requestDeserialize: deserialize_Identitiy_TokenSpecific,
    responseSerialize: serialize_clientInterface_EmptyMessage,
    responseDeserialize: deserialize_clientInterface_EmptyMessage,
  },
  identitiesTokenGet: {
    path: '/clientInterface.Client/IdentitiesTokenGet',
    requestStream: false,
    responseStream: false,
    requestType: Identities_pb.Provider,
    responseType: Identities_pb.Token,
    requestSerialize: serialize_Identitiy_Provider,
    requestDeserialize: deserialize_Identitiy_Provider,
    responseSerialize: serialize_Identitiy_Token,
    responseDeserialize: deserialize_Identitiy_Token,
  },
  identitiesTokenDelete: {
    path: '/clientInterface.Client/IdentitiesTokenDelete',
    requestStream: false,
    responseStream: false,
    requestType: Identities_pb.Provider,
    responseType: Client_pb.EmptyMessage,
    requestSerialize: serialize_Identitiy_Provider,
    requestDeserialize: deserialize_Identitiy_Provider,
    responseSerialize: serialize_clientInterface_EmptyMessage,
    responseDeserialize: deserialize_clientInterface_EmptyMessage,
  },
  identitiesProvidersList: {
    path: '/clientInterface.Client/IdentitiesProvidersList',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.EmptyMessage,
    responseType: Identities_pb.Provider,
    requestSerialize: serialize_clientInterface_EmptyMessage,
    requestDeserialize: deserialize_clientInterface_EmptyMessage,
    responseSerialize: serialize_Identitiy_Provider,
    responseDeserialize: deserialize_Identitiy_Provider,
  },
  identitiesInfoGet: {
    path: '/clientInterface.Client/IdentitiesInfoGet',
    requestStream: false,
    responseStream: false,
    requestType: Identities_pb.Provider,
    responseType: Identities_pb.Provider,
    requestSerialize: serialize_Identitiy_Provider,
    requestDeserialize: deserialize_Identitiy_Provider,
    responseSerialize: serialize_Identitiy_Provider,
    responseDeserialize: deserialize_Identitiy_Provider,
  },
  identitiesInfoGetConnected: {
    path: '/clientInterface.Client/IdentitiesInfoGetConnected',
    requestStream: false,
    responseStream: true,
    requestType: Identities_pb.ProviderSearch,
    responseType: Identities_pb.Info,
    requestSerialize: serialize_Identitiy_ProviderSearch,
    requestDeserialize: deserialize_Identitiy_ProviderSearch,
    responseSerialize: serialize_Identitiy_Info,
    responseDeserialize: deserialize_Identitiy_Info,
  },
  identitiesClaim: {
    path: '/clientInterface.Client/IdentitiesClaim',
    requestStream: false,
    responseStream: false,
    requestType: Identities_pb.Provider,
    responseType: Client_pb.EmptyMessage,
    requestSerialize: serialize_Identitiy_Provider,
    requestDeserialize: deserialize_Identitiy_Provider,
    responseSerialize: serialize_clientInterface_EmptyMessage,
    responseDeserialize: deserialize_clientInterface_EmptyMessage,
  },
  // Gestalts
gestaltsGestaltList: {
    path: '/clientInterface.Client/GestaltsGestaltList',
    requestStream: false,
    responseStream: true,
    requestType: Client_pb.EmptyMessage,
    responseType: Gestalts_pb.Gestalt,
    requestSerialize: serialize_clientInterface_EmptyMessage,
    requestDeserialize: deserialize_clientInterface_EmptyMessage,
    responseSerialize: serialize_Gestalt_Gestalt,
    responseDeserialize: deserialize_Gestalt_Gestalt,
  },
  gestaltsGestaltGetByNode: {
    path: '/clientInterface.Client/GestaltsGestaltGetByNode',
    requestStream: false,
    responseStream: false,
    requestType: Nodes_pb.Node,
    responseType: Gestalts_pb.Graph,
    requestSerialize: serialize_Node_Node,
    requestDeserialize: deserialize_Node_Node,
    responseSerialize: serialize_Gestalt_Graph,
    responseDeserialize: deserialize_Gestalt_Graph,
  },
  gestaltsGestaltGetByIdentity: {
    path: '/clientInterface.Client/GestaltsGestaltGetByIdentity',
    requestStream: false,
    responseStream: false,
    requestType: Identities_pb.Provider,
    responseType: Gestalts_pb.Graph,
    requestSerialize: serialize_Identitiy_Provider,
    requestDeserialize: deserialize_Identitiy_Provider,
    responseSerialize: serialize_Gestalt_Graph,
    responseDeserialize: deserialize_Gestalt_Graph,
  },
  gestaltsDiscoveryByNode: {
    path: '/clientInterface.Client/GestaltsDiscoveryByNode',
    requestStream: false,
    responseStream: false,
    requestType: Nodes_pb.Node,
    responseType: Client_pb.EmptyMessage,
    requestSerialize: serialize_Node_Node,
    requestDeserialize: deserialize_Node_Node,
    responseSerialize: serialize_clientInterface_EmptyMessage,
    responseDeserialize: deserialize_clientInterface_EmptyMessage,
  },
  gestaltsDiscoveryByIdentity: {
    path: '/clientInterface.Client/GestaltsDiscoveryByIdentity',
    requestStream: false,
    responseStream: false,
    requestType: Identities_pb.Provider,
    responseType: Client_pb.EmptyMessage,
    requestSerialize: serialize_Identitiy_Provider,
    requestDeserialize: deserialize_Identitiy_Provider,
    responseSerialize: serialize_clientInterface_EmptyMessage,
    responseDeserialize: deserialize_clientInterface_EmptyMessage,
  },
  gestaltsActionsGetByNode: {
    path: '/clientInterface.Client/GestaltsActionsGetByNode',
    requestStream: false,
    responseStream: false,
    requestType: Nodes_pb.Node,
    responseType: Permissions_pb.Actions,
    requestSerialize: serialize_Node_Node,
    requestDeserialize: deserialize_Node_Node,
    responseSerialize: serialize_Permission_Actions,
    responseDeserialize: deserialize_Permission_Actions,
  },
  gestaltsActionsGetByIdentity: {
    path: '/clientInterface.Client/GestaltsActionsGetByIdentity',
    requestStream: false,
    responseStream: false,
    requestType: Identities_pb.Provider,
    responseType: Permissions_pb.Actions,
    requestSerialize: serialize_Identitiy_Provider,
    requestDeserialize: deserialize_Identitiy_Provider,
    responseSerialize: serialize_Permission_Actions,
    responseDeserialize: deserialize_Permission_Actions,
  },
  gestaltsActionsSetByNode: {
    path: '/clientInterface.Client/GestaltsActionsSetByNode',
    requestStream: false,
    responseStream: false,
    requestType: Permissions_pb.ActionSet,
    responseType: Client_pb.EmptyMessage,
    requestSerialize: serialize_Permission_ActionSet,
    requestDeserialize: deserialize_Permission_ActionSet,
    responseSerialize: serialize_clientInterface_EmptyMessage,
    responseDeserialize: deserialize_clientInterface_EmptyMessage,
  },
  gestaltsActionsSetByIdentity: {
    path: '/clientInterface.Client/GestaltsActionsSetByIdentity',
    requestStream: false,
    responseStream: false,
    requestType: Permissions_pb.ActionSet,
    responseType: Client_pb.EmptyMessage,
    requestSerialize: serialize_Permission_ActionSet,
    requestDeserialize: deserialize_Permission_ActionSet,
    responseSerialize: serialize_clientInterface_EmptyMessage,
    responseDeserialize: deserialize_clientInterface_EmptyMessage,
  },
  gestaltsActionsUnsetByNode: {
    path: '/clientInterface.Client/GestaltsActionsUnsetByNode',
    requestStream: false,
    responseStream: false,
    requestType: Permissions_pb.ActionSet,
    responseType: Client_pb.EmptyMessage,
    requestSerialize: serialize_Permission_ActionSet,
    requestDeserialize: deserialize_Permission_ActionSet,
    responseSerialize: serialize_clientInterface_EmptyMessage,
    responseDeserialize: deserialize_clientInterface_EmptyMessage,
  },
  gestaltsActionsUnsetByIdentity: {
    path: '/clientInterface.Client/GestaltsActionsUnsetByIdentity',
    requestStream: false,
    responseStream: false,
    requestType: Permissions_pb.ActionSet,
    responseType: Client_pb.EmptyMessage,
    requestSerialize: serialize_Permission_ActionSet,
    requestDeserialize: deserialize_Permission_ActionSet,
    responseSerialize: serialize_clientInterface_EmptyMessage,
    responseDeserialize: deserialize_clientInterface_EmptyMessage,
  },
  // Notifications
notificationsSend: {
    path: '/clientInterface.Client/NotificationsSend',
    requestStream: false,
    responseStream: false,
    requestType: Notifications_pb.Send,
    responseType: Client_pb.EmptyMessage,
    requestSerialize: serialize_Notification_Send,
    requestDeserialize: deserialize_Notification_Send,
    responseSerialize: serialize_clientInterface_EmptyMessage,
    responseDeserialize: deserialize_clientInterface_EmptyMessage,
  },
  notificationsRead: {
    path: '/clientInterface.Client/NotificationsRead',
    requestStream: false,
    responseStream: false,
    requestType: Notifications_pb.Read,
    responseType: Notifications_pb.List,
    requestSerialize: serialize_Notification_Read,
    requestDeserialize: deserialize_Notification_Read,
    responseSerialize: serialize_Notification_List,
    responseDeserialize: deserialize_Notification_List,
  },
  notificationsClear: {
    path: '/clientInterface.Client/NotificationsClear',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.EmptyMessage,
    responseType: Client_pb.EmptyMessage,
    requestSerialize: serialize_clientInterface_EmptyMessage,
    requestDeserialize: deserialize_clientInterface_EmptyMessage,
    responseSerialize: serialize_clientInterface_EmptyMessage,
    responseDeserialize: deserialize_clientInterface_EmptyMessage,
  },
};

exports.ClientClient = grpc.makeGenericClientConstructor(ClientService);
