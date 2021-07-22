// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var Client_pb = require('./Client_pb.js');

function serialize_clientInterface_ActionsMessage(arg) {
  if (!(arg instanceof Client_pb.ActionsMessage)) {
    throw new Error('Expected argument of type clientInterface.ActionsMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_clientInterface_ActionsMessage(buffer_arg) {
  return Client_pb.ActionsMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_clientInterface_CertificateMessage(arg) {
  if (!(arg instanceof Client_pb.CertificateMessage)) {
    throw new Error('Expected argument of type clientInterface.CertificateMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_clientInterface_CertificateMessage(buffer_arg) {
  return Client_pb.CertificateMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_clientInterface_CryptoMessage(arg) {
  if (!(arg instanceof Client_pb.CryptoMessage)) {
    throw new Error('Expected argument of type clientInterface.CryptoMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_clientInterface_CryptoMessage(buffer_arg) {
  return Client_pb.CryptoMessage.deserializeBinary(new Uint8Array(buffer_arg));
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

function serialize_clientInterface_GestaltTrustMessage(arg) {
  if (!(arg instanceof Client_pb.GestaltTrustMessage)) {
    throw new Error('Expected argument of type clientInterface.GestaltTrustMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_clientInterface_GestaltTrustMessage(buffer_arg) {
  return Client_pb.GestaltTrustMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_clientInterface_IdentityInfoMessage(arg) {
  if (!(arg instanceof Client_pb.IdentityInfoMessage)) {
    throw new Error('Expected argument of type clientInterface.IdentityInfoMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_clientInterface_IdentityInfoMessage(buffer_arg) {
  return Client_pb.IdentityInfoMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_clientInterface_JWTTokenMessage(arg) {
  if (!(arg instanceof Client_pb.JWTTokenMessage)) {
    throw new Error('Expected argument of type clientInterface.JWTTokenMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_clientInterface_JWTTokenMessage(buffer_arg) {
  return Client_pb.JWTTokenMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_clientInterface_KeyMessage(arg) {
  if (!(arg instanceof Client_pb.KeyMessage)) {
    throw new Error('Expected argument of type clientInterface.KeyMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_clientInterface_KeyMessage(buffer_arg) {
  return Client_pb.KeyMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_clientInterface_KeyPairMessage(arg) {
  if (!(arg instanceof Client_pb.KeyPairMessage)) {
    throw new Error('Expected argument of type clientInterface.KeyPairMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_clientInterface_KeyPairMessage(buffer_arg) {
  return Client_pb.KeyPairMessage.deserializeBinary(new Uint8Array(buffer_arg));
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

function serialize_clientInterface_PasswordMessage(arg) {
  if (!(arg instanceof Client_pb.PasswordMessage)) {
    throw new Error('Expected argument of type clientInterface.PasswordMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_clientInterface_PasswordMessage(buffer_arg) {
  return Client_pb.PasswordMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_clientInterface_PermissionMessage(arg) {
  if (!(arg instanceof Client_pb.PermissionMessage)) {
    throw new Error('Expected argument of type clientInterface.PermissionMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_clientInterface_PermissionMessage(buffer_arg) {
  return Client_pb.PermissionMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_clientInterface_ProviderMessage(arg) {
  if (!(arg instanceof Client_pb.ProviderMessage)) {
    throw new Error('Expected argument of type clientInterface.ProviderMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_clientInterface_ProviderMessage(buffer_arg) {
  return Client_pb.ProviderMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_clientInterface_ProviderSearchMessage(arg) {
  if (!(arg instanceof Client_pb.ProviderSearchMessage)) {
    throw new Error('Expected argument of type clientInterface.ProviderSearchMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_clientInterface_ProviderSearchMessage(buffer_arg) {
  return Client_pb.ProviderSearchMessage.deserializeBinary(new Uint8Array(buffer_arg));
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

function serialize_clientInterface_SecretNewMessage(arg) {
  if (!(arg instanceof Client_pb.SecretNewMessage)) {
    throw new Error('Expected argument of type clientInterface.SecretNewMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_clientInterface_SecretNewMessage(buffer_arg) {
  return Client_pb.SecretNewMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_clientInterface_SecretRenameMessage(arg) {
  if (!(arg instanceof Client_pb.SecretRenameMessage)) {
    throw new Error('Expected argument of type clientInterface.SecretRenameMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_clientInterface_SecretRenameMessage(buffer_arg) {
  return Client_pb.SecretRenameMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_clientInterface_SecretSpecificMessage(arg) {
  if (!(arg instanceof Client_pb.SecretSpecificMessage)) {
    throw new Error('Expected argument of type clientInterface.SecretSpecificMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_clientInterface_SecretSpecificMessage(buffer_arg) {
  return Client_pb.SecretSpecificMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_clientInterface_SetActionsMessage(arg) {
  if (!(arg instanceof Client_pb.SetActionsMessage)) {
    throw new Error('Expected argument of type clientInterface.SetActionsMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_clientInterface_SetActionsMessage(buffer_arg) {
  return Client_pb.SetActionsMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_clientInterface_ShareMessage(arg) {
  if (!(arg instanceof Client_pb.ShareMessage)) {
    throw new Error('Expected argument of type clientInterface.ShareMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_clientInterface_ShareMessage(buffer_arg) {
  return Client_pb.ShareMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_clientInterface_StatMessage(arg) {
  if (!(arg instanceof Client_pb.StatMessage)) {
    throw new Error('Expected argument of type clientInterface.StatMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_clientInterface_StatMessage(buffer_arg) {
  return Client_pb.StatMessage.deserializeBinary(new Uint8Array(buffer_arg));
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

function serialize_clientInterface_TokenMessage(arg) {
  if (!(arg instanceof Client_pb.TokenMessage)) {
    throw new Error('Expected argument of type clientInterface.TokenMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_clientInterface_TokenMessage(buffer_arg) {
  return Client_pb.TokenMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_clientInterface_TokenSpecificMessage(arg) {
  if (!(arg instanceof Client_pb.TokenSpecificMessage)) {
    throw new Error('Expected argument of type clientInterface.TokenSpecificMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_clientInterface_TokenSpecificMessage(buffer_arg) {
  return Client_pb.TokenSpecificMessage.deserializeBinary(new Uint8Array(buffer_arg));
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
sessionRequestJWT: {
    path: '/clientInterface.Client/SessionRequestJWT',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.EmptyMessage,
    responseType: Client_pb.JWTTokenMessage,
    requestSerialize: serialize_clientInterface_EmptyMessage,
    requestDeserialize: deserialize_clientInterface_EmptyMessage,
    responseSerialize: serialize_clientInterface_JWTTokenMessage,
    responseDeserialize: deserialize_clientInterface_JWTTokenMessage,
  },
  sessionChangeKey: {
    path: '/clientInterface.Client/SessionChangeKey',
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
  // Keys
keysRootKeyPair: {
    path: '/clientInterface.Client/KeysRootKeyPair',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.EmptyMessage,
    responseType: Client_pb.KeyPairMessage,
    requestSerialize: serialize_clientInterface_EmptyMessage,
    requestDeserialize: deserialize_clientInterface_EmptyMessage,
    responseSerialize: serialize_clientInterface_KeyPairMessage,
    responseDeserialize: deserialize_clientInterface_KeyPairMessage,
  },
  keysResetKeyPair: {
    path: '/clientInterface.Client/KeysResetKeyPair',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.KeyMessage,
    responseType: Client_pb.EmptyMessage,
    requestSerialize: serialize_clientInterface_KeyMessage,
    requestDeserialize: deserialize_clientInterface_KeyMessage,
    responseSerialize: serialize_clientInterface_EmptyMessage,
    responseDeserialize: deserialize_clientInterface_EmptyMessage,
  },
  keysRenewKeyPair: {
    path: '/clientInterface.Client/KeysRenewKeyPair',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.KeyMessage,
    responseType: Client_pb.EmptyMessage,
    requestSerialize: serialize_clientInterface_KeyMessage,
    requestDeserialize: deserialize_clientInterface_KeyMessage,
    responseSerialize: serialize_clientInterface_EmptyMessage,
    responseDeserialize: deserialize_clientInterface_EmptyMessage,
  },
  keysEncrypt: {
    path: '/clientInterface.Client/KeysEncrypt',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.CryptoMessage,
    responseType: Client_pb.CryptoMessage,
    requestSerialize: serialize_clientInterface_CryptoMessage,
    requestDeserialize: deserialize_clientInterface_CryptoMessage,
    responseSerialize: serialize_clientInterface_CryptoMessage,
    responseDeserialize: deserialize_clientInterface_CryptoMessage,
  },
  keysDecrypt: {
    path: '/clientInterface.Client/KeysDecrypt',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.CryptoMessage,
    responseType: Client_pb.CryptoMessage,
    requestSerialize: serialize_clientInterface_CryptoMessage,
    requestDeserialize: deserialize_clientInterface_CryptoMessage,
    responseSerialize: serialize_clientInterface_CryptoMessage,
    responseDeserialize: deserialize_clientInterface_CryptoMessage,
  },
  keysSign: {
    path: '/clientInterface.Client/KeysSign',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.CryptoMessage,
    responseType: Client_pb.CryptoMessage,
    requestSerialize: serialize_clientInterface_CryptoMessage,
    requestDeserialize: deserialize_clientInterface_CryptoMessage,
    responseSerialize: serialize_clientInterface_CryptoMessage,
    responseDeserialize: deserialize_clientInterface_CryptoMessage,
  },
  keysVerify: {
    path: '/clientInterface.Client/KeysVerify',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.CryptoMessage,
    responseType: Client_pb.StatusMessage,
    requestSerialize: serialize_clientInterface_CryptoMessage,
    requestDeserialize: deserialize_clientInterface_CryptoMessage,
    responseSerialize: serialize_clientInterface_StatusMessage,
    responseDeserialize: deserialize_clientInterface_StatusMessage,
  },
  keysChangePassword: {
    path: '/clientInterface.Client/KeysChangePassword',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.PasswordMessage,
    responseType: Client_pb.EmptyMessage,
    requestSerialize: serialize_clientInterface_PasswordMessage,
    requestDeserialize: deserialize_clientInterface_PasswordMessage,
    responseSerialize: serialize_clientInterface_EmptyMessage,
    responseDeserialize: deserialize_clientInterface_EmptyMessage,
  },
  certsGet: {
    path: '/clientInterface.Client/CertsGet',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.EmptyMessage,
    responseType: Client_pb.CertificateMessage,
    requestSerialize: serialize_clientInterface_EmptyMessage,
    requestDeserialize: deserialize_clientInterface_EmptyMessage,
    responseSerialize: serialize_clientInterface_CertificateMessage,
    responseDeserialize: deserialize_clientInterface_CertificateMessage,
  },
  certsChainGet: {
    path: '/clientInterface.Client/CertsChainGet',
    requestStream: false,
    responseStream: true,
    requestType: Client_pb.EmptyMessage,
    responseType: Client_pb.CertificateMessage,
    requestSerialize: serialize_clientInterface_EmptyMessage,
    requestDeserialize: deserialize_clientInterface_EmptyMessage,
    responseSerialize: serialize_clientInterface_CertificateMessage,
    responseDeserialize: deserialize_clientInterface_CertificateMessage,
  },
  // Vaults
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
  vaultsRename: {
    path: '/clientInterface.Client/VaultsRename',
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
  vaultsStat: {
    path: '/clientInterface.Client/VaultsStat',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.VaultMessage,
    responseType: Client_pb.StatMessage,
    requestSerialize: serialize_clientInterface_VaultMessage,
    requestDeserialize: deserialize_clientInterface_VaultMessage,
    responseSerialize: serialize_clientInterface_StatMessage,
    responseDeserialize: deserialize_clientInterface_StatMessage,
  },
  vaultsPull: {
    path: '/clientInterface.Client/VaultsPull',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.VaultMessage,
    responseType: Client_pb.EmptyMessage,
    requestSerialize: serialize_clientInterface_VaultMessage,
    requestDeserialize: deserialize_clientInterface_VaultMessage,
    responseSerialize: serialize_clientInterface_EmptyMessage,
    responseDeserialize: deserialize_clientInterface_EmptyMessage,
  },
  vaultsScan: {
    path: '/clientInterface.Client/VaultsScan',
    requestStream: false,
    responseStream: true,
    requestType: Client_pb.NodeMessage,
    responseType: Client_pb.VaultMessage,
    requestSerialize: serialize_clientInterface_NodeMessage,
    requestDeserialize: deserialize_clientInterface_NodeMessage,
    responseSerialize: serialize_clientInterface_VaultMessage,
    responseDeserialize: deserialize_clientInterface_VaultMessage,
  },
  vaultsDeleteSecret: {
    path: '/clientInterface.Client/VaultsDeleteSecret',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.VaultSpecificMessage,
    responseType: Client_pb.StatusMessage,
    requestSerialize: serialize_clientInterface_VaultSpecificMessage,
    requestDeserialize: deserialize_clientInterface_VaultSpecificMessage,
    responseSerialize: serialize_clientInterface_StatusMessage,
    responseDeserialize: deserialize_clientInterface_StatusMessage,
  },
  vaultsEditSecret: {
    path: '/clientInterface.Client/VaultsEditSecret',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.SecretSpecificMessage,
    responseType: Client_pb.EmptyMessage,
    requestSerialize: serialize_clientInterface_SecretSpecificMessage,
    requestDeserialize: deserialize_clientInterface_SecretSpecificMessage,
    responseSerialize: serialize_clientInterface_EmptyMessage,
    responseDeserialize: deserialize_clientInterface_EmptyMessage,
  },
  vaultsGetSecret: {
    path: '/clientInterface.Client/VaultsGetSecret',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.VaultSpecificMessage,
    responseType: Client_pb.SecretMessage,
    requestSerialize: serialize_clientInterface_VaultSpecificMessage,
    requestDeserialize: deserialize_clientInterface_VaultSpecificMessage,
    responseSerialize: serialize_clientInterface_SecretMessage,
    responseDeserialize: deserialize_clientInterface_SecretMessage,
  },
  vaultsRenameSecret: {
    path: '/clientInterface.Client/VaultsRenameSecret',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.SecretRenameMessage,
    responseType: Client_pb.StatusMessage,
    requestSerialize: serialize_clientInterface_SecretRenameMessage,
    requestDeserialize: deserialize_clientInterface_SecretRenameMessage,
    responseSerialize: serialize_clientInterface_StatusMessage,
    responseDeserialize: deserialize_clientInterface_StatusMessage,
  },
  vaultsNewSecret: {
    path: '/clientInterface.Client/VaultsNewSecret',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.SecretNewMessage,
    responseType: Client_pb.StatusMessage,
    requestSerialize: serialize_clientInterface_SecretNewMessage,
    requestDeserialize: deserialize_clientInterface_SecretNewMessage,
    responseSerialize: serialize_clientInterface_StatusMessage,
    responseDeserialize: deserialize_clientInterface_StatusMessage,
  },
  vaultsNewDirSecret: {
    path: '/clientInterface.Client/VaultsNewDirSecret',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.SecretNewMessage,
    responseType: Client_pb.EmptyMessage,
    requestSerialize: serialize_clientInterface_SecretNewMessage,
    requestDeserialize: deserialize_clientInterface_SecretNewMessage,
    responseSerialize: serialize_clientInterface_EmptyMessage,
    responseDeserialize: deserialize_clientInterface_EmptyMessage,
  },
  vaultsShare: {
    path: '/clientInterface.Client/VaultsShare',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.ShareMessage,
    responseType: Client_pb.EmptyMessage,
    requestSerialize: serialize_clientInterface_ShareMessage,
    requestDeserialize: deserialize_clientInterface_ShareMessage,
    responseSerialize: serialize_clientInterface_EmptyMessage,
    responseDeserialize: deserialize_clientInterface_EmptyMessage,
  },
  vaultsPermissions: {
    path: '/clientInterface.Client/VaultsPermissions',
    requestStream: false,
    responseStream: true,
    requestType: Client_pb.ShareMessage,
    responseType: Client_pb.PermissionMessage,
    requestSerialize: serialize_clientInterface_ShareMessage,
    requestDeserialize: deserialize_clientInterface_ShareMessage,
    responseSerialize: serialize_clientInterface_PermissionMessage,
    responseDeserialize: deserialize_clientInterface_PermissionMessage,
  },
  // Identities
identitiesAuthenticate: {
    path: '/clientInterface.Client/IdentitiesAuthenticate',
    requestStream: false,
    responseStream: true,
    requestType: Client_pb.ProviderMessage,
    responseType: Client_pb.ProviderMessage,
    requestSerialize: serialize_clientInterface_ProviderMessage,
    requestDeserialize: deserialize_clientInterface_ProviderMessage,
    responseSerialize: serialize_clientInterface_ProviderMessage,
    responseDeserialize: deserialize_clientInterface_ProviderMessage,
  },
  tokensPut: {
    path: '/clientInterface.Client/TokensPut',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.TokenSpecificMessage,
    responseType: Client_pb.EmptyMessage,
    requestSerialize: serialize_clientInterface_TokenSpecificMessage,
    requestDeserialize: deserialize_clientInterface_TokenSpecificMessage,
    responseSerialize: serialize_clientInterface_EmptyMessage,
    responseDeserialize: deserialize_clientInterface_EmptyMessage,
  },
  tokensGet: {
    path: '/clientInterface.Client/TokensGet',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.ProviderMessage,
    responseType: Client_pb.TokenMessage,
    requestSerialize: serialize_clientInterface_ProviderMessage,
    requestDeserialize: deserialize_clientInterface_ProviderMessage,
    responseSerialize: serialize_clientInterface_TokenMessage,
    responseDeserialize: deserialize_clientInterface_TokenMessage,
  },
  tokensDelete: {
    path: '/clientInterface.Client/TokensDelete',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.ProviderMessage,
    responseType: Client_pb.EmptyMessage,
    requestSerialize: serialize_clientInterface_ProviderMessage,
    requestDeserialize: deserialize_clientInterface_ProviderMessage,
    responseSerialize: serialize_clientInterface_EmptyMessage,
    responseDeserialize: deserialize_clientInterface_EmptyMessage,
  },
  providersGet: {
    path: '/clientInterface.Client/ProvidersGet',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.EmptyMessage,
    responseType: Client_pb.ProviderMessage,
    requestSerialize: serialize_clientInterface_EmptyMessage,
    requestDeserialize: deserialize_clientInterface_EmptyMessage,
    responseSerialize: serialize_clientInterface_ProviderMessage,
    responseDeserialize: deserialize_clientInterface_ProviderMessage,
  },
  identitiesGetConnectedInfos: {
    path: '/clientInterface.Client/IdentitiesGetConnectedInfos',
    requestStream: false,
    responseStream: true,
    requestType: Client_pb.ProviderSearchMessage,
    responseType: Client_pb.IdentityInfoMessage,
    requestSerialize: serialize_clientInterface_ProviderSearchMessage,
    requestDeserialize: deserialize_clientInterface_ProviderSearchMessage,
    responseSerialize: serialize_clientInterface_IdentityInfoMessage,
    responseDeserialize: deserialize_clientInterface_IdentityInfoMessage,
  },
  identitiesGetInfo: {
    path: '/clientInterface.Client/IdentitiesGetInfo',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.ProviderMessage,
    responseType: Client_pb.ProviderMessage,
    requestSerialize: serialize_clientInterface_ProviderMessage,
    requestDeserialize: deserialize_clientInterface_ProviderMessage,
    responseSerialize: serialize_clientInterface_ProviderMessage,
    responseDeserialize: deserialize_clientInterface_ProviderMessage,
  },
  identitiesAugmentKeynode: {
    path: '/clientInterface.Client/IdentitiesAugmentKeynode',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.ProviderMessage,
    responseType: Client_pb.EmptyMessage,
    requestSerialize: serialize_clientInterface_ProviderMessage,
    requestDeserialize: deserialize_clientInterface_ProviderMessage,
    responseSerialize: serialize_clientInterface_EmptyMessage,
    responseDeserialize: deserialize_clientInterface_EmptyMessage,
  },
  // Gestalts
gestaltsGetNode: {
    path: '/clientInterface.Client/GestaltsGetNode',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.NodeMessage,
    responseType: Client_pb.GestaltMessage,
    requestSerialize: serialize_clientInterface_NodeMessage,
    requestDeserialize: deserialize_clientInterface_NodeMessage,
    responseSerialize: serialize_clientInterface_GestaltMessage,
    responseDeserialize: deserialize_clientInterface_GestaltMessage,
  },
  gestaltsGetIdentity: {
    path: '/clientInterface.Client/GestaltsGetIdentity',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.ProviderMessage,
    responseType: Client_pb.GestaltMessage,
    requestSerialize: serialize_clientInterface_ProviderMessage,
    requestDeserialize: deserialize_clientInterface_ProviderMessage,
    responseSerialize: serialize_clientInterface_GestaltMessage,
    responseDeserialize: deserialize_clientInterface_GestaltMessage,
  },
  gestaltsList: {
    path: '/clientInterface.Client/GestaltsList',
    requestStream: false,
    responseStream: true,
    requestType: Client_pb.EmptyMessage,
    responseType: Client_pb.GestaltMessage,
    requestSerialize: serialize_clientInterface_EmptyMessage,
    requestDeserialize: deserialize_clientInterface_EmptyMessage,
    responseSerialize: serialize_clientInterface_GestaltMessage,
    responseDeserialize: deserialize_clientInterface_GestaltMessage,
  },
  gestaltsSetNode: {
    path: '/clientInterface.Client/GestaltsSetNode',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.GestaltTrustMessage,
    responseType: Client_pb.EmptyMessage,
    requestSerialize: serialize_clientInterface_GestaltTrustMessage,
    requestDeserialize: deserialize_clientInterface_GestaltTrustMessage,
    responseSerialize: serialize_clientInterface_EmptyMessage,
    responseDeserialize: deserialize_clientInterface_EmptyMessage,
  },
  gestaltsSetIdentity: {
    path: '/clientInterface.Client/GestaltsSetIdentity',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.GestaltTrustMessage,
    responseType: Client_pb.EmptyMessage,
    requestSerialize: serialize_clientInterface_GestaltTrustMessage,
    requestDeserialize: deserialize_clientInterface_GestaltTrustMessage,
    responseSerialize: serialize_clientInterface_EmptyMessage,
    responseDeserialize: deserialize_clientInterface_EmptyMessage,
  },
  gestaltsDiscoverNode: {
    path: '/clientInterface.Client/GestaltsDiscoverNode',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.NodeMessage,
    responseType: Client_pb.EmptyMessage,
    requestSerialize: serialize_clientInterface_NodeMessage,
    requestDeserialize: deserialize_clientInterface_NodeMessage,
    responseSerialize: serialize_clientInterface_EmptyMessage,
    responseDeserialize: deserialize_clientInterface_EmptyMessage,
  },
  gestaltsDiscoverIdentity: {
    path: '/clientInterface.Client/GestaltsDiscoverIdentity',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.ProviderMessage,
    responseType: Client_pb.EmptyMessage,
    requestSerialize: serialize_clientInterface_ProviderMessage,
    requestDeserialize: deserialize_clientInterface_ProviderMessage,
    responseSerialize: serialize_clientInterface_EmptyMessage,
    responseDeserialize: deserialize_clientInterface_EmptyMessage,
  },
  gestaltsGetActionsByNode: {
    path: '/clientInterface.Client/GestaltsGetActionsByNode',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.NodeMessage,
    responseType: Client_pb.ActionsMessage,
    requestSerialize: serialize_clientInterface_NodeMessage,
    requestDeserialize: deserialize_clientInterface_NodeMessage,
    responseSerialize: serialize_clientInterface_ActionsMessage,
    responseDeserialize: deserialize_clientInterface_ActionsMessage,
  },
  gestaltsGetActionsByIdentity: {
    path: '/clientInterface.Client/GestaltsGetActionsByIdentity',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.ProviderMessage,
    responseType: Client_pb.ActionsMessage,
    requestSerialize: serialize_clientInterface_ProviderMessage,
    requestDeserialize: deserialize_clientInterface_ProviderMessage,
    responseSerialize: serialize_clientInterface_ActionsMessage,
    responseDeserialize: deserialize_clientInterface_ActionsMessage,
  },
  gestaltsSetActionByNode: {
    path: '/clientInterface.Client/GestaltsSetActionByNode',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.SetActionsMessage,
    responseType: Client_pb.EmptyMessage,
    requestSerialize: serialize_clientInterface_SetActionsMessage,
    requestDeserialize: deserialize_clientInterface_SetActionsMessage,
    responseSerialize: serialize_clientInterface_EmptyMessage,
    responseDeserialize: deserialize_clientInterface_EmptyMessage,
  },
  gestaltsSetActionByIdentity: {
    path: '/clientInterface.Client/GestaltsSetActionByIdentity',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.SetActionsMessage,
    responseType: Client_pb.EmptyMessage,
    requestSerialize: serialize_clientInterface_SetActionsMessage,
    requestDeserialize: deserialize_clientInterface_SetActionsMessage,
    responseSerialize: serialize_clientInterface_EmptyMessage,
    responseDeserialize: deserialize_clientInterface_EmptyMessage,
  },
  gestaltsUnsetActionByNode: {
    path: '/clientInterface.Client/GestaltsUnsetActionByNode',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.SetActionsMessage,
    responseType: Client_pb.EmptyMessage,
    requestSerialize: serialize_clientInterface_SetActionsMessage,
    requestDeserialize: deserialize_clientInterface_SetActionsMessage,
    responseSerialize: serialize_clientInterface_EmptyMessage,
    responseDeserialize: deserialize_clientInterface_EmptyMessage,
  },
  gestaltsUnsetActionByIdentity: {
    path: '/clientInterface.Client/GestaltsUnsetActionByIdentity',
    requestStream: false,
    responseStream: false,
    requestType: Client_pb.SetActionsMessage,
    responseType: Client_pb.EmptyMessage,
    requestSerialize: serialize_clientInterface_SetActionsMessage,
    requestDeserialize: deserialize_clientInterface_SetActionsMessage,
    responseSerialize: serialize_clientInterface_EmptyMessage,
    responseDeserialize: deserialize_clientInterface_EmptyMessage,
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
