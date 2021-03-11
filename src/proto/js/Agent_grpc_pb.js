// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var Agent_pb = require('./Agent_pb.js');

function serialize_agentInterface_AgentStatusMessage(arg) {
  if (!(arg instanceof Agent_pb.AgentStatusMessage)) {
    throw new Error(
      'Expected argument of type agentInterface.AgentStatusMessage',
    );
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_AgentStatusMessage(buffer_arg) {
  return Agent_pb.AgentStatusMessage.deserializeBinary(
    new Uint8Array(buffer_arg),
  );
}

function serialize_agentInterface_AugmentKeynodeReply(arg) {
  if (!(arg instanceof Agent_pb.AugmentKeynodeReply)) {
    throw new Error(
      'Expected argument of type agentInterface.AugmentKeynodeReply',
    );
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_AugmentKeynodeReply(buffer_arg) {
  return Agent_pb.AugmentKeynodeReply.deserializeBinary(
    new Uint8Array(buffer_arg),
  );
}

function serialize_agentInterface_AugmentKeynodeRequest(arg) {
  if (!(arg instanceof Agent_pb.AugmentKeynodeRequest)) {
    throw new Error(
      'Expected argument of type agentInterface.AugmentKeynodeRequest',
    );
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_AugmentKeynodeRequest(buffer_arg) {
  return Agent_pb.AugmentKeynodeRequest.deserializeBinary(
    new Uint8Array(buffer_arg),
  );
}

function serialize_agentInterface_AuthenticateProviderReply(arg) {
  if (!(arg instanceof Agent_pb.AuthenticateProviderReply)) {
    throw new Error(
      'Expected argument of type agentInterface.AuthenticateProviderReply',
    );
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_AuthenticateProviderReply(buffer_arg) {
  return Agent_pb.AuthenticateProviderReply.deserializeBinary(
    new Uint8Array(buffer_arg),
  );
}

function serialize_agentInterface_AuthenticateProviderRequest(arg) {
  if (!(arg instanceof Agent_pb.AuthenticateProviderRequest)) {
    throw new Error(
      'Expected argument of type agentInterface.AuthenticateProviderRequest',
    );
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_AuthenticateProviderRequest(buffer_arg) {
  return Agent_pb.AuthenticateProviderRequest.deserializeBinary(
    new Uint8Array(buffer_arg),
  );
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

function serialize_agentInterface_ContactNodeMessage(arg) {
  if (!(arg instanceof Agent_pb.ContactNodeMessage)) {
    throw new Error(
      'Expected argument of type agentInterface.ContactNodeMessage',
    );
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_ContactNodeMessage(buffer_arg) {
  return Agent_pb.ContactNodeMessage.deserializeBinary(
    new Uint8Array(buffer_arg),
  );
}

function serialize_agentInterface_DecryptFileMessage(arg) {
  if (!(arg instanceof Agent_pb.DecryptFileMessage)) {
    throw new Error(
      'Expected argument of type agentInterface.DecryptFileMessage',
    );
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_DecryptFileMessage(buffer_arg) {
  return Agent_pb.DecryptFileMessage.deserializeBinary(
    new Uint8Array(buffer_arg),
  );
}

function serialize_agentInterface_DeriveKeyMessage(arg) {
  if (!(arg instanceof Agent_pb.DeriveKeyMessage)) {
    throw new Error(
      'Expected argument of type agentInterface.DeriveKeyMessage',
    );
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_DeriveKeyMessage(buffer_arg) {
  return Agent_pb.DeriveKeyMessage.deserializeBinary(
    new Uint8Array(buffer_arg),
  );
}

function serialize_agentInterface_DeriveKeyPairMessage(arg) {
  if (!(arg instanceof Agent_pb.DeriveKeyPairMessage)) {
    throw new Error(
      'Expected argument of type agentInterface.DeriveKeyPairMessage',
    );
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_DeriveKeyPairMessage(buffer_arg) {
  return Agent_pb.DeriveKeyPairMessage.deserializeBinary(
    new Uint8Array(buffer_arg),
  );
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
    throw new Error(
      'Expected argument of type agentInterface.EncryptFileMessage',
    );
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_EncryptFileMessage(buffer_arg) {
  return Agent_pb.EncryptFileMessage.deserializeBinary(
    new Uint8Array(buffer_arg),
  );
}

function serialize_agentInterface_GestaltListMessage(arg) {
  if (!(arg instanceof Agent_pb.GestaltListMessage)) {
    throw new Error(
      'Expected argument of type agentInterface.GestaltListMessage',
    );
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_GestaltListMessage(buffer_arg) {
  return Agent_pb.GestaltListMessage.deserializeBinary(
    new Uint8Array(buffer_arg),
  );
}

function serialize_agentInterface_GestaltMessage(arg) {
  if (!(arg instanceof Agent_pb.GestaltMessage)) {
    throw new Error('Expected argument of type agentInterface.GestaltMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_GestaltMessage(buffer_arg) {
  return Agent_pb.GestaltMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agentInterface_IdentityInfo(arg) {
  if (!(arg instanceof Agent_pb.IdentityInfo)) {
    throw new Error('Expected argument of type agentInterface.IdentityInfo');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_IdentityInfo(buffer_arg) {
  return Agent_pb.IdentityInfo.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agentInterface_IdentityInfoMessage(arg) {
  if (!(arg instanceof Agent_pb.IdentityInfoMessage)) {
    throw new Error(
      'Expected argument of type agentInterface.IdentityInfoMessage',
    );
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_IdentityInfoMessage(buffer_arg) {
  return Agent_pb.IdentityInfoMessage.deserializeBinary(
    new Uint8Array(buffer_arg),
  );
}

function serialize_agentInterface_IdentityMessage(arg) {
  if (!(arg instanceof Agent_pb.IdentityMessage)) {
    throw new Error('Expected argument of type agentInterface.IdentityMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_IdentityMessage(buffer_arg) {
  return Agent_pb.IdentityMessage.deserializeBinary(new Uint8Array(buffer_arg));
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
    throw new Error(
      'Expected argument of type agentInterface.NewClientCertificateMessage',
    );
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_NewClientCertificateMessage(buffer_arg) {
  return Agent_pb.NewClientCertificateMessage.deserializeBinary(
    new Uint8Array(buffer_arg),
  );
}

function serialize_agentInterface_NewKeyPairMessage(arg) {
  if (!(arg instanceof Agent_pb.NewKeyPairMessage)) {
    throw new Error(
      'Expected argument of type agentInterface.NewKeyPairMessage',
    );
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_NewKeyPairMessage(buffer_arg) {
  return Agent_pb.NewKeyPairMessage.deserializeBinary(
    new Uint8Array(buffer_arg),
  );
}

function serialize_agentInterface_NewOAuthTokenMessage(arg) {
  if (!(arg instanceof Agent_pb.NewOAuthTokenMessage)) {
    throw new Error(
      'Expected argument of type agentInterface.NewOAuthTokenMessage',
    );
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_NewOAuthTokenMessage(buffer_arg) {
  return Agent_pb.NewOAuthTokenMessage.deserializeBinary(
    new Uint8Array(buffer_arg),
  );
}

function serialize_agentInterface_NodeAliasMessage(arg) {
  if (!(arg instanceof Agent_pb.NodeAliasMessage)) {
    throw new Error(
      'Expected argument of type agentInterface.NodeAliasMessage',
    );
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_NodeAliasMessage(buffer_arg) {
  return Agent_pb.NodeAliasMessage.deserializeBinary(
    new Uint8Array(buffer_arg),
  );
}

function serialize_agentInterface_NodeInfoMessage(arg) {
  if (!(arg instanceof Agent_pb.NodeInfoMessage)) {
    throw new Error('Expected argument of type agentInterface.NodeInfoMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_NodeInfoMessage(buffer_arg) {
  return Agent_pb.NodeInfoMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agentInterface_NodeInfoReadOnlyMessage(arg) {
  if (!(arg instanceof Agent_pb.NodeInfoReadOnlyMessage)) {
    throw new Error(
      'Expected argument of type agentInterface.NodeInfoReadOnlyMessage',
    );
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_NodeInfoReadOnlyMessage(buffer_arg) {
  return Agent_pb.NodeInfoReadOnlyMessage.deserializeBinary(
    new Uint8Array(buffer_arg),
  );
}

function serialize_agentInterface_NodeMessage(arg) {
  if (!(arg instanceof Agent_pb.NodeMessage)) {
    throw new Error('Expected argument of type agentInterface.NodeMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_NodeMessage(buffer_arg) {
  return Agent_pb.NodeMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agentInterface_NodeNotifMessage(arg) {
  if (!(arg instanceof Agent_pb.NodeNotifMessage)) {
    throw new Error(
      'Expected argument of type agentInterface.NodeNotifMessage',
    );
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_NodeNotifMessage(buffer_arg) {
  return Agent_pb.NodeNotifMessage.deserializeBinary(
    new Uint8Array(buffer_arg),
  );
}

function serialize_agentInterface_OAuthClientMessage(arg) {
  if (!(arg instanceof Agent_pb.OAuthClientMessage)) {
    throw new Error(
      'Expected argument of type agentInterface.OAuthClientMessage',
    );
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_OAuthClientMessage(buffer_arg) {
  return Agent_pb.OAuthClientMessage.deserializeBinary(
    new Uint8Array(buffer_arg),
  );
}

function serialize_agentInterface_ProviderSearchMessage(arg) {
  if (!(arg instanceof Agent_pb.ProviderSearchMessage)) {
    throw new Error(
      'Expected argument of type agentInterface.ProviderSearchMessage',
    );
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_ProviderSearchMessage(buffer_arg) {
  return Agent_pb.ProviderSearchMessage.deserializeBinary(
    new Uint8Array(buffer_arg),
  );
}

function serialize_agentInterface_RecoverKeynodeMessage(arg) {
  if (!(arg instanceof Agent_pb.RecoverKeynodeMessage)) {
    throw new Error(
      'Expected argument of type agentInterface.RecoverKeynodeMessage',
    );
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_RecoverKeynodeMessage(buffer_arg) {
  return Agent_pb.RecoverKeynodeMessage.deserializeBinary(
    new Uint8Array(buffer_arg),
  );
}

function serialize_agentInterface_RenameVaultMessage(arg) {
  if (!(arg instanceof Agent_pb.RenameVaultMessage)) {
    throw new Error(
      'Expected argument of type agentInterface.RenameVaultMessage',
    );
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_RenameVaultMessage(buffer_arg) {
  return Agent_pb.RenameVaultMessage.deserializeBinary(
    new Uint8Array(buffer_arg),
  );
}

function serialize_agentInterface_SecretContentMessage(arg) {
  if (!(arg instanceof Agent_pb.SecretContentMessage)) {
    throw new Error(
      'Expected argument of type agentInterface.SecretContentMessage',
    );
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_SecretContentMessage(buffer_arg) {
  return Agent_pb.SecretContentMessage.deserializeBinary(
    new Uint8Array(buffer_arg),
  );
}

function serialize_agentInterface_SecretPathMessage(arg) {
  if (!(arg instanceof Agent_pb.SecretPathMessage)) {
    throw new Error(
      'Expected argument of type agentInterface.SecretPathMessage',
    );
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_SecretPathMessage(buffer_arg) {
  return Agent_pb.SecretPathMessage.deserializeBinary(
    new Uint8Array(buffer_arg),
  );
}

function serialize_agentInterface_ShareVaultMessage(arg) {
  if (!(arg instanceof Agent_pb.ShareVaultMessage)) {
    throw new Error(
      'Expected argument of type agentInterface.ShareVaultMessage',
    );
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_ShareVaultMessage(buffer_arg) {
  return Agent_pb.ShareVaultMessage.deserializeBinary(
    new Uint8Array(buffer_arg),
  );
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
    throw new Error(
      'Expected argument of type agentInterface.StringListMessage',
    );
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_StringListMessage(buffer_arg) {
  return Agent_pb.StringListMessage.deserializeBinary(
    new Uint8Array(buffer_arg),
  );
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

function serialize_agentInterface_UnlockNodeMessage(arg) {
  if (!(arg instanceof Agent_pb.UnlockNodeMessage)) {
    throw new Error(
      'Expected argument of type agentInterface.UnlockNodeMessage',
    );
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_UnlockNodeMessage(buffer_arg) {
  return Agent_pb.UnlockNodeMessage.deserializeBinary(
    new Uint8Array(buffer_arg),
  );
}

function serialize_agentInterface_VaultPathMessage(arg) {
  if (!(arg instanceof Agent_pb.VaultPathMessage)) {
    throw new Error(
      'Expected argument of type agentInterface.VaultPathMessage',
    );
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_VaultPathMessage(buffer_arg) {
  return Agent_pb.VaultPathMessage.deserializeBinary(
    new Uint8Array(buffer_arg),
  );
}

function serialize_agentInterface_VaultStatsMessage(arg) {
  if (!(arg instanceof Agent_pb.VaultStatsMessage)) {
    throw new Error(
      'Expected argument of type agentInterface.VaultStatsMessage',
    );
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_VaultStatsMessage(buffer_arg) {
  return Agent_pb.VaultStatsMessage.deserializeBinary(
    new Uint8Array(buffer_arg),
  );
}

function serialize_agentInterface_VerifyFileMessage(arg) {
  if (!(arg instanceof Agent_pb.VerifyFileMessage)) {
    throw new Error(
      'Expected argument of type agentInterface.VerifyFileMessage',
    );
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_VerifyFileMessage(buffer_arg) {
  return Agent_pb.VerifyFileMessage.deserializeBinary(
    new Uint8Array(buffer_arg),
  );
}

// /////////////////
// Agent Service //
// /////////////////
var AgentService = (exports.AgentService = {
  addNode: {
    path: '/agentInterface.Agent/AddNode',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.NodeInfoReadOnlyMessage,
    responseType: Agent_pb.StringMessage,
    requestSerialize: serialize_agentInterface_NodeInfoReadOnlyMessage,
    requestDeserialize: deserialize_agentInterface_NodeInfoReadOnlyMessage,
    responseSerialize: serialize_agentInterface_StringMessage,
    responseDeserialize: deserialize_agentInterface_StringMessage,
  },
  augmentKeynode: {
    path: '/agentInterface.Agent/AugmentKeynode',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.AugmentKeynodeRequest,
    responseType: Agent_pb.AugmentKeynodeReply,
    requestSerialize: serialize_agentInterface_AugmentKeynodeRequest,
    requestDeserialize: deserialize_agentInterface_AugmentKeynodeRequest,
    responseSerialize: serialize_agentInterface_AugmentKeynodeReply,
    responseDeserialize: deserialize_agentInterface_AugmentKeynodeReply,
  },
  authenticateProvider: {
    path: '/agentInterface.Agent/AuthenticateProvider',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.AuthenticateProviderRequest,
    responseType: Agent_pb.AuthenticateProviderReply,
    requestSerialize: serialize_agentInterface_AuthenticateProviderRequest,
    requestDeserialize: deserialize_agentInterface_AuthenticateProviderRequest,
    responseSerialize: serialize_agentInterface_AuthenticateProviderReply,
    responseDeserialize: deserialize_agentInterface_AuthenticateProviderReply,
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
    responseType: Agent_pb.EmptyMessage,
    requestSerialize: serialize_agentInterface_StringMessage,
    requestDeserialize: deserialize_agentInterface_StringMessage,
    responseSerialize: serialize_agentInterface_EmptyMessage,
    responseDeserialize: deserialize_agentInterface_EmptyMessage,
  },
  deleteSecret: {
    path: '/agentInterface.Agent/DeleteSecret',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.SecretPathMessage,
    responseType: Agent_pb.EmptyMessage,
    requestSerialize: serialize_agentInterface_SecretPathMessage,
    requestDeserialize: deserialize_agentInterface_SecretPathMessage,
    responseSerialize: serialize_agentInterface_EmptyMessage,
    responseDeserialize: deserialize_agentInterface_EmptyMessage,
  },
  deleteVault: {
    path: '/agentInterface.Agent/DeleteVault',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.StringMessage,
    responseType: Agent_pb.EmptyMessage,
    requestSerialize: serialize_agentInterface_StringMessage,
    requestDeserialize: deserialize_agentInterface_StringMessage,
    responseSerialize: serialize_agentInterface_EmptyMessage,
    responseDeserialize: deserialize_agentInterface_EmptyMessage,
  },
  deriveKey: {
    path: '/agentInterface.Agent/DeriveKey',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.DeriveKeyMessage,
    responseType: Agent_pb.EmptyMessage,
    requestSerialize: serialize_agentInterface_DeriveKeyMessage,
    requestDeserialize: deserialize_agentInterface_DeriveKeyMessage,
    responseSerialize: serialize_agentInterface_EmptyMessage,
    responseDeserialize: deserialize_agentInterface_EmptyMessage,
  },
  deriveKeyPair: {
    path: '/agentInterface.Agent/DeriveKeyPair',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.DeriveKeyPairMessage,
    responseType: Agent_pb.EmptyMessage,
    requestSerialize: serialize_agentInterface_DeriveKeyPairMessage,
    requestDeserialize: deserialize_agentInterface_DeriveKeyPairMessage,
    responseSerialize: serialize_agentInterface_EmptyMessage,
    responseDeserialize: deserialize_agentInterface_EmptyMessage,
  },
  discoverGestaltIdentity: {
    path: '/agentInterface.Agent/DiscoverGestaltIdentity',
    requestStream: false,
    responseStream: true,
    requestType: Agent_pb.IdentityMessage,
    responseType: Agent_pb.EmptyMessage,
    requestSerialize: serialize_agentInterface_IdentityMessage,
    requestDeserialize: deserialize_agentInterface_IdentityMessage,
    responseSerialize: serialize_agentInterface_EmptyMessage,
    responseDeserialize: deserialize_agentInterface_EmptyMessage,
  },
  discoverGestaltNode: {
    path: '/agentInterface.Agent/DiscoverGestaltNode',
    requestStream: false,
    responseStream: true,
    requestType: Agent_pb.IdentityMessage,
    responseType: Agent_pb.EmptyMessage,
    requestSerialize: serialize_agentInterface_IdentityMessage,
    requestDeserialize: deserialize_agentInterface_IdentityMessage,
    responseSerialize: serialize_agentInterface_EmptyMessage,
    responseDeserialize: deserialize_agentInterface_EmptyMessage,
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
  findNode: {
    path: '/agentInterface.Agent/FindNode',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.ContactNodeMessage,
    responseType: Agent_pb.EmptyMessage,
    requestSerialize: serialize_agentInterface_ContactNodeMessage,
    requestDeserialize: deserialize_agentInterface_ContactNodeMessage,
    responseSerialize: serialize_agentInterface_EmptyMessage,
    responseDeserialize: deserialize_agentInterface_EmptyMessage,
  },
  getConnectedIdentityInfos: {
    path: '/agentInterface.Agent/GetConnectedIdentityInfos',
    requestStream: false,
    responseStream: true,
    requestType: Agent_pb.ProviderSearchMessage,
    responseType: Agent_pb.IdentityInfoMessage,
    requestSerialize: serialize_agentInterface_ProviderSearchMessage,
    requestDeserialize: deserialize_agentInterface_ProviderSearchMessage,
    responseSerialize: serialize_agentInterface_IdentityInfoMessage,
    responseDeserialize: deserialize_agentInterface_IdentityInfoMessage,
  },
  getIdentityInfo: {
    path: '/agentInterface.Agent/GetIdentityInfo',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.EmptyMessage,
    responseType: Agent_pb.IdentityInfo,
    requestSerialize: serialize_agentInterface_EmptyMessage,
    requestDeserialize: deserialize_agentInterface_EmptyMessage,
    responseSerialize: serialize_agentInterface_IdentityInfo,
    responseDeserialize: deserialize_agentInterface_IdentityInfo,
  },
  getGestalts: {
    path: '/agentInterface.Agent/GetGestalts',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.EmptyMessage,
    responseType: Agent_pb.GestaltListMessage,
    requestSerialize: serialize_agentInterface_EmptyMessage,
    requestDeserialize: deserialize_agentInterface_EmptyMessage,
    responseSerialize: serialize_agentInterface_GestaltListMessage,
    responseDeserialize: deserialize_agentInterface_GestaltListMessage,
  },
  getGestaltByIdentity: {
    path: '/agentInterface.Agent/GetGestaltByIdentity',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.IdentityMessage,
    responseType: Agent_pb.GestaltMessage,
    requestSerialize: serialize_agentInterface_IdentityMessage,
    requestDeserialize: deserialize_agentInterface_IdentityMessage,
    responseSerialize: serialize_agentInterface_GestaltMessage,
    responseDeserialize: deserialize_agentInterface_GestaltMessage,
  },
  gestaltIsTrusted: {
    path: '/agentInterface.Agent/GestaltIsTrusted',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.StringMessage,
    responseType: Agent_pb.BooleanMessage,
    requestSerialize: serialize_agentInterface_StringMessage,
    requestDeserialize: deserialize_agentInterface_StringMessage,
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
  getLocalNodeInfo: {
    path: '/agentInterface.Agent/GetLocalNodeInfo',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.EmptyMessage,
    responseType: Agent_pb.NodeInfoMessage,
    requestSerialize: serialize_agentInterface_EmptyMessage,
    requestDeserialize: deserialize_agentInterface_EmptyMessage,
    responseSerialize: serialize_agentInterface_NodeInfoMessage,
    responseDeserialize: deserialize_agentInterface_NodeInfoMessage,
  },
  getNodeInfo: {
    path: '/agentInterface.Agent/GetNodeInfo',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.StringMessage,
    responseType: Agent_pb.NodeInfoMessage,
    requestSerialize: serialize_agentInterface_StringMessage,
    requestDeserialize: deserialize_agentInterface_StringMessage,
    responseSerialize: serialize_agentInterface_NodeInfoMessage,
    responseDeserialize: deserialize_agentInterface_NodeInfoMessage,
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
  getVaultStats: {
    path: '/agentInterface.Agent/GetVaultStats',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.StringMessage,
    responseType: Agent_pb.VaultStatsMessage,
    requestSerialize: serialize_agentInterface_StringMessage,
    requestDeserialize: deserialize_agentInterface_StringMessage,
    responseSerialize: serialize_agentInterface_VaultStatsMessage,
    responseDeserialize: deserialize_agentInterface_VaultStatsMessage,
  },
  initializeNode: {
    path: '/agentInterface.Agent/InitializeNode',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.NewKeyPairMessage,
    responseType: Agent_pb.EmptyMessage,
    requestSerialize: serialize_agentInterface_NewKeyPairMessage,
    requestDeserialize: deserialize_agentInterface_NewKeyPairMessage,
    responseSerialize: serialize_agentInterface_EmptyMessage,
    responseDeserialize: deserialize_agentInterface_EmptyMessage,
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
  lockNode: {
    path: '/agentInterface.Agent/LockNode',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.EmptyMessage,
    responseType: Agent_pb.EmptyMessage,
    requestSerialize: serialize_agentInterface_EmptyMessage,
    requestDeserialize: deserialize_agentInterface_EmptyMessage,
    responseSerialize: serialize_agentInterface_EmptyMessage,
    responseDeserialize: deserialize_agentInterface_EmptyMessage,
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
  newSecret: {
    path: '/agentInterface.Agent/NewSecret',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.SecretContentMessage,
    responseType: Agent_pb.EmptyMessage,
    requestSerialize: serialize_agentInterface_SecretContentMessage,
    requestDeserialize: deserialize_agentInterface_SecretContentMessage,
    responseSerialize: serialize_agentInterface_EmptyMessage,
    responseDeserialize: deserialize_agentInterface_EmptyMessage,
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
    responseType: Agent_pb.EmptyMessage,
    requestSerialize: serialize_agentInterface_StringMessage,
    requestDeserialize: deserialize_agentInterface_StringMessage,
    responseSerialize: serialize_agentInterface_EmptyMessage,
    responseDeserialize: deserialize_agentInterface_EmptyMessage,
  },
  pingNode: {
    path: '/agentInterface.Agent/PingNode',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.ContactNodeMessage,
    responseType: Agent_pb.EmptyMessage,
    requestSerialize: serialize_agentInterface_ContactNodeMessage,
    requestDeserialize: deserialize_agentInterface_ContactNodeMessage,
    responseSerialize: serialize_agentInterface_EmptyMessage,
    responseDeserialize: deserialize_agentInterface_EmptyMessage,
  },
  pullVault: {
    path: '/agentInterface.Agent/PullVault',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.VaultPathMessage,
    responseType: Agent_pb.EmptyMessage,
    requestSerialize: serialize_agentInterface_VaultPathMessage,
    requestDeserialize: deserialize_agentInterface_VaultPathMessage,
    responseSerialize: serialize_agentInterface_EmptyMessage,
    responseDeserialize: deserialize_agentInterface_EmptyMessage,
  },
  renameVault: {
    path: '/agentInterface.Agent/RenameVault',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.RenameVaultMessage,
    responseType: Agent_pb.EmptyMessage,
    requestSerialize: serialize_agentInterface_RenameVaultMessage,
    requestDeserialize: deserialize_agentInterface_RenameVaultMessage,
    responseSerialize: serialize_agentInterface_EmptyMessage,
    responseDeserialize: deserialize_agentInterface_EmptyMessage,
  },
  readMessage: {
    path: '/agentInterface.Agent/ReadMessage',
    requestStream: false,
    responseStream: true,
    requestType: Agent_pb.EmptyMessage,
    responseType: Agent_pb.NodeNotifMessage,
    requestSerialize: serialize_agentInterface_EmptyMessage,
    requestDeserialize: deserialize_agentInterface_EmptyMessage,
    responseSerialize: serialize_agentInterface_NodeNotifMessage,
    responseDeserialize: deserialize_agentInterface_NodeNotifMessage,
  },
  recoverKeynode: {
    path: '/agentInterface.Agent/RecoverKeynode',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.RecoverKeynodeMessage,
    responseType: Agent_pb.EmptyMessage,
    requestSerialize: serialize_agentInterface_RecoverKeynodeMessage,
    requestDeserialize: deserialize_agentInterface_RecoverKeynodeMessage,
    responseSerialize: serialize_agentInterface_EmptyMessage,
    responseDeserialize: deserialize_agentInterface_EmptyMessage,
  },
  revokeOAuthToken: {
    path: '/agentInterface.Agent/RevokeOAuthToken',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.StringMessage,
    responseType: Agent_pb.EmptyMessage,
    requestSerialize: serialize_agentInterface_StringMessage,
    requestDeserialize: deserialize_agentInterface_StringMessage,
    responseSerialize: serialize_agentInterface_EmptyMessage,
    responseDeserialize: deserialize_agentInterface_EmptyMessage,
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
  sendMessage: {
    path: '/agentInterface.Agent/SendMessage',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.NodeMessage,
    responseType: Agent_pb.EmptyMessage,
    requestSerialize: serialize_agentInterface_NodeMessage,
    requestDeserialize: deserialize_agentInterface_NodeMessage,
    responseSerialize: serialize_agentInterface_EmptyMessage,
    responseDeserialize: deserialize_agentInterface_EmptyMessage,
  },
  setAlias: {
    path: '/agentInterface.Agent/SetAlias',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.NodeAliasMessage,
    responseType: Agent_pb.EmptyMessage,
    requestSerialize: serialize_agentInterface_NodeAliasMessage,
    requestDeserialize: deserialize_agentInterface_NodeAliasMessage,
    responseSerialize: serialize_agentInterface_EmptyMessage,
    responseDeserialize: deserialize_agentInterface_EmptyMessage,
  },
  setIdentity: {
    path: '/agentInterface.Agent/SetIdentity',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.StringMessage,
    responseType: Agent_pb.EmptyMessage,
    requestSerialize: serialize_agentInterface_StringMessage,
    requestDeserialize: deserialize_agentInterface_StringMessage,
    responseSerialize: serialize_agentInterface_EmptyMessage,
    responseDeserialize: deserialize_agentInterface_EmptyMessage,
  },
  shareVault: {
    path: '/agentInterface.Agent/ShareVault',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.ShareVaultMessage,
    responseType: Agent_pb.EmptyMessage,
    requestSerialize: serialize_agentInterface_ShareVaultMessage,
    requestDeserialize: deserialize_agentInterface_ShareVaultMessage,
    responseSerialize: serialize_agentInterface_EmptyMessage,
    responseDeserialize: deserialize_agentInterface_EmptyMessage,
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
    responseType: Agent_pb.EmptyMessage,
    requestSerialize: serialize_agentInterface_EmptyMessage,
    requestDeserialize: deserialize_agentInterface_EmptyMessage,
    responseSerialize: serialize_agentInterface_EmptyMessage,
    responseDeserialize: deserialize_agentInterface_EmptyMessage,
  },
  toggleStealthMode: {
    path: '/agentInterface.Agent/ToggleStealthMode',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.BooleanMessage,
    responseType: Agent_pb.EmptyMessage,
    requestSerialize: serialize_agentInterface_BooleanMessage,
    requestDeserialize: deserialize_agentInterface_BooleanMessage,
    responseSerialize: serialize_agentInterface_EmptyMessage,
    responseDeserialize: deserialize_agentInterface_EmptyMessage,
  },
  trustGestalt: {
    path: '/agentInterface.Agent/TrustGestalt',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.StringMessage,
    responseType: Agent_pb.EmptyMessage,
    requestSerialize: serialize_agentInterface_StringMessage,
    requestDeserialize: deserialize_agentInterface_StringMessage,
    responseSerialize: serialize_agentInterface_EmptyMessage,
    responseDeserialize: deserialize_agentInterface_EmptyMessage,
  },
  unlockNode: {
    path: '/agentInterface.Agent/UnlockNode',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.UnlockNodeMessage,
    responseType: Agent_pb.EmptyMessage,
    requestSerialize: serialize_agentInterface_UnlockNodeMessage,
    requestDeserialize: deserialize_agentInterface_UnlockNodeMessage,
    responseSerialize: serialize_agentInterface_EmptyMessage,
    responseDeserialize: deserialize_agentInterface_EmptyMessage,
  },
  unsetAlias: {
    path: '/agentInterface.Agent/UnsetAlias',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.StringMessage,
    responseType: Agent_pb.EmptyMessage,
    requestSerialize: serialize_agentInterface_StringMessage,
    requestDeserialize: deserialize_agentInterface_StringMessage,
    responseSerialize: serialize_agentInterface_EmptyMessage,
    responseDeserialize: deserialize_agentInterface_EmptyMessage,
  },
  unshareVault: {
    path: '/agentInterface.Agent/UnshareVault',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.VaultPathMessage,
    responseType: Agent_pb.EmptyMessage,
    requestSerialize: serialize_agentInterface_VaultPathMessage,
    requestDeserialize: deserialize_agentInterface_VaultPathMessage,
    responseSerialize: serialize_agentInterface_EmptyMessage,
    responseDeserialize: deserialize_agentInterface_EmptyMessage,
  },
  untrustGestalt: {
    path: '/agentInterface.Agent/UntrustGestalt',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.StringMessage,
    responseType: Agent_pb.EmptyMessage,
    requestSerialize: serialize_agentInterface_StringMessage,
    requestDeserialize: deserialize_agentInterface_StringMessage,
    responseSerialize: serialize_agentInterface_EmptyMessage,
    responseDeserialize: deserialize_agentInterface_EmptyMessage,
  },
  updateLocalNodeInfo: {
    path: '/agentInterface.Agent/UpdateLocalNodeInfo',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.NodeInfoMessage,
    responseType: Agent_pb.EmptyMessage,
    requestSerialize: serialize_agentInterface_NodeInfoMessage,
    requestDeserialize: deserialize_agentInterface_NodeInfoMessage,
    responseSerialize: serialize_agentInterface_EmptyMessage,
    responseDeserialize: deserialize_agentInterface_EmptyMessage,
  },
  updateNodeInfo: {
    path: '/agentInterface.Agent/UpdateNodeInfo',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.NodeInfoReadOnlyMessage,
    responseType: Agent_pb.EmptyMessage,
    requestSerialize: serialize_agentInterface_NodeInfoReadOnlyMessage,
    requestDeserialize: deserialize_agentInterface_NodeInfoReadOnlyMessage,
    responseSerialize: serialize_agentInterface_EmptyMessage,
    responseDeserialize: deserialize_agentInterface_EmptyMessage,
  },
  updateSecret: {
    path: '/agentInterface.Agent/UpdateSecret',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.SecretContentMessage,
    responseType: Agent_pb.EmptyMessage,
    requestSerialize: serialize_agentInterface_SecretContentMessage,
    requestDeserialize: deserialize_agentInterface_SecretContentMessage,
    responseSerialize: serialize_agentInterface_EmptyMessage,
    responseDeserialize: deserialize_agentInterface_EmptyMessage,
  },
  verifyFile: {
    path: '/agentInterface.Agent/VerifyFile',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.VerifyFileMessage,
    responseType: Agent_pb.EmptyMessage,
    requestSerialize: serialize_agentInterface_VerifyFileMessage,
    requestDeserialize: deserialize_agentInterface_VerifyFileMessage,
    responseSerialize: serialize_agentInterface_EmptyMessage,
    responseDeserialize: deserialize_agentInterface_EmptyMessage,
  },
  verifyMnemonic: {
    path: '/agentInterface.Agent/VerifyMnemonic',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.StringMessage,
    responseType: Agent_pb.EmptyMessage,
    requestSerialize: serialize_agentInterface_StringMessage,
    requestDeserialize: deserialize_agentInterface_StringMessage,
    responseSerialize: serialize_agentInterface_EmptyMessage,
    responseDeserialize: deserialize_agentInterface_EmptyMessage,
  },
});

exports.AgentClient = grpc.makeGenericClientConstructor(AgentService);
