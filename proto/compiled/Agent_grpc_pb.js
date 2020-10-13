// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var Agent_pb = require('./Agent_pb.js');

function serialize_agentInterface_AgentStatusMessage(arg) {
  if (!(arg instanceof Agent_pb.AgentStatusMessage)) {
    throw new Error('Expected argument of type agentInterface.AgentStatusMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_AgentStatusMessage(buffer_arg) {
  return Agent_pb.AgentStatusMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agentInterface_BooleanMessage(arg) {
  if (!(arg instanceof Agent_pb.BooleanMessage)) {
    throw new Error('Expected argument of type agentInterface.BooleanMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_BooleanMessage(buffer_arg) {
  return Agent_pb.BooleanMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agentInterface_ContactPeerMessage(arg) {
  if (!(arg instanceof Agent_pb.ContactPeerMessage)) {
    throw new Error('Expected argument of type agentInterface.ContactPeerMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_ContactPeerMessage(buffer_arg) {
  return Agent_pb.ContactPeerMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agentInterface_DecryptFileMessage(arg) {
  if (!(arg instanceof Agent_pb.DecryptFileMessage)) {
    throw new Error('Expected argument of type agentInterface.DecryptFileMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_DecryptFileMessage(buffer_arg) {
  return Agent_pb.DecryptFileMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agentInterface_DeriveKeyMessage(arg) {
  if (!(arg instanceof Agent_pb.DeriveKeyMessage)) {
    throw new Error('Expected argument of type agentInterface.DeriveKeyMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_DeriveKeyMessage(buffer_arg) {
  return Agent_pb.DeriveKeyMessage.deserializeBinary(new Uint8Array(buffer_arg));
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

function serialize_agentInterface_EncryptFileMessage(arg) {
  if (!(arg instanceof Agent_pb.EncryptFileMessage)) {
    throw new Error('Expected argument of type agentInterface.EncryptFileMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_EncryptFileMessage(buffer_arg) {
  return Agent_pb.EncryptFileMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agentInterface_KeyPairMessage(arg) {
  if (!(arg instanceof Agent_pb.KeyPairMessage)) {
    throw new Error('Expected argument of type agentInterface.KeyPairMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_KeyPairMessage(buffer_arg) {
  return Agent_pb.KeyPairMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agentInterface_NewClientCertificateMessage(arg) {
  if (!(arg instanceof Agent_pb.NewClientCertificateMessage)) {
    throw new Error('Expected argument of type agentInterface.NewClientCertificateMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_NewClientCertificateMessage(buffer_arg) {
  return Agent_pb.NewClientCertificateMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agentInterface_NewNodeMessage(arg) {
  if (!(arg instanceof Agent_pb.NewNodeMessage)) {
    throw new Error('Expected argument of type agentInterface.NewNodeMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_NewNodeMessage(buffer_arg) {
  return Agent_pb.NewNodeMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agentInterface_NewOAuthTokenMessage(arg) {
  if (!(arg instanceof Agent_pb.NewOAuthTokenMessage)) {
    throw new Error('Expected argument of type agentInterface.NewOAuthTokenMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_NewOAuthTokenMessage(buffer_arg) {
  return Agent_pb.NewOAuthTokenMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agentInterface_OAuthClientMessage(arg) {
  if (!(arg instanceof Agent_pb.OAuthClientMessage)) {
    throw new Error('Expected argument of type agentInterface.OAuthClientMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_OAuthClientMessage(buffer_arg) {
  return Agent_pb.OAuthClientMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agentInterface_PeerInfoMessage(arg) {
  if (!(arg instanceof Agent_pb.PeerInfoMessage)) {
    throw new Error('Expected argument of type agentInterface.PeerInfoMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_PeerInfoMessage(buffer_arg) {
  return Agent_pb.PeerInfoMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agentInterface_SecretContentMessage(arg) {
  if (!(arg instanceof Agent_pb.SecretContentMessage)) {
    throw new Error('Expected argument of type agentInterface.SecretContentMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_SecretContentMessage(buffer_arg) {
  return Agent_pb.SecretContentMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agentInterface_SecretPathMessage(arg) {
  if (!(arg instanceof Agent_pb.SecretPathMessage)) {
    throw new Error('Expected argument of type agentInterface.SecretPathMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_SecretPathMessage(buffer_arg) {
  return Agent_pb.SecretPathMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agentInterface_SignFileMessage(arg) {
  if (!(arg instanceof Agent_pb.SignFileMessage)) {
    throw new Error('Expected argument of type agentInterface.SignFileMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_SignFileMessage(buffer_arg) {
  return Agent_pb.SignFileMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agentInterface_StringListMessage(arg) {
  if (!(arg instanceof Agent_pb.StringListMessage)) {
    throw new Error('Expected argument of type agentInterface.StringListMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_StringListMessage(buffer_arg) {
  return Agent_pb.StringListMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agentInterface_StringMessage(arg) {
  if (!(arg instanceof Agent_pb.StringMessage)) {
    throw new Error('Expected argument of type agentInterface.StringMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_StringMessage(buffer_arg) {
  return Agent_pb.StringMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agentInterface_VaultPathMessage(arg) {
  if (!(arg instanceof Agent_pb.VaultPathMessage)) {
    throw new Error('Expected argument of type agentInterface.VaultPathMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_VaultPathMessage(buffer_arg) {
  return Agent_pb.VaultPathMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agentInterface_VerifyFileMessage(arg) {
  if (!(arg instanceof Agent_pb.VerifyFileMessage)) {
    throw new Error('Expected argument of type agentInterface.VerifyFileMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_VerifyFileMessage(buffer_arg) {
  return Agent_pb.VerifyFileMessage.deserializeBinary(new Uint8Array(buffer_arg));
}


// /////////////////
// Agent Service //
// /////////////////
var AgentService = exports.AgentService = {
  addPeer: {
    path: '/agentInterface.Agent/AddPeer',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.PeerInfoMessage,
    responseType: Agent_pb.BooleanMessage,
    requestSerialize: serialize_agentInterface_PeerInfoMessage,
    requestDeserialize: deserialize_agentInterface_PeerInfoMessage,
    responseSerialize: serialize_agentInterface_BooleanMessage,
    responseDeserialize: deserialize_agentInterface_BooleanMessage,
  },
  decryptFile: {
    path: '/agentInterface.Agent/DecryptFile',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.DecryptFileMessage,
    responseType: Agent_pb.StringMessage,
    requestSerialize: serialize_agentInterface_DecryptFileMessage,
    requestDeserialize: deserialize_agentInterface_DecryptFileMessage,
    responseSerialize: serialize_agentInterface_StringMessage,
    responseDeserialize: deserialize_agentInterface_StringMessage,
  },
  deleteKey: {
    path: '/agentInterface.Agent/DeleteKey',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.StringMessage,
    responseType: Agent_pb.BooleanMessage,
    requestSerialize: serialize_agentInterface_StringMessage,
    requestDeserialize: deserialize_agentInterface_StringMessage,
    responseSerialize: serialize_agentInterface_BooleanMessage,
    responseDeserialize: deserialize_agentInterface_BooleanMessage,
  },
  deleteSecret: {
    path: '/agentInterface.Agent/DeleteSecret',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.SecretPathMessage,
    responseType: Agent_pb.BooleanMessage,
    requestSerialize: serialize_agentInterface_SecretPathMessage,
    requestDeserialize: deserialize_agentInterface_SecretPathMessage,
    responseSerialize: serialize_agentInterface_BooleanMessage,
    responseDeserialize: deserialize_agentInterface_BooleanMessage,
  },
  deleteVault: {
    path: '/agentInterface.Agent/DeleteVault',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.StringMessage,
    responseType: Agent_pb.BooleanMessage,
    requestSerialize: serialize_agentInterface_StringMessage,
    requestDeserialize: deserialize_agentInterface_StringMessage,
    responseSerialize: serialize_agentInterface_BooleanMessage,
    responseDeserialize: deserialize_agentInterface_BooleanMessage,
  },
  deriveKey: {
    path: '/agentInterface.Agent/DeriveKey',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.DeriveKeyMessage,
    responseType: Agent_pb.BooleanMessage,
    requestSerialize: serialize_agentInterface_DeriveKeyMessage,
    requestDeserialize: deserialize_agentInterface_DeriveKeyMessage,
    responseSerialize: serialize_agentInterface_BooleanMessage,
    responseDeserialize: deserialize_agentInterface_BooleanMessage,
  },
  encryptFile: {
    path: '/agentInterface.Agent/EncryptFile',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.EncryptFileMessage,
    responseType: Agent_pb.StringMessage,
    requestSerialize: serialize_agentInterface_EncryptFileMessage,
    requestDeserialize: deserialize_agentInterface_EncryptFileMessage,
    responseSerialize: serialize_agentInterface_StringMessage,
    responseDeserialize: deserialize_agentInterface_StringMessage,
  },
  findPeer: {
    path: '/agentInterface.Agent/FindPeer',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.ContactPeerMessage,
    responseType: Agent_pb.BooleanMessage,
    requestSerialize: serialize_agentInterface_ContactPeerMessage,
    requestDeserialize: deserialize_agentInterface_ContactPeerMessage,
    responseSerialize: serialize_agentInterface_BooleanMessage,
    responseDeserialize: deserialize_agentInterface_BooleanMessage,
  },
  findSocialPeer: {
    path: '/agentInterface.Agent/FindSocialPeer',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.ContactPeerMessage,
    responseType: Agent_pb.BooleanMessage,
    requestSerialize: serialize_agentInterface_ContactPeerMessage,
    requestDeserialize: deserialize_agentInterface_ContactPeerMessage,
    responseSerialize: serialize_agentInterface_BooleanMessage,
    responseDeserialize: deserialize_agentInterface_BooleanMessage,
  },
  getOAuthClient: {
    path: '/agentInterface.Agent/GetOAuthClient',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.EmptyMessage,
    responseType: Agent_pb.OAuthClientMessage,
    requestSerialize: serialize_agentInterface_EmptyMessage,
    requestDeserialize: deserialize_agentInterface_EmptyMessage,
    responseSerialize: serialize_agentInterface_OAuthClientMessage,
    responseDeserialize: deserialize_agentInterface_OAuthClientMessage,
  },
  getKey: {
    path: '/agentInterface.Agent/GetKey',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.StringMessage,
    responseType: Agent_pb.StringMessage,
    requestSerialize: serialize_agentInterface_StringMessage,
    requestDeserialize: deserialize_agentInterface_StringMessage,
    responseSerialize: serialize_agentInterface_StringMessage,
    responseDeserialize: deserialize_agentInterface_StringMessage,
  },
  getLocalPeerInfo: {
    path: '/agentInterface.Agent/GetLocalPeerInfo',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.EmptyMessage,
    responseType: Agent_pb.PeerInfoMessage,
    requestSerialize: serialize_agentInterface_EmptyMessage,
    requestDeserialize: deserialize_agentInterface_EmptyMessage,
    responseSerialize: serialize_agentInterface_PeerInfoMessage,
    responseDeserialize: deserialize_agentInterface_PeerInfoMessage,
  },
  getPeerInfo: {
    path: '/agentInterface.Agent/GetPeerInfo',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.StringMessage,
    responseType: Agent_pb.PeerInfoMessage,
    requestSerialize: serialize_agentInterface_StringMessage,
    requestDeserialize: deserialize_agentInterface_StringMessage,
    responseSerialize: serialize_agentInterface_PeerInfoMessage,
    responseDeserialize: deserialize_agentInterface_PeerInfoMessage,
  },
  getPrimaryKeyPair: {
    path: '/agentInterface.Agent/GetPrimaryKeyPair',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.BooleanMessage,
    responseType: Agent_pb.KeyPairMessage,
    requestSerialize: serialize_agentInterface_BooleanMessage,
    requestDeserialize: deserialize_agentInterface_BooleanMessage,
    responseSerialize: serialize_agentInterface_KeyPairMessage,
    responseDeserialize: deserialize_agentInterface_KeyPairMessage,
  },
  getRootCertificate: {
    path: '/agentInterface.Agent/GetRootCertificate',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.EmptyMessage,
    responseType: Agent_pb.StringMessage,
    requestSerialize: serialize_agentInterface_EmptyMessage,
    requestDeserialize: deserialize_agentInterface_EmptyMessage,
    responseSerialize: serialize_agentInterface_StringMessage,
    responseDeserialize: deserialize_agentInterface_StringMessage,
  },
  getSecret: {
    path: '/agentInterface.Agent/GetSecret',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.SecretPathMessage,
    responseType: Agent_pb.StringMessage,
    requestSerialize: serialize_agentInterface_SecretPathMessage,
    requestDeserialize: deserialize_agentInterface_SecretPathMessage,
    responseSerialize: serialize_agentInterface_StringMessage,
    responseDeserialize: deserialize_agentInterface_StringMessage,
  },
  getStatus: {
    path: '/agentInterface.Agent/GetStatus',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.EmptyMessage,
    responseType: Agent_pb.AgentStatusMessage,
    requestSerialize: serialize_agentInterface_EmptyMessage,
    requestDeserialize: deserialize_agentInterface_EmptyMessage,
    responseSerialize: serialize_agentInterface_AgentStatusMessage,
    responseDeserialize: deserialize_agentInterface_AgentStatusMessage,
  },
  listOAuthTokens: {
    path: '/agentInterface.Agent/ListOAuthTokens',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.EmptyMessage,
    responseType: Agent_pb.StringListMessage,
    requestSerialize: serialize_agentInterface_EmptyMessage,
    requestDeserialize: deserialize_agentInterface_EmptyMessage,
    responseSerialize: serialize_agentInterface_StringListMessage,
    responseDeserialize: deserialize_agentInterface_StringListMessage,
  },
  listKeys: {
    path: '/agentInterface.Agent/ListKeys',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.EmptyMessage,
    responseType: Agent_pb.StringListMessage,
    requestSerialize: serialize_agentInterface_EmptyMessage,
    requestDeserialize: deserialize_agentInterface_EmptyMessage,
    responseSerialize: serialize_agentInterface_StringListMessage,
    responseDeserialize: deserialize_agentInterface_StringListMessage,
  },
  listNodes: {
    path: '/agentInterface.Agent/ListNodes',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.BooleanMessage,
    responseType: Agent_pb.StringListMessage,
    requestSerialize: serialize_agentInterface_BooleanMessage,
    requestDeserialize: deserialize_agentInterface_BooleanMessage,
    responseSerialize: serialize_agentInterface_StringListMessage,
    responseDeserialize: deserialize_agentInterface_StringListMessage,
  },
  listPeers: {
    path: '/agentInterface.Agent/ListPeers',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.EmptyMessage,
    responseType: Agent_pb.StringListMessage,
    requestSerialize: serialize_agentInterface_EmptyMessage,
    requestDeserialize: deserialize_agentInterface_EmptyMessage,
    responseSerialize: serialize_agentInterface_StringListMessage,
    responseDeserialize: deserialize_agentInterface_StringListMessage,
  },
  listSecrets: {
    path: '/agentInterface.Agent/ListSecrets',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.StringMessage,
    responseType: Agent_pb.StringListMessage,
    requestSerialize: serialize_agentInterface_StringMessage,
    requestDeserialize: deserialize_agentInterface_StringMessage,
    responseSerialize: serialize_agentInterface_StringListMessage,
    responseDeserialize: deserialize_agentInterface_StringListMessage,
  },
  listVaults: {
    path: '/agentInterface.Agent/ListVaults',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.EmptyMessage,
    responseType: Agent_pb.StringListMessage,
    requestSerialize: serialize_agentInterface_EmptyMessage,
    requestDeserialize: deserialize_agentInterface_EmptyMessage,
    responseSerialize: serialize_agentInterface_StringListMessage,
    responseDeserialize: deserialize_agentInterface_StringListMessage,
  },
  newClientCertificate: {
    path: '/agentInterface.Agent/NewClientCertificate',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.NewClientCertificateMessage,
    responseType: Agent_pb.NewClientCertificateMessage,
    requestSerialize: serialize_agentInterface_NewClientCertificateMessage,
    requestDeserialize: deserialize_agentInterface_NewClientCertificateMessage,
    responseSerialize: serialize_agentInterface_NewClientCertificateMessage,
    responseDeserialize: deserialize_agentInterface_NewClientCertificateMessage,
  },
  newNode: {
    path: '/agentInterface.Agent/NewNode',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.NewNodeMessage,
    responseType: Agent_pb.BooleanMessage,
    requestSerialize: serialize_agentInterface_NewNodeMessage,
    requestDeserialize: deserialize_agentInterface_NewNodeMessage,
    responseSerialize: serialize_agentInterface_BooleanMessage,
    responseDeserialize: deserialize_agentInterface_BooleanMessage,
  },
  newSecret: {
    path: '/agentInterface.Agent/NewSecret',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.SecretContentMessage,
    responseType: Agent_pb.BooleanMessage,
    requestSerialize: serialize_agentInterface_SecretContentMessage,
    requestDeserialize: deserialize_agentInterface_SecretContentMessage,
    responseSerialize: serialize_agentInterface_BooleanMessage,
    responseDeserialize: deserialize_agentInterface_BooleanMessage,
  },
  newOAuthToken: {
    path: '/agentInterface.Agent/NewOAuthToken',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.NewOAuthTokenMessage,
    responseType: Agent_pb.StringMessage,
    requestSerialize: serialize_agentInterface_NewOAuthTokenMessage,
    requestDeserialize: deserialize_agentInterface_NewOAuthTokenMessage,
    responseSerialize: serialize_agentInterface_StringMessage,
    responseDeserialize: deserialize_agentInterface_StringMessage,
  },
  newVault: {
    path: '/agentInterface.Agent/NewVault',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.StringMessage,
    responseType: Agent_pb.BooleanMessage,
    requestSerialize: serialize_agentInterface_StringMessage,
    requestDeserialize: deserialize_agentInterface_StringMessage,
    responseSerialize: serialize_agentInterface_BooleanMessage,
    responseDeserialize: deserialize_agentInterface_BooleanMessage,
  },
  pingPeer: {
    path: '/agentInterface.Agent/PingPeer',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.ContactPeerMessage,
    responseType: Agent_pb.BooleanMessage,
    requestSerialize: serialize_agentInterface_ContactPeerMessage,
    requestDeserialize: deserialize_agentInterface_ContactPeerMessage,
    responseSerialize: serialize_agentInterface_BooleanMessage,
    responseDeserialize: deserialize_agentInterface_BooleanMessage,
  },
  pullVault: {
    path: '/agentInterface.Agent/PullVault',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.VaultPathMessage,
    responseType: Agent_pb.BooleanMessage,
    requestSerialize: serialize_agentInterface_VaultPathMessage,
    requestDeserialize: deserialize_agentInterface_VaultPathMessage,
    responseSerialize: serialize_agentInterface_BooleanMessage,
    responseDeserialize: deserialize_agentInterface_BooleanMessage,
  },
  registerNode: {
    path: '/agentInterface.Agent/RegisterNode',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.StringMessage,
    responseType: Agent_pb.BooleanMessage,
    requestSerialize: serialize_agentInterface_StringMessage,
    requestDeserialize: deserialize_agentInterface_StringMessage,
    responseSerialize: serialize_agentInterface_BooleanMessage,
    responseDeserialize: deserialize_agentInterface_BooleanMessage,
  },
  revokeOAuthToken: {
    path: '/agentInterface.Agent/RevokeOAuthToken',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.StringMessage,
    responseType: Agent_pb.BooleanMessage,
    requestSerialize: serialize_agentInterface_StringMessage,
    requestDeserialize: deserialize_agentInterface_StringMessage,
    responseSerialize: serialize_agentInterface_BooleanMessage,
    responseDeserialize: deserialize_agentInterface_BooleanMessage,
  },
  requestHolePunch: {
    path: '/agentInterface.Agent/RequestHolePunch',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.StringMessage,
    responseType: Agent_pb.BooleanMessage,
    requestSerialize: serialize_agentInterface_StringMessage,
    requestDeserialize: deserialize_agentInterface_StringMessage,
    responseSerialize: serialize_agentInterface_BooleanMessage,
    responseDeserialize: deserialize_agentInterface_BooleanMessage,
  },
  requestRelay: {
    path: '/agentInterface.Agent/RequestRelay',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.StringMessage,
    responseType: Agent_pb.BooleanMessage,
    requestSerialize: serialize_agentInterface_StringMessage,
    requestDeserialize: deserialize_agentInterface_StringMessage,
    responseSerialize: serialize_agentInterface_BooleanMessage,
    responseDeserialize: deserialize_agentInterface_BooleanMessage,
  },
  scanVaultNames: {
    path: '/agentInterface.Agent/ScanVaultNames',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.StringMessage,
    responseType: Agent_pb.StringListMessage,
    requestSerialize: serialize_agentInterface_StringMessage,
    requestDeserialize: deserialize_agentInterface_StringMessage,
    responseSerialize: serialize_agentInterface_StringListMessage,
    responseDeserialize: deserialize_agentInterface_StringListMessage,
  },
  signFile: {
    path: '/agentInterface.Agent/SignFile',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.SignFileMessage,
    responseType: Agent_pb.StringMessage,
    requestSerialize: serialize_agentInterface_SignFileMessage,
    requestDeserialize: deserialize_agentInterface_SignFileMessage,
    responseSerialize: serialize_agentInterface_StringMessage,
    responseDeserialize: deserialize_agentInterface_StringMessage,
  },
  stopAgent: {
    path: '/agentInterface.Agent/StopAgent',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.EmptyMessage,
    responseType: Agent_pb.BooleanMessage,
    requestSerialize: serialize_agentInterface_EmptyMessage,
    requestDeserialize: deserialize_agentInterface_EmptyMessage,
    responseSerialize: serialize_agentInterface_BooleanMessage,
    responseDeserialize: deserialize_agentInterface_BooleanMessage,
  },
  toggleStealthMode: {
    path: '/agentInterface.Agent/ToggleStealthMode',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.BooleanMessage,
    responseType: Agent_pb.BooleanMessage,
    requestSerialize: serialize_agentInterface_BooleanMessage,
    requestDeserialize: deserialize_agentInterface_BooleanMessage,
    responseSerialize: serialize_agentInterface_BooleanMessage,
    responseDeserialize: deserialize_agentInterface_BooleanMessage,
  },
  updateLocalPeerInfo: {
    path: '/agentInterface.Agent/UpdateLocalPeerInfo',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.PeerInfoMessage,
    responseType: Agent_pb.BooleanMessage,
    requestSerialize: serialize_agentInterface_PeerInfoMessage,
    requestDeserialize: deserialize_agentInterface_PeerInfoMessage,
    responseSerialize: serialize_agentInterface_BooleanMessage,
    responseDeserialize: deserialize_agentInterface_BooleanMessage,
  },
  updatePeerInfo: {
    path: '/agentInterface.Agent/UpdatePeerInfo',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.PeerInfoMessage,
    responseType: Agent_pb.BooleanMessage,
    requestSerialize: serialize_agentInterface_PeerInfoMessage,
    requestDeserialize: deserialize_agentInterface_PeerInfoMessage,
    responseSerialize: serialize_agentInterface_BooleanMessage,
    responseDeserialize: deserialize_agentInterface_BooleanMessage,
  },
  updateSecret: {
    path: '/agentInterface.Agent/UpdateSecret',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.SecretContentMessage,
    responseType: Agent_pb.BooleanMessage,
    requestSerialize: serialize_agentInterface_SecretContentMessage,
    requestDeserialize: deserialize_agentInterface_SecretContentMessage,
    responseSerialize: serialize_agentInterface_BooleanMessage,
    responseDeserialize: deserialize_agentInterface_BooleanMessage,
  },
  verifyFile: {
    path: '/agentInterface.Agent/VerifyFile',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.VerifyFileMessage,
    responseType: Agent_pb.BooleanMessage,
    requestSerialize: serialize_agentInterface_VerifyFileMessage,
    requestDeserialize: deserialize_agentInterface_VerifyFileMessage,
    responseSerialize: serialize_agentInterface_BooleanMessage,
    responseDeserialize: deserialize_agentInterface_BooleanMessage,
  },
};

exports.AgentClient = grpc.makeGenericClientConstructor(AgentService);
