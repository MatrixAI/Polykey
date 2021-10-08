// package: clientInterface
// file: Client.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as Client_pb from "./Client_pb";

interface IClientService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    echo: IClientService_IEcho;
    agentStop: IClientService_IAgentStop;
    sessionUnlock: IClientService_ISessionUnlock;
    sessionRefresh: IClientService_ISessionRefresh;
    sessionLockAll: IClientService_ISessionLockAll;
    nodesAdd: IClientService_INodesAdd;
    nodesPing: IClientService_INodesPing;
    nodesClaim: IClientService_INodesClaim;
    nodesFind: IClientService_INodesFind;
    keysKeyPairRoot: IClientService_IKeysKeyPairRoot;
    keysKeyPairReset: IClientService_IKeysKeyPairReset;
    keysKeyPairRenew: IClientService_IKeysKeyPairRenew;
    keysEncrypt: IClientService_IKeysEncrypt;
    keysDecrypt: IClientService_IKeysDecrypt;
    keysSign: IClientService_IKeysSign;
    keysVerify: IClientService_IKeysVerify;
    keysPasswordChange: IClientService_IKeysPasswordChange;
    keysCertsGet: IClientService_IKeysCertsGet;
    keysCertsChainGet: IClientService_IKeysCertsChainGet;
    vaultsList: IClientService_IVaultsList;
    vaultsCreate: IClientService_IVaultsCreate;
    vaultsRename: IClientService_IVaultsRename;
    vaultsDelete: IClientService_IVaultsDelete;
    vaultsPull: IClientService_IVaultsPull;
    vaultsClone: IClientService_IVaultsClone;
    vaultsScan: IClientService_IVaultsScan;
    vaultsSecretsList: IClientService_IVaultsSecretsList;
    vaultsSecretsMkdir: IClientService_IVaultsSecretsMkdir;
    vaultsSecretsStat: IClientService_IVaultsSecretsStat;
    vaultsSecretsDelete: IClientService_IVaultsSecretsDelete;
    vaultsSecretsEdit: IClientService_IVaultsSecretsEdit;
    vaultsSecretsGet: IClientService_IVaultsSecretsGet;
    vaultsSecretsRename: IClientService_IVaultsSecretsRename;
    vaultsSecretsNew: IClientService_IVaultsSecretsNew;
    vaultsSecretsNewDir: IClientService_IVaultsSecretsNewDir;
    vaultsPermissionsSet: IClientService_IVaultsPermissionsSet;
    vaultsPermissionsUnset: IClientService_IVaultsPermissionsUnset;
    vaultsPermissions: IClientService_IVaultsPermissions;
    vaultsVersion: IClientService_IVaultsVersion;
    identitiesAuthenticate: IClientService_IIdentitiesAuthenticate;
    identitiesTokenPut: IClientService_IIdentitiesTokenPut;
    identitiesTokenGet: IClientService_IIdentitiesTokenGet;
    identitiesTokenDelete: IClientService_IIdentitiesTokenDelete;
    identitiesProvidersList: IClientService_IIdentitiesProvidersList;
    identitiesInfoGet: IClientService_IIdentitiesInfoGet;
    identitiesInfoGetConnected: IClientService_IIdentitiesInfoGetConnected;
    identitiesClaim: IClientService_IIdentitiesClaim;
    gestaltsGestaltList: IClientService_IGestaltsGestaltList;
    gestaltsGestaltGetByNode: IClientService_IGestaltsGestaltGetByNode;
    gestaltsGestaltGetByIdentity: IClientService_IGestaltsGestaltGetByIdentity;
    gestaltsDiscoveryByNode: IClientService_IGestaltsDiscoveryByNode;
    gestaltsDiscoveryByIdentity: IClientService_IGestaltsDiscoveryByIdentity;
    gestaltsActionsGetByNode: IClientService_IGestaltsActionsGetByNode;
    gestaltsActionsGetByIdentity: IClientService_IGestaltsActionsGetByIdentity;
    gestaltsActionsSetByNode: IClientService_IGestaltsActionsSetByNode;
    gestaltsActionsSetByIdentity: IClientService_IGestaltsActionsSetByIdentity;
    gestaltsActionsUnsetByNode: IClientService_IGestaltsActionsUnsetByNode;
    gestaltsActionsUnsetByIdentity: IClientService_IGestaltsActionsUnsetByIdentity;
    notificationsSend: IClientService_INotificationsSend;
    notificationsRead: IClientService_INotificationsRead;
    notificationsClear: IClientService_INotificationsClear;
}

interface IClientService_IEcho extends grpc.MethodDefinition<Client_pb.EchoMessage, Client_pb.EchoMessage> {
    path: "/clientInterface.Client/Echo";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.EchoMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.EchoMessage>;
    responseSerialize: grpc.serialize<Client_pb.EchoMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.EchoMessage>;
}
interface IClientService_IAgentStop extends grpc.MethodDefinition<Client_pb.EmptyMessage, Client_pb.EmptyMessage> {
    path: "/clientInterface.Client/AgentStop";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
}
interface IClientService_ISessionUnlock extends grpc.MethodDefinition<Client_pb.PasswordMessage, Client_pb.SessionTokenMessage> {
    path: "/clientInterface.Client/SessionUnlock";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.PasswordMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.PasswordMessage>;
    responseSerialize: grpc.serialize<Client_pb.SessionTokenMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.SessionTokenMessage>;
}
interface IClientService_ISessionRefresh extends grpc.MethodDefinition<Client_pb.EmptyMessage, Client_pb.SessionTokenMessage> {
    path: "/clientInterface.Client/SessionRefresh";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Client_pb.SessionTokenMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.SessionTokenMessage>;
}
interface IClientService_ISessionLockAll extends grpc.MethodDefinition<Client_pb.EmptyMessage, Client_pb.StatusMessage> {
    path: "/clientInterface.Client/SessionLockAll";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Client_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.StatusMessage>;
}
interface IClientService_INodesAdd extends grpc.MethodDefinition<Client_pb.NodeAddressMessage, Client_pb.EmptyMessage> {
    path: "/clientInterface.Client/NodesAdd";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.NodeAddressMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.NodeAddressMessage>;
    responseSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
}
interface IClientService_INodesPing extends grpc.MethodDefinition<Client_pb.NodeMessage, Client_pb.StatusMessage> {
    path: "/clientInterface.Client/NodesPing";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.NodeMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.NodeMessage>;
    responseSerialize: grpc.serialize<Client_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.StatusMessage>;
}
interface IClientService_INodesClaim extends grpc.MethodDefinition<Client_pb.NodeClaimMessage, Client_pb.StatusMessage> {
    path: "/clientInterface.Client/NodesClaim";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.NodeClaimMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.NodeClaimMessage>;
    responseSerialize: grpc.serialize<Client_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.StatusMessage>;
}
interface IClientService_INodesFind extends grpc.MethodDefinition<Client_pb.NodeMessage, Client_pb.NodeAddressMessage> {
    path: "/clientInterface.Client/NodesFind";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.NodeMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.NodeMessage>;
    responseSerialize: grpc.serialize<Client_pb.NodeAddressMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.NodeAddressMessage>;
}
interface IClientService_IKeysKeyPairRoot extends grpc.MethodDefinition<Client_pb.EmptyMessage, Client_pb.KeyPairMessage> {
    path: "/clientInterface.Client/KeysKeyPairRoot";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Client_pb.KeyPairMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.KeyPairMessage>;
}
interface IClientService_IKeysKeyPairReset extends grpc.MethodDefinition<Client_pb.KeyMessage, Client_pb.EmptyMessage> {
    path: "/clientInterface.Client/KeysKeyPairReset";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.KeyMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.KeyMessage>;
    responseSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
}
interface IClientService_IKeysKeyPairRenew extends grpc.MethodDefinition<Client_pb.KeyMessage, Client_pb.EmptyMessage> {
    path: "/clientInterface.Client/KeysKeyPairRenew";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.KeyMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.KeyMessage>;
    responseSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
}
interface IClientService_IKeysEncrypt extends grpc.MethodDefinition<Client_pb.CryptoMessage, Client_pb.CryptoMessage> {
    path: "/clientInterface.Client/KeysEncrypt";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.CryptoMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.CryptoMessage>;
    responseSerialize: grpc.serialize<Client_pb.CryptoMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.CryptoMessage>;
}
interface IClientService_IKeysDecrypt extends grpc.MethodDefinition<Client_pb.CryptoMessage, Client_pb.CryptoMessage> {
    path: "/clientInterface.Client/KeysDecrypt";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.CryptoMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.CryptoMessage>;
    responseSerialize: grpc.serialize<Client_pb.CryptoMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.CryptoMessage>;
}
interface IClientService_IKeysSign extends grpc.MethodDefinition<Client_pb.CryptoMessage, Client_pb.CryptoMessage> {
    path: "/clientInterface.Client/KeysSign";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.CryptoMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.CryptoMessage>;
    responseSerialize: grpc.serialize<Client_pb.CryptoMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.CryptoMessage>;
}
interface IClientService_IKeysVerify extends grpc.MethodDefinition<Client_pb.CryptoMessage, Client_pb.StatusMessage> {
    path: "/clientInterface.Client/KeysVerify";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.CryptoMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.CryptoMessage>;
    responseSerialize: grpc.serialize<Client_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.StatusMessage>;
}
interface IClientService_IKeysPasswordChange extends grpc.MethodDefinition<Client_pb.PasswordMessage, Client_pb.EmptyMessage> {
    path: "/clientInterface.Client/KeysPasswordChange";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.PasswordMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.PasswordMessage>;
    responseSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
}
interface IClientService_IKeysCertsGet extends grpc.MethodDefinition<Client_pb.EmptyMessage, Client_pb.CertificateMessage> {
    path: "/clientInterface.Client/KeysCertsGet";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Client_pb.CertificateMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.CertificateMessage>;
}
interface IClientService_IKeysCertsChainGet extends grpc.MethodDefinition<Client_pb.EmptyMessage, Client_pb.CertificateMessage> {
    path: "/clientInterface.Client/KeysCertsChainGet";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Client_pb.CertificateMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.CertificateMessage>;
}
interface IClientService_IVaultsList extends grpc.MethodDefinition<Client_pb.EmptyMessage, Client_pb.VaultListMessage> {
    path: "/clientInterface.Client/VaultsList";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Client_pb.VaultListMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.VaultListMessage>;
}
interface IClientService_IVaultsCreate extends grpc.MethodDefinition<Client_pb.VaultMessage, Client_pb.VaultMessage> {
    path: "/clientInterface.Client/VaultsCreate";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.VaultMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.VaultMessage>;
    responseSerialize: grpc.serialize<Client_pb.VaultMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.VaultMessage>;
}
interface IClientService_IVaultsRename extends grpc.MethodDefinition<Client_pb.VaultRenameMessage, Client_pb.VaultMessage> {
    path: "/clientInterface.Client/VaultsRename";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.VaultRenameMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.VaultRenameMessage>;
    responseSerialize: grpc.serialize<Client_pb.VaultMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.VaultMessage>;
}
interface IClientService_IVaultsDelete extends grpc.MethodDefinition<Client_pb.VaultMessage, Client_pb.StatusMessage> {
    path: "/clientInterface.Client/VaultsDelete";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.VaultMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.VaultMessage>;
    responseSerialize: grpc.serialize<Client_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.StatusMessage>;
}
interface IClientService_IVaultsPull extends grpc.MethodDefinition<Client_pb.VaultPullMessage, Client_pb.StatusMessage> {
    path: "/clientInterface.Client/VaultsPull";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.VaultPullMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.VaultPullMessage>;
    responseSerialize: grpc.serialize<Client_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.StatusMessage>;
}
interface IClientService_IVaultsClone extends grpc.MethodDefinition<Client_pb.VaultCloneMessage, Client_pb.StatusMessage> {
    path: "/clientInterface.Client/VaultsClone";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.VaultCloneMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.VaultCloneMessage>;
    responseSerialize: grpc.serialize<Client_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.StatusMessage>;
}
interface IClientService_IVaultsScan extends grpc.MethodDefinition<Client_pb.NodeMessage, Client_pb.VaultListMessage> {
    path: "/clientInterface.Client/VaultsScan";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<Client_pb.NodeMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.NodeMessage>;
    responseSerialize: grpc.serialize<Client_pb.VaultListMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.VaultListMessage>;
}
interface IClientService_IVaultsSecretsList extends grpc.MethodDefinition<Client_pb.VaultMessage, Client_pb.SecretMessage> {
    path: "/clientInterface.Client/VaultsSecretsList";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<Client_pb.VaultMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.VaultMessage>;
    responseSerialize: grpc.serialize<Client_pb.SecretMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.SecretMessage>;
}
interface IClientService_IVaultsSecretsMkdir extends grpc.MethodDefinition<Client_pb.VaultMkdirMessage, Client_pb.StatusMessage> {
    path: "/clientInterface.Client/VaultsSecretsMkdir";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.VaultMkdirMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.VaultMkdirMessage>;
    responseSerialize: grpc.serialize<Client_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.StatusMessage>;
}
interface IClientService_IVaultsSecretsStat extends grpc.MethodDefinition<Client_pb.VaultMessage, Client_pb.StatMessage> {
    path: "/clientInterface.Client/VaultsSecretsStat";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.VaultMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.VaultMessage>;
    responseSerialize: grpc.serialize<Client_pb.StatMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.StatMessage>;
}
interface IClientService_IVaultsSecretsDelete extends grpc.MethodDefinition<Client_pb.SecretMessage, Client_pb.StatusMessage> {
    path: "/clientInterface.Client/VaultsSecretsDelete";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.SecretMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.SecretMessage>;
    responseSerialize: grpc.serialize<Client_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.StatusMessage>;
}
interface IClientService_IVaultsSecretsEdit extends grpc.MethodDefinition<Client_pb.SecretEditMessage, Client_pb.StatusMessage> {
    path: "/clientInterface.Client/VaultsSecretsEdit";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.SecretEditMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.SecretEditMessage>;
    responseSerialize: grpc.serialize<Client_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.StatusMessage>;
}
interface IClientService_IVaultsSecretsGet extends grpc.MethodDefinition<Client_pb.SecretMessage, Client_pb.SecretMessage> {
    path: "/clientInterface.Client/VaultsSecretsGet";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.SecretMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.SecretMessage>;
    responseSerialize: grpc.serialize<Client_pb.SecretMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.SecretMessage>;
}
interface IClientService_IVaultsSecretsRename extends grpc.MethodDefinition<Client_pb.SecretRenameMessage, Client_pb.StatusMessage> {
    path: "/clientInterface.Client/VaultsSecretsRename";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.SecretRenameMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.SecretRenameMessage>;
    responseSerialize: grpc.serialize<Client_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.StatusMessage>;
}
interface IClientService_IVaultsSecretsNew extends grpc.MethodDefinition<Client_pb.SecretMessage, Client_pb.StatusMessage> {
    path: "/clientInterface.Client/VaultsSecretsNew";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.SecretMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.SecretMessage>;
    responseSerialize: grpc.serialize<Client_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.StatusMessage>;
}
interface IClientService_IVaultsSecretsNewDir extends grpc.MethodDefinition<Client_pb.SecretDirectoryMessage, Client_pb.StatusMessage> {
    path: "/clientInterface.Client/VaultsSecretsNewDir";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.SecretDirectoryMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.SecretDirectoryMessage>;
    responseSerialize: grpc.serialize<Client_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.StatusMessage>;
}
interface IClientService_IVaultsPermissionsSet extends grpc.MethodDefinition<Client_pb.SetVaultPermMessage, Client_pb.StatusMessage> {
    path: "/clientInterface.Client/VaultsPermissionsSet";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.SetVaultPermMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.SetVaultPermMessage>;
    responseSerialize: grpc.serialize<Client_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.StatusMessage>;
}
interface IClientService_IVaultsPermissionsUnset extends grpc.MethodDefinition<Client_pb.UnsetVaultPermMessage, Client_pb.StatusMessage> {
    path: "/clientInterface.Client/VaultsPermissionsUnset";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.UnsetVaultPermMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.UnsetVaultPermMessage>;
    responseSerialize: grpc.serialize<Client_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.StatusMessage>;
}
interface IClientService_IVaultsPermissions extends grpc.MethodDefinition<Client_pb.GetVaultPermMessage, Client_pb.PermissionMessage> {
    path: "/clientInterface.Client/VaultsPermissions";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<Client_pb.GetVaultPermMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.GetVaultPermMessage>;
    responseSerialize: grpc.serialize<Client_pb.PermissionMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.PermissionMessage>;
}
interface IClientService_IVaultsVersion extends grpc.MethodDefinition<Client_pb.VaultsVersionMessage, Client_pb.VaultsVersionResultMessage> {
    path: "/clientInterface.Client/VaultsVersion";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.VaultsVersionMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.VaultsVersionMessage>;
    responseSerialize: grpc.serialize<Client_pb.VaultsVersionResultMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.VaultsVersionResultMessage>;
}
interface IClientService_IIdentitiesAuthenticate extends grpc.MethodDefinition<Client_pb.ProviderMessage, Client_pb.ProviderMessage> {
    path: "/clientInterface.Client/IdentitiesAuthenticate";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<Client_pb.ProviderMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.ProviderMessage>;
    responseSerialize: grpc.serialize<Client_pb.ProviderMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.ProviderMessage>;
}
interface IClientService_IIdentitiesTokenPut extends grpc.MethodDefinition<Client_pb.TokenSpecificMessage, Client_pb.EmptyMessage> {
    path: "/clientInterface.Client/IdentitiesTokenPut";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.TokenSpecificMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.TokenSpecificMessage>;
    responseSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
}
interface IClientService_IIdentitiesTokenGet extends grpc.MethodDefinition<Client_pb.ProviderMessage, Client_pb.TokenMessage> {
    path: "/clientInterface.Client/IdentitiesTokenGet";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.ProviderMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.ProviderMessage>;
    responseSerialize: grpc.serialize<Client_pb.TokenMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.TokenMessage>;
}
interface IClientService_IIdentitiesTokenDelete extends grpc.MethodDefinition<Client_pb.ProviderMessage, Client_pb.EmptyMessage> {
    path: "/clientInterface.Client/IdentitiesTokenDelete";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.ProviderMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.ProviderMessage>;
    responseSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
}
interface IClientService_IIdentitiesProvidersList extends grpc.MethodDefinition<Client_pb.EmptyMessage, Client_pb.ProviderMessage> {
    path: "/clientInterface.Client/IdentitiesProvidersList";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Client_pb.ProviderMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.ProviderMessage>;
}
interface IClientService_IIdentitiesInfoGet extends grpc.MethodDefinition<Client_pb.ProviderMessage, Client_pb.ProviderMessage> {
    path: "/clientInterface.Client/IdentitiesInfoGet";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.ProviderMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.ProviderMessage>;
    responseSerialize: grpc.serialize<Client_pb.ProviderMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.ProviderMessage>;
}
interface IClientService_IIdentitiesInfoGetConnected extends grpc.MethodDefinition<Client_pb.ProviderSearchMessage, Client_pb.IdentityInfoMessage> {
    path: "/clientInterface.Client/IdentitiesInfoGetConnected";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<Client_pb.ProviderSearchMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.ProviderSearchMessage>;
    responseSerialize: grpc.serialize<Client_pb.IdentityInfoMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.IdentityInfoMessage>;
}
interface IClientService_IIdentitiesClaim extends grpc.MethodDefinition<Client_pb.ProviderMessage, Client_pb.EmptyMessage> {
    path: "/clientInterface.Client/IdentitiesClaim";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.ProviderMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.ProviderMessage>;
    responseSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
}
interface IClientService_IGestaltsGestaltList extends grpc.MethodDefinition<Client_pb.EmptyMessage, Client_pb.GestaltMessage> {
    path: "/clientInterface.Client/GestaltsGestaltList";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Client_pb.GestaltMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.GestaltMessage>;
}
interface IClientService_IGestaltsGestaltGetByNode extends grpc.MethodDefinition<Client_pb.NodeMessage, Client_pb.GestaltGraphMessage> {
    path: "/clientInterface.Client/GestaltsGestaltGetByNode";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.NodeMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.NodeMessage>;
    responseSerialize: grpc.serialize<Client_pb.GestaltGraphMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.GestaltGraphMessage>;
}
interface IClientService_IGestaltsGestaltGetByIdentity extends grpc.MethodDefinition<Client_pb.ProviderMessage, Client_pb.GestaltGraphMessage> {
    path: "/clientInterface.Client/GestaltsGestaltGetByIdentity";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.ProviderMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.ProviderMessage>;
    responseSerialize: grpc.serialize<Client_pb.GestaltGraphMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.GestaltGraphMessage>;
}
interface IClientService_IGestaltsDiscoveryByNode extends grpc.MethodDefinition<Client_pb.NodeMessage, Client_pb.EmptyMessage> {
    path: "/clientInterface.Client/GestaltsDiscoveryByNode";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.NodeMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.NodeMessage>;
    responseSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
}
interface IClientService_IGestaltsDiscoveryByIdentity extends grpc.MethodDefinition<Client_pb.ProviderMessage, Client_pb.EmptyMessage> {
    path: "/clientInterface.Client/GestaltsDiscoveryByIdentity";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.ProviderMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.ProviderMessage>;
    responseSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
}
interface IClientService_IGestaltsActionsGetByNode extends grpc.MethodDefinition<Client_pb.NodeMessage, Client_pb.ActionsMessage> {
    path: "/clientInterface.Client/GestaltsActionsGetByNode";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.NodeMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.NodeMessage>;
    responseSerialize: grpc.serialize<Client_pb.ActionsMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.ActionsMessage>;
}
interface IClientService_IGestaltsActionsGetByIdentity extends grpc.MethodDefinition<Client_pb.ProviderMessage, Client_pb.ActionsMessage> {
    path: "/clientInterface.Client/GestaltsActionsGetByIdentity";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.ProviderMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.ProviderMessage>;
    responseSerialize: grpc.serialize<Client_pb.ActionsMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.ActionsMessage>;
}
interface IClientService_IGestaltsActionsSetByNode extends grpc.MethodDefinition<Client_pb.SetActionsMessage, Client_pb.EmptyMessage> {
    path: "/clientInterface.Client/GestaltsActionsSetByNode";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.SetActionsMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.SetActionsMessage>;
    responseSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
}
interface IClientService_IGestaltsActionsSetByIdentity extends grpc.MethodDefinition<Client_pb.SetActionsMessage, Client_pb.EmptyMessage> {
    path: "/clientInterface.Client/GestaltsActionsSetByIdentity";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.SetActionsMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.SetActionsMessage>;
    responseSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
}
interface IClientService_IGestaltsActionsUnsetByNode extends grpc.MethodDefinition<Client_pb.SetActionsMessage, Client_pb.EmptyMessage> {
    path: "/clientInterface.Client/GestaltsActionsUnsetByNode";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.SetActionsMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.SetActionsMessage>;
    responseSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
}
interface IClientService_IGestaltsActionsUnsetByIdentity extends grpc.MethodDefinition<Client_pb.SetActionsMessage, Client_pb.EmptyMessage> {
    path: "/clientInterface.Client/GestaltsActionsUnsetByIdentity";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.SetActionsMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.SetActionsMessage>;
    responseSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
}
interface IClientService_INotificationsSend extends grpc.MethodDefinition<Client_pb.NotificationsSendMessage, Client_pb.EmptyMessage> {
    path: "/clientInterface.Client/NotificationsSend";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.NotificationsSendMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.NotificationsSendMessage>;
    responseSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
}
interface IClientService_INotificationsRead extends grpc.MethodDefinition<Client_pb.NotificationsReadMessage, Client_pb.NotificationsListMessage> {
    path: "/clientInterface.Client/NotificationsRead";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.NotificationsReadMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.NotificationsReadMessage>;
    responseSerialize: grpc.serialize<Client_pb.NotificationsListMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.NotificationsListMessage>;
}
interface IClientService_INotificationsClear extends grpc.MethodDefinition<Client_pb.EmptyMessage, Client_pb.EmptyMessage> {
    path: "/clientInterface.Client/NotificationsClear";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
}

export const ClientService: IClientService;

export interface IClientServer extends grpc.UntypedServiceImplementation {
    echo: grpc.handleUnaryCall<Client_pb.EchoMessage, Client_pb.EchoMessage>;
    agentStop: grpc.handleUnaryCall<Client_pb.EmptyMessage, Client_pb.EmptyMessage>;
    sessionUnlock: grpc.handleUnaryCall<Client_pb.PasswordMessage, Client_pb.SessionTokenMessage>;
    sessionRefresh: grpc.handleUnaryCall<Client_pb.EmptyMessage, Client_pb.SessionTokenMessage>;
    sessionLockAll: grpc.handleUnaryCall<Client_pb.EmptyMessage, Client_pb.StatusMessage>;
    nodesAdd: grpc.handleUnaryCall<Client_pb.NodeAddressMessage, Client_pb.EmptyMessage>;
    nodesPing: grpc.handleUnaryCall<Client_pb.NodeMessage, Client_pb.StatusMessage>;
    nodesClaim: grpc.handleUnaryCall<Client_pb.NodeClaimMessage, Client_pb.StatusMessage>;
    nodesFind: grpc.handleUnaryCall<Client_pb.NodeMessage, Client_pb.NodeAddressMessage>;
    keysKeyPairRoot: grpc.handleUnaryCall<Client_pb.EmptyMessage, Client_pb.KeyPairMessage>;
    keysKeyPairReset: grpc.handleUnaryCall<Client_pb.KeyMessage, Client_pb.EmptyMessage>;
    keysKeyPairRenew: grpc.handleUnaryCall<Client_pb.KeyMessage, Client_pb.EmptyMessage>;
    keysEncrypt: grpc.handleUnaryCall<Client_pb.CryptoMessage, Client_pb.CryptoMessage>;
    keysDecrypt: grpc.handleUnaryCall<Client_pb.CryptoMessage, Client_pb.CryptoMessage>;
    keysSign: grpc.handleUnaryCall<Client_pb.CryptoMessage, Client_pb.CryptoMessage>;
    keysVerify: grpc.handleUnaryCall<Client_pb.CryptoMessage, Client_pb.StatusMessage>;
    keysPasswordChange: grpc.handleUnaryCall<Client_pb.PasswordMessage, Client_pb.EmptyMessage>;
    keysCertsGet: grpc.handleUnaryCall<Client_pb.EmptyMessage, Client_pb.CertificateMessage>;
    keysCertsChainGet: grpc.handleServerStreamingCall<Client_pb.EmptyMessage, Client_pb.CertificateMessage>;
    vaultsList: grpc.handleServerStreamingCall<Client_pb.EmptyMessage, Client_pb.VaultListMessage>;
    vaultsCreate: grpc.handleUnaryCall<Client_pb.VaultMessage, Client_pb.VaultMessage>;
    vaultsRename: grpc.handleUnaryCall<Client_pb.VaultRenameMessage, Client_pb.VaultMessage>;
    vaultsDelete: grpc.handleUnaryCall<Client_pb.VaultMessage, Client_pb.StatusMessage>;
    vaultsPull: grpc.handleUnaryCall<Client_pb.VaultPullMessage, Client_pb.StatusMessage>;
    vaultsClone: grpc.handleUnaryCall<Client_pb.VaultCloneMessage, Client_pb.StatusMessage>;
    vaultsScan: grpc.handleServerStreamingCall<Client_pb.NodeMessage, Client_pb.VaultListMessage>;
    vaultsSecretsList: grpc.handleServerStreamingCall<Client_pb.VaultMessage, Client_pb.SecretMessage>;
    vaultsSecretsMkdir: grpc.handleUnaryCall<Client_pb.VaultMkdirMessage, Client_pb.StatusMessage>;
    vaultsSecretsStat: grpc.handleUnaryCall<Client_pb.VaultMessage, Client_pb.StatMessage>;
    vaultsSecretsDelete: grpc.handleUnaryCall<Client_pb.SecretMessage, Client_pb.StatusMessage>;
    vaultsSecretsEdit: grpc.handleUnaryCall<Client_pb.SecretEditMessage, Client_pb.StatusMessage>;
    vaultsSecretsGet: grpc.handleUnaryCall<Client_pb.SecretMessage, Client_pb.SecretMessage>;
    vaultsSecretsRename: grpc.handleUnaryCall<Client_pb.SecretRenameMessage, Client_pb.StatusMessage>;
    vaultsSecretsNew: grpc.handleUnaryCall<Client_pb.SecretMessage, Client_pb.StatusMessage>;
    vaultsSecretsNewDir: grpc.handleUnaryCall<Client_pb.SecretDirectoryMessage, Client_pb.StatusMessage>;
    vaultsPermissionsSet: grpc.handleUnaryCall<Client_pb.SetVaultPermMessage, Client_pb.StatusMessage>;
    vaultsPermissionsUnset: grpc.handleUnaryCall<Client_pb.UnsetVaultPermMessage, Client_pb.StatusMessage>;
    vaultsPermissions: grpc.handleServerStreamingCall<Client_pb.GetVaultPermMessage, Client_pb.PermissionMessage>;
    vaultsVersion: grpc.handleUnaryCall<Client_pb.VaultsVersionMessage, Client_pb.VaultsVersionResultMessage>;
    identitiesAuthenticate: grpc.handleServerStreamingCall<Client_pb.ProviderMessage, Client_pb.ProviderMessage>;
    identitiesTokenPut: grpc.handleUnaryCall<Client_pb.TokenSpecificMessage, Client_pb.EmptyMessage>;
    identitiesTokenGet: grpc.handleUnaryCall<Client_pb.ProviderMessage, Client_pb.TokenMessage>;
    identitiesTokenDelete: grpc.handleUnaryCall<Client_pb.ProviderMessage, Client_pb.EmptyMessage>;
    identitiesProvidersList: grpc.handleUnaryCall<Client_pb.EmptyMessage, Client_pb.ProviderMessage>;
    identitiesInfoGet: grpc.handleUnaryCall<Client_pb.ProviderMessage, Client_pb.ProviderMessage>;
    identitiesInfoGetConnected: grpc.handleServerStreamingCall<Client_pb.ProviderSearchMessage, Client_pb.IdentityInfoMessage>;
    identitiesClaim: grpc.handleUnaryCall<Client_pb.ProviderMessage, Client_pb.EmptyMessage>;
    gestaltsGestaltList: grpc.handleServerStreamingCall<Client_pb.EmptyMessage, Client_pb.GestaltMessage>;
    gestaltsGestaltGetByNode: grpc.handleUnaryCall<Client_pb.NodeMessage, Client_pb.GestaltGraphMessage>;
    gestaltsGestaltGetByIdentity: grpc.handleUnaryCall<Client_pb.ProviderMessage, Client_pb.GestaltGraphMessage>;
    gestaltsDiscoveryByNode: grpc.handleUnaryCall<Client_pb.NodeMessage, Client_pb.EmptyMessage>;
    gestaltsDiscoveryByIdentity: grpc.handleUnaryCall<Client_pb.ProviderMessage, Client_pb.EmptyMessage>;
    gestaltsActionsGetByNode: grpc.handleUnaryCall<Client_pb.NodeMessage, Client_pb.ActionsMessage>;
    gestaltsActionsGetByIdentity: grpc.handleUnaryCall<Client_pb.ProviderMessage, Client_pb.ActionsMessage>;
    gestaltsActionsSetByNode: grpc.handleUnaryCall<Client_pb.SetActionsMessage, Client_pb.EmptyMessage>;
    gestaltsActionsSetByIdentity: grpc.handleUnaryCall<Client_pb.SetActionsMessage, Client_pb.EmptyMessage>;
    gestaltsActionsUnsetByNode: grpc.handleUnaryCall<Client_pb.SetActionsMessage, Client_pb.EmptyMessage>;
    gestaltsActionsUnsetByIdentity: grpc.handleUnaryCall<Client_pb.SetActionsMessage, Client_pb.EmptyMessage>;
    notificationsSend: grpc.handleUnaryCall<Client_pb.NotificationsSendMessage, Client_pb.EmptyMessage>;
    notificationsRead: grpc.handleUnaryCall<Client_pb.NotificationsReadMessage, Client_pb.NotificationsListMessage>;
    notificationsClear: grpc.handleUnaryCall<Client_pb.EmptyMessage, Client_pb.EmptyMessage>;
}

export interface IClientClient {
    echo(request: Client_pb.EchoMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    echo(request: Client_pb.EchoMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    echo(request: Client_pb.EchoMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    agentStop(request: Client_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    agentStop(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    agentStop(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    sessionUnlock(request: Client_pb.PasswordMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.SessionTokenMessage) => void): grpc.ClientUnaryCall;
    sessionUnlock(request: Client_pb.PasswordMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.SessionTokenMessage) => void): grpc.ClientUnaryCall;
    sessionUnlock(request: Client_pb.PasswordMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.SessionTokenMessage) => void): grpc.ClientUnaryCall;
    sessionRefresh(request: Client_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.SessionTokenMessage) => void): grpc.ClientUnaryCall;
    sessionRefresh(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.SessionTokenMessage) => void): grpc.ClientUnaryCall;
    sessionRefresh(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.SessionTokenMessage) => void): grpc.ClientUnaryCall;
    sessionLockAll(request: Client_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    sessionLockAll(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    sessionLockAll(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    nodesAdd(request: Client_pb.NodeAddressMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    nodesAdd(request: Client_pb.NodeAddressMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    nodesAdd(request: Client_pb.NodeAddressMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    nodesPing(request: Client_pb.NodeMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    nodesPing(request: Client_pb.NodeMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    nodesPing(request: Client_pb.NodeMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    nodesClaim(request: Client_pb.NodeClaimMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    nodesClaim(request: Client_pb.NodeClaimMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    nodesClaim(request: Client_pb.NodeClaimMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    nodesFind(request: Client_pb.NodeMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.NodeAddressMessage) => void): grpc.ClientUnaryCall;
    nodesFind(request: Client_pb.NodeMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.NodeAddressMessage) => void): grpc.ClientUnaryCall;
    nodesFind(request: Client_pb.NodeMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.NodeAddressMessage) => void): grpc.ClientUnaryCall;
    keysKeyPairRoot(request: Client_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.KeyPairMessage) => void): grpc.ClientUnaryCall;
    keysKeyPairRoot(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.KeyPairMessage) => void): grpc.ClientUnaryCall;
    keysKeyPairRoot(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.KeyPairMessage) => void): grpc.ClientUnaryCall;
    keysKeyPairReset(request: Client_pb.KeyMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    keysKeyPairReset(request: Client_pb.KeyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    keysKeyPairReset(request: Client_pb.KeyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    keysKeyPairRenew(request: Client_pb.KeyMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    keysKeyPairRenew(request: Client_pb.KeyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    keysKeyPairRenew(request: Client_pb.KeyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    keysEncrypt(request: Client_pb.CryptoMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.CryptoMessage) => void): grpc.ClientUnaryCall;
    keysEncrypt(request: Client_pb.CryptoMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.CryptoMessage) => void): grpc.ClientUnaryCall;
    keysEncrypt(request: Client_pb.CryptoMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.CryptoMessage) => void): grpc.ClientUnaryCall;
    keysDecrypt(request: Client_pb.CryptoMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.CryptoMessage) => void): grpc.ClientUnaryCall;
    keysDecrypt(request: Client_pb.CryptoMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.CryptoMessage) => void): grpc.ClientUnaryCall;
    keysDecrypt(request: Client_pb.CryptoMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.CryptoMessage) => void): grpc.ClientUnaryCall;
    keysSign(request: Client_pb.CryptoMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.CryptoMessage) => void): grpc.ClientUnaryCall;
    keysSign(request: Client_pb.CryptoMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.CryptoMessage) => void): grpc.ClientUnaryCall;
    keysSign(request: Client_pb.CryptoMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.CryptoMessage) => void): grpc.ClientUnaryCall;
    keysVerify(request: Client_pb.CryptoMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    keysVerify(request: Client_pb.CryptoMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    keysVerify(request: Client_pb.CryptoMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    keysPasswordChange(request: Client_pb.PasswordMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    keysPasswordChange(request: Client_pb.PasswordMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    keysPasswordChange(request: Client_pb.PasswordMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    keysCertsGet(request: Client_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.CertificateMessage) => void): grpc.ClientUnaryCall;
    keysCertsGet(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.CertificateMessage) => void): grpc.ClientUnaryCall;
    keysCertsGet(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.CertificateMessage) => void): grpc.ClientUnaryCall;
    keysCertsChainGet(request: Client_pb.EmptyMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.CertificateMessage>;
    keysCertsChainGet(request: Client_pb.EmptyMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.CertificateMessage>;
    vaultsList(request: Client_pb.EmptyMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.VaultListMessage>;
    vaultsList(request: Client_pb.EmptyMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.VaultListMessage>;
    vaultsCreate(request: Client_pb.VaultMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.VaultMessage) => void): grpc.ClientUnaryCall;
    vaultsCreate(request: Client_pb.VaultMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.VaultMessage) => void): grpc.ClientUnaryCall;
    vaultsCreate(request: Client_pb.VaultMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.VaultMessage) => void): grpc.ClientUnaryCall;
    vaultsRename(request: Client_pb.VaultRenameMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.VaultMessage) => void): grpc.ClientUnaryCall;
    vaultsRename(request: Client_pb.VaultRenameMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.VaultMessage) => void): grpc.ClientUnaryCall;
    vaultsRename(request: Client_pb.VaultRenameMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.VaultMessage) => void): grpc.ClientUnaryCall;
    vaultsDelete(request: Client_pb.VaultMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsDelete(request: Client_pb.VaultMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsDelete(request: Client_pb.VaultMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsPull(request: Client_pb.VaultPullMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsPull(request: Client_pb.VaultPullMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsPull(request: Client_pb.VaultPullMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsClone(request: Client_pb.VaultCloneMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsClone(request: Client_pb.VaultCloneMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsClone(request: Client_pb.VaultCloneMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsScan(request: Client_pb.NodeMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.VaultListMessage>;
    vaultsScan(request: Client_pb.NodeMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.VaultListMessage>;
    vaultsSecretsList(request: Client_pb.VaultMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.SecretMessage>;
    vaultsSecretsList(request: Client_pb.VaultMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.SecretMessage>;
    vaultsSecretsMkdir(request: Client_pb.VaultMkdirMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsMkdir(request: Client_pb.VaultMkdirMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsMkdir(request: Client_pb.VaultMkdirMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsStat(request: Client_pb.VaultMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.StatMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsStat(request: Client_pb.VaultMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsStat(request: Client_pb.VaultMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsDelete(request: Client_pb.SecretMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsDelete(request: Client_pb.SecretMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsDelete(request: Client_pb.SecretMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsEdit(request: Client_pb.SecretEditMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsEdit(request: Client_pb.SecretEditMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsEdit(request: Client_pb.SecretEditMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsGet(request: Client_pb.SecretMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.SecretMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsGet(request: Client_pb.SecretMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.SecretMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsGet(request: Client_pb.SecretMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.SecretMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsRename(request: Client_pb.SecretRenameMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsRename(request: Client_pb.SecretRenameMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsRename(request: Client_pb.SecretRenameMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsNew(request: Client_pb.SecretMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsNew(request: Client_pb.SecretMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsNew(request: Client_pb.SecretMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsNewDir(request: Client_pb.SecretDirectoryMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsNewDir(request: Client_pb.SecretDirectoryMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsNewDir(request: Client_pb.SecretDirectoryMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsPermissionsSet(request: Client_pb.SetVaultPermMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsPermissionsSet(request: Client_pb.SetVaultPermMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsPermissionsSet(request: Client_pb.SetVaultPermMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsPermissionsUnset(request: Client_pb.UnsetVaultPermMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsPermissionsUnset(request: Client_pb.UnsetVaultPermMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsPermissionsUnset(request: Client_pb.UnsetVaultPermMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsPermissions(request: Client_pb.GetVaultPermMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.PermissionMessage>;
    vaultsPermissions(request: Client_pb.GetVaultPermMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.PermissionMessage>;
    vaultsVersion(request: Client_pb.VaultsVersionMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.VaultsVersionResultMessage) => void): grpc.ClientUnaryCall;
    vaultsVersion(request: Client_pb.VaultsVersionMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.VaultsVersionResultMessage) => void): grpc.ClientUnaryCall;
    vaultsVersion(request: Client_pb.VaultsVersionMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.VaultsVersionResultMessage) => void): grpc.ClientUnaryCall;
    identitiesAuthenticate(request: Client_pb.ProviderMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.ProviderMessage>;
    identitiesAuthenticate(request: Client_pb.ProviderMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.ProviderMessage>;
    identitiesTokenPut(request: Client_pb.TokenSpecificMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    identitiesTokenPut(request: Client_pb.TokenSpecificMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    identitiesTokenPut(request: Client_pb.TokenSpecificMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    identitiesTokenGet(request: Client_pb.ProviderMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.TokenMessage) => void): grpc.ClientUnaryCall;
    identitiesTokenGet(request: Client_pb.ProviderMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.TokenMessage) => void): grpc.ClientUnaryCall;
    identitiesTokenGet(request: Client_pb.ProviderMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.TokenMessage) => void): grpc.ClientUnaryCall;
    identitiesTokenDelete(request: Client_pb.ProviderMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    identitiesTokenDelete(request: Client_pb.ProviderMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    identitiesTokenDelete(request: Client_pb.ProviderMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    identitiesProvidersList(request: Client_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.ProviderMessage) => void): grpc.ClientUnaryCall;
    identitiesProvidersList(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.ProviderMessage) => void): grpc.ClientUnaryCall;
    identitiesProvidersList(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.ProviderMessage) => void): grpc.ClientUnaryCall;
    identitiesInfoGet(request: Client_pb.ProviderMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.ProviderMessage) => void): grpc.ClientUnaryCall;
    identitiesInfoGet(request: Client_pb.ProviderMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.ProviderMessage) => void): grpc.ClientUnaryCall;
    identitiesInfoGet(request: Client_pb.ProviderMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.ProviderMessage) => void): grpc.ClientUnaryCall;
    identitiesInfoGetConnected(request: Client_pb.ProviderSearchMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.IdentityInfoMessage>;
    identitiesInfoGetConnected(request: Client_pb.ProviderSearchMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.IdentityInfoMessage>;
    identitiesClaim(request: Client_pb.ProviderMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    identitiesClaim(request: Client_pb.ProviderMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    identitiesClaim(request: Client_pb.ProviderMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsGestaltList(request: Client_pb.EmptyMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.GestaltMessage>;
    gestaltsGestaltList(request: Client_pb.EmptyMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.GestaltMessage>;
    gestaltsGestaltGetByNode(request: Client_pb.NodeMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.GestaltGraphMessage) => void): grpc.ClientUnaryCall;
    gestaltsGestaltGetByNode(request: Client_pb.NodeMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.GestaltGraphMessage) => void): grpc.ClientUnaryCall;
    gestaltsGestaltGetByNode(request: Client_pb.NodeMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.GestaltGraphMessage) => void): grpc.ClientUnaryCall;
    gestaltsGestaltGetByIdentity(request: Client_pb.ProviderMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.GestaltGraphMessage) => void): grpc.ClientUnaryCall;
    gestaltsGestaltGetByIdentity(request: Client_pb.ProviderMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.GestaltGraphMessage) => void): grpc.ClientUnaryCall;
    gestaltsGestaltGetByIdentity(request: Client_pb.ProviderMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.GestaltGraphMessage) => void): grpc.ClientUnaryCall;
    gestaltsDiscoveryByNode(request: Client_pb.NodeMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsDiscoveryByNode(request: Client_pb.NodeMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsDiscoveryByNode(request: Client_pb.NodeMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsDiscoveryByIdentity(request: Client_pb.ProviderMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsDiscoveryByIdentity(request: Client_pb.ProviderMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsDiscoveryByIdentity(request: Client_pb.ProviderMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsGetByNode(request: Client_pb.NodeMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.ActionsMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsGetByNode(request: Client_pb.NodeMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.ActionsMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsGetByNode(request: Client_pb.NodeMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.ActionsMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsGetByIdentity(request: Client_pb.ProviderMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.ActionsMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsGetByIdentity(request: Client_pb.ProviderMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.ActionsMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsGetByIdentity(request: Client_pb.ProviderMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.ActionsMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsSetByNode(request: Client_pb.SetActionsMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsSetByNode(request: Client_pb.SetActionsMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsSetByNode(request: Client_pb.SetActionsMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsSetByIdentity(request: Client_pb.SetActionsMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsSetByIdentity(request: Client_pb.SetActionsMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsSetByIdentity(request: Client_pb.SetActionsMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsUnsetByNode(request: Client_pb.SetActionsMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsUnsetByNode(request: Client_pb.SetActionsMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsUnsetByNode(request: Client_pb.SetActionsMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsUnsetByIdentity(request: Client_pb.SetActionsMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsUnsetByIdentity(request: Client_pb.SetActionsMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsUnsetByIdentity(request: Client_pb.SetActionsMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    notificationsSend(request: Client_pb.NotificationsSendMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    notificationsSend(request: Client_pb.NotificationsSendMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    notificationsSend(request: Client_pb.NotificationsSendMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    notificationsRead(request: Client_pb.NotificationsReadMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.NotificationsListMessage) => void): grpc.ClientUnaryCall;
    notificationsRead(request: Client_pb.NotificationsReadMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.NotificationsListMessage) => void): grpc.ClientUnaryCall;
    notificationsRead(request: Client_pb.NotificationsReadMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.NotificationsListMessage) => void): grpc.ClientUnaryCall;
    notificationsClear(request: Client_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    notificationsClear(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    notificationsClear(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
}

export class ClientClient extends grpc.Client implements IClientClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: Partial<grpc.ClientOptions>);
    public echo(request: Client_pb.EchoMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    public echo(request: Client_pb.EchoMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    public echo(request: Client_pb.EchoMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    public agentStop(request: Client_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public agentStop(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public agentStop(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public sessionUnlock(request: Client_pb.PasswordMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.SessionTokenMessage) => void): grpc.ClientUnaryCall;
    public sessionUnlock(request: Client_pb.PasswordMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.SessionTokenMessage) => void): grpc.ClientUnaryCall;
    public sessionUnlock(request: Client_pb.PasswordMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.SessionTokenMessage) => void): grpc.ClientUnaryCall;
    public sessionRefresh(request: Client_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.SessionTokenMessage) => void): grpc.ClientUnaryCall;
    public sessionRefresh(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.SessionTokenMessage) => void): grpc.ClientUnaryCall;
    public sessionRefresh(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.SessionTokenMessage) => void): grpc.ClientUnaryCall;
    public sessionLockAll(request: Client_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public sessionLockAll(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public sessionLockAll(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public nodesAdd(request: Client_pb.NodeAddressMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public nodesAdd(request: Client_pb.NodeAddressMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public nodesAdd(request: Client_pb.NodeAddressMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public nodesPing(request: Client_pb.NodeMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public nodesPing(request: Client_pb.NodeMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public nodesPing(request: Client_pb.NodeMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public nodesClaim(request: Client_pb.NodeClaimMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public nodesClaim(request: Client_pb.NodeClaimMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public nodesClaim(request: Client_pb.NodeClaimMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public nodesFind(request: Client_pb.NodeMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.NodeAddressMessage) => void): grpc.ClientUnaryCall;
    public nodesFind(request: Client_pb.NodeMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.NodeAddressMessage) => void): grpc.ClientUnaryCall;
    public nodesFind(request: Client_pb.NodeMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.NodeAddressMessage) => void): grpc.ClientUnaryCall;
    public keysKeyPairRoot(request: Client_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.KeyPairMessage) => void): grpc.ClientUnaryCall;
    public keysKeyPairRoot(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.KeyPairMessage) => void): grpc.ClientUnaryCall;
    public keysKeyPairRoot(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.KeyPairMessage) => void): grpc.ClientUnaryCall;
    public keysKeyPairReset(request: Client_pb.KeyMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public keysKeyPairReset(request: Client_pb.KeyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public keysKeyPairReset(request: Client_pb.KeyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public keysKeyPairRenew(request: Client_pb.KeyMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public keysKeyPairRenew(request: Client_pb.KeyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public keysKeyPairRenew(request: Client_pb.KeyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public keysEncrypt(request: Client_pb.CryptoMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.CryptoMessage) => void): grpc.ClientUnaryCall;
    public keysEncrypt(request: Client_pb.CryptoMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.CryptoMessage) => void): grpc.ClientUnaryCall;
    public keysEncrypt(request: Client_pb.CryptoMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.CryptoMessage) => void): grpc.ClientUnaryCall;
    public keysDecrypt(request: Client_pb.CryptoMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.CryptoMessage) => void): grpc.ClientUnaryCall;
    public keysDecrypt(request: Client_pb.CryptoMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.CryptoMessage) => void): grpc.ClientUnaryCall;
    public keysDecrypt(request: Client_pb.CryptoMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.CryptoMessage) => void): grpc.ClientUnaryCall;
    public keysSign(request: Client_pb.CryptoMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.CryptoMessage) => void): grpc.ClientUnaryCall;
    public keysSign(request: Client_pb.CryptoMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.CryptoMessage) => void): grpc.ClientUnaryCall;
    public keysSign(request: Client_pb.CryptoMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.CryptoMessage) => void): grpc.ClientUnaryCall;
    public keysVerify(request: Client_pb.CryptoMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public keysVerify(request: Client_pb.CryptoMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public keysVerify(request: Client_pb.CryptoMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public keysPasswordChange(request: Client_pb.PasswordMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public keysPasswordChange(request: Client_pb.PasswordMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public keysPasswordChange(request: Client_pb.PasswordMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public keysCertsGet(request: Client_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.CertificateMessage) => void): grpc.ClientUnaryCall;
    public keysCertsGet(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.CertificateMessage) => void): grpc.ClientUnaryCall;
    public keysCertsGet(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.CertificateMessage) => void): grpc.ClientUnaryCall;
    public keysCertsChainGet(request: Client_pb.EmptyMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.CertificateMessage>;
    public keysCertsChainGet(request: Client_pb.EmptyMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.CertificateMessage>;
    public vaultsList(request: Client_pb.EmptyMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.VaultListMessage>;
    public vaultsList(request: Client_pb.EmptyMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.VaultListMessage>;
    public vaultsCreate(request: Client_pb.VaultMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.VaultMessage) => void): grpc.ClientUnaryCall;
    public vaultsCreate(request: Client_pb.VaultMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.VaultMessage) => void): grpc.ClientUnaryCall;
    public vaultsCreate(request: Client_pb.VaultMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.VaultMessage) => void): grpc.ClientUnaryCall;
    public vaultsRename(request: Client_pb.VaultRenameMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.VaultMessage) => void): grpc.ClientUnaryCall;
    public vaultsRename(request: Client_pb.VaultRenameMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.VaultMessage) => void): grpc.ClientUnaryCall;
    public vaultsRename(request: Client_pb.VaultRenameMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.VaultMessage) => void): grpc.ClientUnaryCall;
    public vaultsDelete(request: Client_pb.VaultMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsDelete(request: Client_pb.VaultMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsDelete(request: Client_pb.VaultMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsPull(request: Client_pb.VaultPullMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsPull(request: Client_pb.VaultPullMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsPull(request: Client_pb.VaultPullMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsClone(request: Client_pb.VaultCloneMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsClone(request: Client_pb.VaultCloneMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsClone(request: Client_pb.VaultCloneMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsScan(request: Client_pb.NodeMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.VaultListMessage>;
    public vaultsScan(request: Client_pb.NodeMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.VaultListMessage>;
    public vaultsSecretsList(request: Client_pb.VaultMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.SecretMessage>;
    public vaultsSecretsList(request: Client_pb.VaultMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.SecretMessage>;
    public vaultsSecretsMkdir(request: Client_pb.VaultMkdirMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsMkdir(request: Client_pb.VaultMkdirMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsMkdir(request: Client_pb.VaultMkdirMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsStat(request: Client_pb.VaultMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.StatMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsStat(request: Client_pb.VaultMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsStat(request: Client_pb.VaultMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsDelete(request: Client_pb.SecretMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsDelete(request: Client_pb.SecretMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsDelete(request: Client_pb.SecretMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsEdit(request: Client_pb.SecretEditMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsEdit(request: Client_pb.SecretEditMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsEdit(request: Client_pb.SecretEditMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsGet(request: Client_pb.SecretMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.SecretMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsGet(request: Client_pb.SecretMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.SecretMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsGet(request: Client_pb.SecretMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.SecretMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsRename(request: Client_pb.SecretRenameMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsRename(request: Client_pb.SecretRenameMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsRename(request: Client_pb.SecretRenameMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsNew(request: Client_pb.SecretMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsNew(request: Client_pb.SecretMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsNew(request: Client_pb.SecretMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsNewDir(request: Client_pb.SecretDirectoryMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsNewDir(request: Client_pb.SecretDirectoryMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsNewDir(request: Client_pb.SecretDirectoryMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsPermissionsSet(request: Client_pb.SetVaultPermMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsPermissionsSet(request: Client_pb.SetVaultPermMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsPermissionsSet(request: Client_pb.SetVaultPermMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsPermissionsUnset(request: Client_pb.UnsetVaultPermMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsPermissionsUnset(request: Client_pb.UnsetVaultPermMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsPermissionsUnset(request: Client_pb.UnsetVaultPermMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsPermissions(request: Client_pb.GetVaultPermMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.PermissionMessage>;
    public vaultsPermissions(request: Client_pb.GetVaultPermMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.PermissionMessage>;
    public vaultsVersion(request: Client_pb.VaultsVersionMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.VaultsVersionResultMessage) => void): grpc.ClientUnaryCall;
    public vaultsVersion(request: Client_pb.VaultsVersionMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.VaultsVersionResultMessage) => void): grpc.ClientUnaryCall;
    public vaultsVersion(request: Client_pb.VaultsVersionMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.VaultsVersionResultMessage) => void): grpc.ClientUnaryCall;
    public identitiesAuthenticate(request: Client_pb.ProviderMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.ProviderMessage>;
    public identitiesAuthenticate(request: Client_pb.ProviderMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.ProviderMessage>;
    public identitiesTokenPut(request: Client_pb.TokenSpecificMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public identitiesTokenPut(request: Client_pb.TokenSpecificMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public identitiesTokenPut(request: Client_pb.TokenSpecificMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public identitiesTokenGet(request: Client_pb.ProviderMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.TokenMessage) => void): grpc.ClientUnaryCall;
    public identitiesTokenGet(request: Client_pb.ProviderMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.TokenMessage) => void): grpc.ClientUnaryCall;
    public identitiesTokenGet(request: Client_pb.ProviderMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.TokenMessage) => void): grpc.ClientUnaryCall;
    public identitiesTokenDelete(request: Client_pb.ProviderMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public identitiesTokenDelete(request: Client_pb.ProviderMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public identitiesTokenDelete(request: Client_pb.ProviderMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public identitiesProvidersList(request: Client_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.ProviderMessage) => void): grpc.ClientUnaryCall;
    public identitiesProvidersList(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.ProviderMessage) => void): grpc.ClientUnaryCall;
    public identitiesProvidersList(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.ProviderMessage) => void): grpc.ClientUnaryCall;
    public identitiesInfoGet(request: Client_pb.ProviderMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.ProviderMessage) => void): grpc.ClientUnaryCall;
    public identitiesInfoGet(request: Client_pb.ProviderMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.ProviderMessage) => void): grpc.ClientUnaryCall;
    public identitiesInfoGet(request: Client_pb.ProviderMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.ProviderMessage) => void): grpc.ClientUnaryCall;
    public identitiesInfoGetConnected(request: Client_pb.ProviderSearchMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.IdentityInfoMessage>;
    public identitiesInfoGetConnected(request: Client_pb.ProviderSearchMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.IdentityInfoMessage>;
    public identitiesClaim(request: Client_pb.ProviderMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public identitiesClaim(request: Client_pb.ProviderMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public identitiesClaim(request: Client_pb.ProviderMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsGestaltList(request: Client_pb.EmptyMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.GestaltMessage>;
    public gestaltsGestaltList(request: Client_pb.EmptyMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Client_pb.GestaltMessage>;
    public gestaltsGestaltGetByNode(request: Client_pb.NodeMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.GestaltGraphMessage) => void): grpc.ClientUnaryCall;
    public gestaltsGestaltGetByNode(request: Client_pb.NodeMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.GestaltGraphMessage) => void): grpc.ClientUnaryCall;
    public gestaltsGestaltGetByNode(request: Client_pb.NodeMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.GestaltGraphMessage) => void): grpc.ClientUnaryCall;
    public gestaltsGestaltGetByIdentity(request: Client_pb.ProviderMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.GestaltGraphMessage) => void): grpc.ClientUnaryCall;
    public gestaltsGestaltGetByIdentity(request: Client_pb.ProviderMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.GestaltGraphMessage) => void): grpc.ClientUnaryCall;
    public gestaltsGestaltGetByIdentity(request: Client_pb.ProviderMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.GestaltGraphMessage) => void): grpc.ClientUnaryCall;
    public gestaltsDiscoveryByNode(request: Client_pb.NodeMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsDiscoveryByNode(request: Client_pb.NodeMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsDiscoveryByNode(request: Client_pb.NodeMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsDiscoveryByIdentity(request: Client_pb.ProviderMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsDiscoveryByIdentity(request: Client_pb.ProviderMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsDiscoveryByIdentity(request: Client_pb.ProviderMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsGetByNode(request: Client_pb.NodeMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.ActionsMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsGetByNode(request: Client_pb.NodeMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.ActionsMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsGetByNode(request: Client_pb.NodeMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.ActionsMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsGetByIdentity(request: Client_pb.ProviderMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.ActionsMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsGetByIdentity(request: Client_pb.ProviderMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.ActionsMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsGetByIdentity(request: Client_pb.ProviderMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.ActionsMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsSetByNode(request: Client_pb.SetActionsMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsSetByNode(request: Client_pb.SetActionsMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsSetByNode(request: Client_pb.SetActionsMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsSetByIdentity(request: Client_pb.SetActionsMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsSetByIdentity(request: Client_pb.SetActionsMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsSetByIdentity(request: Client_pb.SetActionsMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsUnsetByNode(request: Client_pb.SetActionsMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsUnsetByNode(request: Client_pb.SetActionsMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsUnsetByNode(request: Client_pb.SetActionsMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsUnsetByIdentity(request: Client_pb.SetActionsMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsUnsetByIdentity(request: Client_pb.SetActionsMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsUnsetByIdentity(request: Client_pb.SetActionsMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public notificationsSend(request: Client_pb.NotificationsSendMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public notificationsSend(request: Client_pb.NotificationsSendMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public notificationsSend(request: Client_pb.NotificationsSendMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public notificationsRead(request: Client_pb.NotificationsReadMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.NotificationsListMessage) => void): grpc.ClientUnaryCall;
    public notificationsRead(request: Client_pb.NotificationsReadMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.NotificationsListMessage) => void): grpc.ClientUnaryCall;
    public notificationsRead(request: Client_pb.NotificationsReadMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.NotificationsListMessage) => void): grpc.ClientUnaryCall;
    public notificationsClear(request: Client_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public notificationsClear(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public notificationsClear(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
}
