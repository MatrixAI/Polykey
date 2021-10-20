// package: clientInterface
// file: Client.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as Client_pb from "./Client_pb";
import * as Gestalts_pb from "./Gestalts_pb";
import * as Identities_pb from "./Identities_pb";
import * as Keys_pb from "./Keys_pb";
import * as Nodes_pb from "./Nodes_pb";
import * as Notifications_pb from "./Notifications_pb";
import * as Permissions_pb from "./Permissions_pb";
import * as Secrets_pb from "./Secrets_pb";
import * as Sessions_pb from "./Sessions_pb";
import * as Vaults_pb from "./Vaults_pb";

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
    vaultsLog: IClientService_IVaultsLog;
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
interface IClientService_ISessionUnlock extends grpc.MethodDefinition<Sessions_pb.Password, Sessions_pb.Token> {
    path: "/clientInterface.Client/SessionUnlock";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Sessions_pb.Password>;
    requestDeserialize: grpc.deserialize<Sessions_pb.Password>;
    responseSerialize: grpc.serialize<Sessions_pb.Token>;
    responseDeserialize: grpc.deserialize<Sessions_pb.Token>;
}
interface IClientService_ISessionRefresh extends grpc.MethodDefinition<Client_pb.EmptyMessage, Sessions_pb.Token> {
    path: "/clientInterface.Client/SessionRefresh";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Sessions_pb.Token>;
    responseDeserialize: grpc.deserialize<Sessions_pb.Token>;
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
interface IClientService_INodesAdd extends grpc.MethodDefinition<Nodes_pb.Address, Client_pb.EmptyMessage> {
    path: "/clientInterface.Client/NodesAdd";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Nodes_pb.Address>;
    requestDeserialize: grpc.deserialize<Nodes_pb.Address>;
    responseSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
}
interface IClientService_INodesPing extends grpc.MethodDefinition<Nodes_pb.Node, Client_pb.StatusMessage> {
    path: "/clientInterface.Client/NodesPing";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Nodes_pb.Node>;
    requestDeserialize: grpc.deserialize<Nodes_pb.Node>;
    responseSerialize: grpc.serialize<Client_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.StatusMessage>;
}
interface IClientService_INodesClaim extends grpc.MethodDefinition<Nodes_pb.Claim, Client_pb.StatusMessage> {
    path: "/clientInterface.Client/NodesClaim";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Nodes_pb.Claim>;
    requestDeserialize: grpc.deserialize<Nodes_pb.Claim>;
    responseSerialize: grpc.serialize<Client_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.StatusMessage>;
}
interface IClientService_INodesFind extends grpc.MethodDefinition<Nodes_pb.Node, Nodes_pb.Address> {
    path: "/clientInterface.Client/NodesFind";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Nodes_pb.Node>;
    requestDeserialize: grpc.deserialize<Nodes_pb.Node>;
    responseSerialize: grpc.serialize<Nodes_pb.Address>;
    responseDeserialize: grpc.deserialize<Nodes_pb.Address>;
}
interface IClientService_IKeysKeyPairRoot extends grpc.MethodDefinition<Client_pb.EmptyMessage, Keys_pb.KeyPair> {
    path: "/clientInterface.Client/KeysKeyPairRoot";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Keys_pb.KeyPair>;
    responseDeserialize: grpc.deserialize<Keys_pb.KeyPair>;
}
interface IClientService_IKeysKeyPairReset extends grpc.MethodDefinition<Keys_pb.Key, Client_pb.EmptyMessage> {
    path: "/clientInterface.Client/KeysKeyPairReset";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Keys_pb.Key>;
    requestDeserialize: grpc.deserialize<Keys_pb.Key>;
    responseSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
}
interface IClientService_IKeysKeyPairRenew extends grpc.MethodDefinition<Keys_pb.Key, Client_pb.EmptyMessage> {
    path: "/clientInterface.Client/KeysKeyPairRenew";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Keys_pb.Key>;
    requestDeserialize: grpc.deserialize<Keys_pb.Key>;
    responseSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
}
interface IClientService_IKeysEncrypt extends grpc.MethodDefinition<Keys_pb.Crypto, Keys_pb.Crypto> {
    path: "/clientInterface.Client/KeysEncrypt";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Keys_pb.Crypto>;
    requestDeserialize: grpc.deserialize<Keys_pb.Crypto>;
    responseSerialize: grpc.serialize<Keys_pb.Crypto>;
    responseDeserialize: grpc.deserialize<Keys_pb.Crypto>;
}
interface IClientService_IKeysDecrypt extends grpc.MethodDefinition<Keys_pb.Crypto, Keys_pb.Crypto> {
    path: "/clientInterface.Client/KeysDecrypt";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Keys_pb.Crypto>;
    requestDeserialize: grpc.deserialize<Keys_pb.Crypto>;
    responseSerialize: grpc.serialize<Keys_pb.Crypto>;
    responseDeserialize: grpc.deserialize<Keys_pb.Crypto>;
}
interface IClientService_IKeysSign extends grpc.MethodDefinition<Keys_pb.Crypto, Keys_pb.Crypto> {
    path: "/clientInterface.Client/KeysSign";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Keys_pb.Crypto>;
    requestDeserialize: grpc.deserialize<Keys_pb.Crypto>;
    responseSerialize: grpc.serialize<Keys_pb.Crypto>;
    responseDeserialize: grpc.deserialize<Keys_pb.Crypto>;
}
interface IClientService_IKeysVerify extends grpc.MethodDefinition<Keys_pb.Crypto, Client_pb.StatusMessage> {
    path: "/clientInterface.Client/KeysVerify";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Keys_pb.Crypto>;
    requestDeserialize: grpc.deserialize<Keys_pb.Crypto>;
    responseSerialize: grpc.serialize<Client_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.StatusMessage>;
}
interface IClientService_IKeysPasswordChange extends grpc.MethodDefinition<Sessions_pb.Password, Client_pb.EmptyMessage> {
    path: "/clientInterface.Client/KeysPasswordChange";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Sessions_pb.Password>;
    requestDeserialize: grpc.deserialize<Sessions_pb.Password>;
    responseSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
}
interface IClientService_IKeysCertsGet extends grpc.MethodDefinition<Client_pb.EmptyMessage, Keys_pb.Certificate> {
    path: "/clientInterface.Client/KeysCertsGet";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Keys_pb.Certificate>;
    responseDeserialize: grpc.deserialize<Keys_pb.Certificate>;
}
interface IClientService_IKeysCertsChainGet extends grpc.MethodDefinition<Client_pb.EmptyMessage, Keys_pb.Certificate> {
    path: "/clientInterface.Client/KeysCertsChainGet";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Keys_pb.Certificate>;
    responseDeserialize: grpc.deserialize<Keys_pb.Certificate>;
}
interface IClientService_IVaultsList extends grpc.MethodDefinition<Client_pb.EmptyMessage, Vaults_pb.List> {
    path: "/clientInterface.Client/VaultsList";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Vaults_pb.List>;
    responseDeserialize: grpc.deserialize<Vaults_pb.List>;
}
interface IClientService_IVaultsCreate extends grpc.MethodDefinition<Vaults_pb.Vault, Vaults_pb.Vault> {
    path: "/clientInterface.Client/VaultsCreate";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Vaults_pb.Vault>;
    requestDeserialize: grpc.deserialize<Vaults_pb.Vault>;
    responseSerialize: grpc.serialize<Vaults_pb.Vault>;
    responseDeserialize: grpc.deserialize<Vaults_pb.Vault>;
}
interface IClientService_IVaultsRename extends grpc.MethodDefinition<Vaults_pb.Rename, Vaults_pb.Vault> {
    path: "/clientInterface.Client/VaultsRename";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Vaults_pb.Rename>;
    requestDeserialize: grpc.deserialize<Vaults_pb.Rename>;
    responseSerialize: grpc.serialize<Vaults_pb.Vault>;
    responseDeserialize: grpc.deserialize<Vaults_pb.Vault>;
}
interface IClientService_IVaultsDelete extends grpc.MethodDefinition<Vaults_pb.Vault, Client_pb.StatusMessage> {
    path: "/clientInterface.Client/VaultsDelete";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Vaults_pb.Vault>;
    requestDeserialize: grpc.deserialize<Vaults_pb.Vault>;
    responseSerialize: grpc.serialize<Client_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.StatusMessage>;
}
interface IClientService_IVaultsPull extends grpc.MethodDefinition<Vaults_pb.Pull, Client_pb.StatusMessage> {
    path: "/clientInterface.Client/VaultsPull";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Vaults_pb.Pull>;
    requestDeserialize: grpc.deserialize<Vaults_pb.Pull>;
    responseSerialize: grpc.serialize<Client_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.StatusMessage>;
}
interface IClientService_IVaultsClone extends grpc.MethodDefinition<Vaults_pb.Clone, Client_pb.StatusMessage> {
    path: "/clientInterface.Client/VaultsClone";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Vaults_pb.Clone>;
    requestDeserialize: grpc.deserialize<Vaults_pb.Clone>;
    responseSerialize: grpc.serialize<Client_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.StatusMessage>;
}
interface IClientService_IVaultsScan extends grpc.MethodDefinition<Nodes_pb.Node, Vaults_pb.List> {
    path: "/clientInterface.Client/VaultsScan";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<Nodes_pb.Node>;
    requestDeserialize: grpc.deserialize<Nodes_pb.Node>;
    responseSerialize: grpc.serialize<Vaults_pb.List>;
    responseDeserialize: grpc.deserialize<Vaults_pb.List>;
}
interface IClientService_IVaultsSecretsList extends grpc.MethodDefinition<Vaults_pb.Vault, Secrets_pb.Secret> {
    path: "/clientInterface.Client/VaultsSecretsList";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<Vaults_pb.Vault>;
    requestDeserialize: grpc.deserialize<Vaults_pb.Vault>;
    responseSerialize: grpc.serialize<Secrets_pb.Secret>;
    responseDeserialize: grpc.deserialize<Secrets_pb.Secret>;
}
interface IClientService_IVaultsSecretsMkdir extends grpc.MethodDefinition<Vaults_pb.Mkdir, Client_pb.StatusMessage> {
    path: "/clientInterface.Client/VaultsSecretsMkdir";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Vaults_pb.Mkdir>;
    requestDeserialize: grpc.deserialize<Vaults_pb.Mkdir>;
    responseSerialize: grpc.serialize<Client_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.StatusMessage>;
}
interface IClientService_IVaultsSecretsStat extends grpc.MethodDefinition<Vaults_pb.Vault, Vaults_pb.Stat> {
    path: "/clientInterface.Client/VaultsSecretsStat";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Vaults_pb.Vault>;
    requestDeserialize: grpc.deserialize<Vaults_pb.Vault>;
    responseSerialize: grpc.serialize<Vaults_pb.Stat>;
    responseDeserialize: grpc.deserialize<Vaults_pb.Stat>;
}
interface IClientService_IVaultsSecretsDelete extends grpc.MethodDefinition<Secrets_pb.Secret, Client_pb.StatusMessage> {
    path: "/clientInterface.Client/VaultsSecretsDelete";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Secrets_pb.Secret>;
    requestDeserialize: grpc.deserialize<Secrets_pb.Secret>;
    responseSerialize: grpc.serialize<Client_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.StatusMessage>;
}
interface IClientService_IVaultsSecretsEdit extends grpc.MethodDefinition<Secrets_pb.Secret, Client_pb.StatusMessage> {
    path: "/clientInterface.Client/VaultsSecretsEdit";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Secrets_pb.Secret>;
    requestDeserialize: grpc.deserialize<Secrets_pb.Secret>;
    responseSerialize: grpc.serialize<Client_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.StatusMessage>;
}
interface IClientService_IVaultsSecretsGet extends grpc.MethodDefinition<Secrets_pb.Secret, Secrets_pb.Secret> {
    path: "/clientInterface.Client/VaultsSecretsGet";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Secrets_pb.Secret>;
    requestDeserialize: grpc.deserialize<Secrets_pb.Secret>;
    responseSerialize: grpc.serialize<Secrets_pb.Secret>;
    responseDeserialize: grpc.deserialize<Secrets_pb.Secret>;
}
interface IClientService_IVaultsSecretsRename extends grpc.MethodDefinition<Secrets_pb.Rename, Client_pb.StatusMessage> {
    path: "/clientInterface.Client/VaultsSecretsRename";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Secrets_pb.Rename>;
    requestDeserialize: grpc.deserialize<Secrets_pb.Rename>;
    responseSerialize: grpc.serialize<Client_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.StatusMessage>;
}
interface IClientService_IVaultsSecretsNew extends grpc.MethodDefinition<Secrets_pb.Secret, Client_pb.StatusMessage> {
    path: "/clientInterface.Client/VaultsSecretsNew";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Secrets_pb.Secret>;
    requestDeserialize: grpc.deserialize<Secrets_pb.Secret>;
    responseSerialize: grpc.serialize<Client_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.StatusMessage>;
}
interface IClientService_IVaultsSecretsNewDir extends grpc.MethodDefinition<Secrets_pb.Directory, Client_pb.StatusMessage> {
    path: "/clientInterface.Client/VaultsSecretsNewDir";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Secrets_pb.Directory>;
    requestDeserialize: grpc.deserialize<Secrets_pb.Directory>;
    responseSerialize: grpc.serialize<Client_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.StatusMessage>;
}
interface IClientService_IVaultsPermissionsSet extends grpc.MethodDefinition<Vaults_pb.PermSet, Client_pb.StatusMessage> {
    path: "/clientInterface.Client/VaultsPermissionsSet";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Vaults_pb.PermSet>;
    requestDeserialize: grpc.deserialize<Vaults_pb.PermSet>;
    responseSerialize: grpc.serialize<Client_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.StatusMessage>;
}
interface IClientService_IVaultsPermissionsUnset extends grpc.MethodDefinition<Vaults_pb.PermUnset, Client_pb.StatusMessage> {
    path: "/clientInterface.Client/VaultsPermissionsUnset";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Vaults_pb.PermUnset>;
    requestDeserialize: grpc.deserialize<Vaults_pb.PermUnset>;
    responseSerialize: grpc.serialize<Client_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.StatusMessage>;
}
interface IClientService_IVaultsPermissions extends grpc.MethodDefinition<Vaults_pb.PermGet, Vaults_pb.Permission> {
    path: "/clientInterface.Client/VaultsPermissions";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<Vaults_pb.PermGet>;
    requestDeserialize: grpc.deserialize<Vaults_pb.PermGet>;
    responseSerialize: grpc.serialize<Vaults_pb.Permission>;
    responseDeserialize: grpc.deserialize<Vaults_pb.Permission>;
}
interface IClientService_IVaultsVersion extends grpc.MethodDefinition<Vaults_pb.Version, Vaults_pb.VersionResult> {
    path: "/clientInterface.Client/VaultsVersion";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Vaults_pb.Version>;
    requestDeserialize: grpc.deserialize<Vaults_pb.Version>;
    responseSerialize: grpc.serialize<Vaults_pb.VersionResult>;
    responseDeserialize: grpc.deserialize<Vaults_pb.VersionResult>;
}
interface IClientService_IVaultsLog extends grpc.MethodDefinition<Vaults_pb.Log, Vaults_pb.LogEntry> {
    path: "/clientInterface.Client/VaultsLog";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<Vaults_pb.Log>;
    requestDeserialize: grpc.deserialize<Vaults_pb.Log>;
    responseSerialize: grpc.serialize<Vaults_pb.LogEntry>;
    responseDeserialize: grpc.deserialize<Vaults_pb.LogEntry>;
}
interface IClientService_IIdentitiesAuthenticate extends grpc.MethodDefinition<Identities_pb.Provider, Identities_pb.Provider> {
    path: "/clientInterface.Client/IdentitiesAuthenticate";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<Identities_pb.Provider>;
    requestDeserialize: grpc.deserialize<Identities_pb.Provider>;
    responseSerialize: grpc.serialize<Identities_pb.Provider>;
    responseDeserialize: grpc.deserialize<Identities_pb.Provider>;
}
interface IClientService_IIdentitiesTokenPut extends grpc.MethodDefinition<Identities_pb.TokenSpecific, Client_pb.EmptyMessage> {
    path: "/clientInterface.Client/IdentitiesTokenPut";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Identities_pb.TokenSpecific>;
    requestDeserialize: grpc.deserialize<Identities_pb.TokenSpecific>;
    responseSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
}
interface IClientService_IIdentitiesTokenGet extends grpc.MethodDefinition<Identities_pb.Provider, Identities_pb.Token> {
    path: "/clientInterface.Client/IdentitiesTokenGet";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Identities_pb.Provider>;
    requestDeserialize: grpc.deserialize<Identities_pb.Provider>;
    responseSerialize: grpc.serialize<Identities_pb.Token>;
    responseDeserialize: grpc.deserialize<Identities_pb.Token>;
}
interface IClientService_IIdentitiesTokenDelete extends grpc.MethodDefinition<Identities_pb.Provider, Client_pb.EmptyMessage> {
    path: "/clientInterface.Client/IdentitiesTokenDelete";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Identities_pb.Provider>;
    requestDeserialize: grpc.deserialize<Identities_pb.Provider>;
    responseSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
}
interface IClientService_IIdentitiesProvidersList extends grpc.MethodDefinition<Client_pb.EmptyMessage, Identities_pb.Provider> {
    path: "/clientInterface.Client/IdentitiesProvidersList";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Identities_pb.Provider>;
    responseDeserialize: grpc.deserialize<Identities_pb.Provider>;
}
interface IClientService_IIdentitiesInfoGet extends grpc.MethodDefinition<Identities_pb.Provider, Identities_pb.Provider> {
    path: "/clientInterface.Client/IdentitiesInfoGet";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Identities_pb.Provider>;
    requestDeserialize: grpc.deserialize<Identities_pb.Provider>;
    responseSerialize: grpc.serialize<Identities_pb.Provider>;
    responseDeserialize: grpc.deserialize<Identities_pb.Provider>;
}
interface IClientService_IIdentitiesInfoGetConnected extends grpc.MethodDefinition<Identities_pb.ProviderSearch, Identities_pb.Info> {
    path: "/clientInterface.Client/IdentitiesInfoGetConnected";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<Identities_pb.ProviderSearch>;
    requestDeserialize: grpc.deserialize<Identities_pb.ProviderSearch>;
    responseSerialize: grpc.serialize<Identities_pb.Info>;
    responseDeserialize: grpc.deserialize<Identities_pb.Info>;
}
interface IClientService_IIdentitiesClaim extends grpc.MethodDefinition<Identities_pb.Provider, Client_pb.EmptyMessage> {
    path: "/clientInterface.Client/IdentitiesClaim";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Identities_pb.Provider>;
    requestDeserialize: grpc.deserialize<Identities_pb.Provider>;
    responseSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
}
interface IClientService_IGestaltsGestaltList extends grpc.MethodDefinition<Client_pb.EmptyMessage, Gestalts_pb.Gestalt> {
    path: "/clientInterface.Client/GestaltsGestaltList";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<Gestalts_pb.Gestalt>;
    responseDeserialize: grpc.deserialize<Gestalts_pb.Gestalt>;
}
interface IClientService_IGestaltsGestaltGetByNode extends grpc.MethodDefinition<Nodes_pb.Node, Gestalts_pb.Graph> {
    path: "/clientInterface.Client/GestaltsGestaltGetByNode";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Nodes_pb.Node>;
    requestDeserialize: grpc.deserialize<Nodes_pb.Node>;
    responseSerialize: grpc.serialize<Gestalts_pb.Graph>;
    responseDeserialize: grpc.deserialize<Gestalts_pb.Graph>;
}
interface IClientService_IGestaltsGestaltGetByIdentity extends grpc.MethodDefinition<Identities_pb.Provider, Gestalts_pb.Graph> {
    path: "/clientInterface.Client/GestaltsGestaltGetByIdentity";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Identities_pb.Provider>;
    requestDeserialize: grpc.deserialize<Identities_pb.Provider>;
    responseSerialize: grpc.serialize<Gestalts_pb.Graph>;
    responseDeserialize: grpc.deserialize<Gestalts_pb.Graph>;
}
interface IClientService_IGestaltsDiscoveryByNode extends grpc.MethodDefinition<Nodes_pb.Node, Client_pb.EmptyMessage> {
    path: "/clientInterface.Client/GestaltsDiscoveryByNode";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Nodes_pb.Node>;
    requestDeserialize: grpc.deserialize<Nodes_pb.Node>;
    responseSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
}
interface IClientService_IGestaltsDiscoveryByIdentity extends grpc.MethodDefinition<Identities_pb.Provider, Client_pb.EmptyMessage> {
    path: "/clientInterface.Client/GestaltsDiscoveryByIdentity";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Identities_pb.Provider>;
    requestDeserialize: grpc.deserialize<Identities_pb.Provider>;
    responseSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
}
interface IClientService_IGestaltsActionsGetByNode extends grpc.MethodDefinition<Nodes_pb.Node, Permissions_pb.Actions> {
    path: "/clientInterface.Client/GestaltsActionsGetByNode";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Nodes_pb.Node>;
    requestDeserialize: grpc.deserialize<Nodes_pb.Node>;
    responseSerialize: grpc.serialize<Permissions_pb.Actions>;
    responseDeserialize: grpc.deserialize<Permissions_pb.Actions>;
}
interface IClientService_IGestaltsActionsGetByIdentity extends grpc.MethodDefinition<Identities_pb.Provider, Permissions_pb.Actions> {
    path: "/clientInterface.Client/GestaltsActionsGetByIdentity";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Identities_pb.Provider>;
    requestDeserialize: grpc.deserialize<Identities_pb.Provider>;
    responseSerialize: grpc.serialize<Permissions_pb.Actions>;
    responseDeserialize: grpc.deserialize<Permissions_pb.Actions>;
}
interface IClientService_IGestaltsActionsSetByNode extends grpc.MethodDefinition<Permissions_pb.ActionSet, Client_pb.EmptyMessage> {
    path: "/clientInterface.Client/GestaltsActionsSetByNode";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Permissions_pb.ActionSet>;
    requestDeserialize: grpc.deserialize<Permissions_pb.ActionSet>;
    responseSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
}
interface IClientService_IGestaltsActionsSetByIdentity extends grpc.MethodDefinition<Permissions_pb.ActionSet, Client_pb.EmptyMessage> {
    path: "/clientInterface.Client/GestaltsActionsSetByIdentity";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Permissions_pb.ActionSet>;
    requestDeserialize: grpc.deserialize<Permissions_pb.ActionSet>;
    responseSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
}
interface IClientService_IGestaltsActionsUnsetByNode extends grpc.MethodDefinition<Permissions_pb.ActionSet, Client_pb.EmptyMessage> {
    path: "/clientInterface.Client/GestaltsActionsUnsetByNode";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Permissions_pb.ActionSet>;
    requestDeserialize: grpc.deserialize<Permissions_pb.ActionSet>;
    responseSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
}
interface IClientService_IGestaltsActionsUnsetByIdentity extends grpc.MethodDefinition<Permissions_pb.ActionSet, Client_pb.EmptyMessage> {
    path: "/clientInterface.Client/GestaltsActionsUnsetByIdentity";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Permissions_pb.ActionSet>;
    requestDeserialize: grpc.deserialize<Permissions_pb.ActionSet>;
    responseSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
}
interface IClientService_INotificationsSend extends grpc.MethodDefinition<Notifications_pb.Send, Client_pb.EmptyMessage> {
    path: "/clientInterface.Client/NotificationsSend";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Notifications_pb.Send>;
    requestDeserialize: grpc.deserialize<Notifications_pb.Send>;
    responseSerialize: grpc.serialize<Client_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<Client_pb.EmptyMessage>;
}
interface IClientService_INotificationsRead extends grpc.MethodDefinition<Notifications_pb.Read, Notifications_pb.List> {
    path: "/clientInterface.Client/NotificationsRead";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<Notifications_pb.Read>;
    requestDeserialize: grpc.deserialize<Notifications_pb.Read>;
    responseSerialize: grpc.serialize<Notifications_pb.List>;
    responseDeserialize: grpc.deserialize<Notifications_pb.List>;
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
    sessionUnlock: grpc.handleUnaryCall<Sessions_pb.Password, Sessions_pb.Token>;
    sessionRefresh: grpc.handleUnaryCall<Client_pb.EmptyMessage, Sessions_pb.Token>;
    sessionLockAll: grpc.handleUnaryCall<Client_pb.EmptyMessage, Client_pb.StatusMessage>;
    nodesAdd: grpc.handleUnaryCall<Nodes_pb.Address, Client_pb.EmptyMessage>;
    nodesPing: grpc.handleUnaryCall<Nodes_pb.Node, Client_pb.StatusMessage>;
    nodesClaim: grpc.handleUnaryCall<Nodes_pb.Claim, Client_pb.StatusMessage>;
    nodesFind: grpc.handleUnaryCall<Nodes_pb.Node, Nodes_pb.Address>;
    keysKeyPairRoot: grpc.handleUnaryCall<Client_pb.EmptyMessage, Keys_pb.KeyPair>;
    keysKeyPairReset: grpc.handleUnaryCall<Keys_pb.Key, Client_pb.EmptyMessage>;
    keysKeyPairRenew: grpc.handleUnaryCall<Keys_pb.Key, Client_pb.EmptyMessage>;
    keysEncrypt: grpc.handleUnaryCall<Keys_pb.Crypto, Keys_pb.Crypto>;
    keysDecrypt: grpc.handleUnaryCall<Keys_pb.Crypto, Keys_pb.Crypto>;
    keysSign: grpc.handleUnaryCall<Keys_pb.Crypto, Keys_pb.Crypto>;
    keysVerify: grpc.handleUnaryCall<Keys_pb.Crypto, Client_pb.StatusMessage>;
    keysPasswordChange: grpc.handleUnaryCall<Sessions_pb.Password, Client_pb.EmptyMessage>;
    keysCertsGet: grpc.handleUnaryCall<Client_pb.EmptyMessage, Keys_pb.Certificate>;
    keysCertsChainGet: grpc.handleServerStreamingCall<Client_pb.EmptyMessage, Keys_pb.Certificate>;
    vaultsList: grpc.handleServerStreamingCall<Client_pb.EmptyMessage, Vaults_pb.List>;
    vaultsCreate: grpc.handleUnaryCall<Vaults_pb.Vault, Vaults_pb.Vault>;
    vaultsRename: grpc.handleUnaryCall<Vaults_pb.Rename, Vaults_pb.Vault>;
    vaultsDelete: grpc.handleUnaryCall<Vaults_pb.Vault, Client_pb.StatusMessage>;
    vaultsPull: grpc.handleUnaryCall<Vaults_pb.Pull, Client_pb.StatusMessage>;
    vaultsClone: grpc.handleUnaryCall<Vaults_pb.Clone, Client_pb.StatusMessage>;
    vaultsScan: grpc.handleServerStreamingCall<Nodes_pb.Node, Vaults_pb.List>;
    vaultsSecretsList: grpc.handleServerStreamingCall<Vaults_pb.Vault, Secrets_pb.Secret>;
    vaultsSecretsMkdir: grpc.handleUnaryCall<Vaults_pb.Mkdir, Client_pb.StatusMessage>;
    vaultsSecretsStat: grpc.handleUnaryCall<Vaults_pb.Vault, Vaults_pb.Stat>;
    vaultsSecretsDelete: grpc.handleUnaryCall<Secrets_pb.Secret, Client_pb.StatusMessage>;
    vaultsSecretsEdit: grpc.handleUnaryCall<Secrets_pb.Secret, Client_pb.StatusMessage>;
    vaultsSecretsGet: grpc.handleUnaryCall<Secrets_pb.Secret, Secrets_pb.Secret>;
    vaultsSecretsRename: grpc.handleUnaryCall<Secrets_pb.Rename, Client_pb.StatusMessage>;
    vaultsSecretsNew: grpc.handleUnaryCall<Secrets_pb.Secret, Client_pb.StatusMessage>;
    vaultsSecretsNewDir: grpc.handleUnaryCall<Secrets_pb.Directory, Client_pb.StatusMessage>;
    vaultsPermissionsSet: grpc.handleUnaryCall<Vaults_pb.PermSet, Client_pb.StatusMessage>;
    vaultsPermissionsUnset: grpc.handleUnaryCall<Vaults_pb.PermUnset, Client_pb.StatusMessage>;
    vaultsPermissions: grpc.handleServerStreamingCall<Vaults_pb.PermGet, Vaults_pb.Permission>;
    vaultsVersion: grpc.handleUnaryCall<Vaults_pb.Version, Vaults_pb.VersionResult>;
    vaultsLog: grpc.handleServerStreamingCall<Vaults_pb.Log, Vaults_pb.LogEntry>;
    identitiesAuthenticate: grpc.handleServerStreamingCall<Identities_pb.Provider, Identities_pb.Provider>;
    identitiesTokenPut: grpc.handleUnaryCall<Identities_pb.TokenSpecific, Client_pb.EmptyMessage>;
    identitiesTokenGet: grpc.handleUnaryCall<Identities_pb.Provider, Identities_pb.Token>;
    identitiesTokenDelete: grpc.handleUnaryCall<Identities_pb.Provider, Client_pb.EmptyMessage>;
    identitiesProvidersList: grpc.handleUnaryCall<Client_pb.EmptyMessage, Identities_pb.Provider>;
    identitiesInfoGet: grpc.handleUnaryCall<Identities_pb.Provider, Identities_pb.Provider>;
    identitiesInfoGetConnected: grpc.handleServerStreamingCall<Identities_pb.ProviderSearch, Identities_pb.Info>;
    identitiesClaim: grpc.handleUnaryCall<Identities_pb.Provider, Client_pb.EmptyMessage>;
    gestaltsGestaltList: grpc.handleServerStreamingCall<Client_pb.EmptyMessage, Gestalts_pb.Gestalt>;
    gestaltsGestaltGetByNode: grpc.handleUnaryCall<Nodes_pb.Node, Gestalts_pb.Graph>;
    gestaltsGestaltGetByIdentity: grpc.handleUnaryCall<Identities_pb.Provider, Gestalts_pb.Graph>;
    gestaltsDiscoveryByNode: grpc.handleUnaryCall<Nodes_pb.Node, Client_pb.EmptyMessage>;
    gestaltsDiscoveryByIdentity: grpc.handleUnaryCall<Identities_pb.Provider, Client_pb.EmptyMessage>;
    gestaltsActionsGetByNode: grpc.handleUnaryCall<Nodes_pb.Node, Permissions_pb.Actions>;
    gestaltsActionsGetByIdentity: grpc.handleUnaryCall<Identities_pb.Provider, Permissions_pb.Actions>;
    gestaltsActionsSetByNode: grpc.handleUnaryCall<Permissions_pb.ActionSet, Client_pb.EmptyMessage>;
    gestaltsActionsSetByIdentity: grpc.handleUnaryCall<Permissions_pb.ActionSet, Client_pb.EmptyMessage>;
    gestaltsActionsUnsetByNode: grpc.handleUnaryCall<Permissions_pb.ActionSet, Client_pb.EmptyMessage>;
    gestaltsActionsUnsetByIdentity: grpc.handleUnaryCall<Permissions_pb.ActionSet, Client_pb.EmptyMessage>;
    notificationsSend: grpc.handleUnaryCall<Notifications_pb.Send, Client_pb.EmptyMessage>;
    notificationsRead: grpc.handleUnaryCall<Notifications_pb.Read, Notifications_pb.List>;
    notificationsClear: grpc.handleUnaryCall<Client_pb.EmptyMessage, Client_pb.EmptyMessage>;
}

export interface IClientClient {
    echo(request: Client_pb.EchoMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    echo(request: Client_pb.EchoMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    echo(request: Client_pb.EchoMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EchoMessage) => void): grpc.ClientUnaryCall;
    agentStop(request: Client_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    agentStop(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    agentStop(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    sessionUnlock(request: Sessions_pb.Password, callback: (error: grpc.ServiceError | null, response: Sessions_pb.Token) => void): grpc.ClientUnaryCall;
    sessionUnlock(request: Sessions_pb.Password, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Sessions_pb.Token) => void): grpc.ClientUnaryCall;
    sessionUnlock(request: Sessions_pb.Password, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Sessions_pb.Token) => void): grpc.ClientUnaryCall;
    sessionRefresh(request: Client_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Sessions_pb.Token) => void): grpc.ClientUnaryCall;
    sessionRefresh(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Sessions_pb.Token) => void): grpc.ClientUnaryCall;
    sessionRefresh(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Sessions_pb.Token) => void): grpc.ClientUnaryCall;
    sessionLockAll(request: Client_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    sessionLockAll(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    sessionLockAll(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    nodesAdd(request: Nodes_pb.Address, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    nodesAdd(request: Nodes_pb.Address, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    nodesAdd(request: Nodes_pb.Address, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    nodesPing(request: Nodes_pb.Node, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    nodesPing(request: Nodes_pb.Node, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    nodesPing(request: Nodes_pb.Node, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    nodesClaim(request: Nodes_pb.Claim, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    nodesClaim(request: Nodes_pb.Claim, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    nodesClaim(request: Nodes_pb.Claim, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    nodesFind(request: Nodes_pb.Node, callback: (error: grpc.ServiceError | null, response: Nodes_pb.Address) => void): grpc.ClientUnaryCall;
    nodesFind(request: Nodes_pb.Node, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Nodes_pb.Address) => void): grpc.ClientUnaryCall;
    nodesFind(request: Nodes_pb.Node, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Nodes_pb.Address) => void): grpc.ClientUnaryCall;
    keysKeyPairRoot(request: Client_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Keys_pb.KeyPair) => void): grpc.ClientUnaryCall;
    keysKeyPairRoot(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Keys_pb.KeyPair) => void): grpc.ClientUnaryCall;
    keysKeyPairRoot(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Keys_pb.KeyPair) => void): grpc.ClientUnaryCall;
    keysKeyPairReset(request: Keys_pb.Key, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    keysKeyPairReset(request: Keys_pb.Key, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    keysKeyPairReset(request: Keys_pb.Key, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    keysKeyPairRenew(request: Keys_pb.Key, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    keysKeyPairRenew(request: Keys_pb.Key, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    keysKeyPairRenew(request: Keys_pb.Key, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    keysEncrypt(request: Keys_pb.Crypto, callback: (error: grpc.ServiceError | null, response: Keys_pb.Crypto) => void): grpc.ClientUnaryCall;
    keysEncrypt(request: Keys_pb.Crypto, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Keys_pb.Crypto) => void): grpc.ClientUnaryCall;
    keysEncrypt(request: Keys_pb.Crypto, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Keys_pb.Crypto) => void): grpc.ClientUnaryCall;
    keysDecrypt(request: Keys_pb.Crypto, callback: (error: grpc.ServiceError | null, response: Keys_pb.Crypto) => void): grpc.ClientUnaryCall;
    keysDecrypt(request: Keys_pb.Crypto, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Keys_pb.Crypto) => void): grpc.ClientUnaryCall;
    keysDecrypt(request: Keys_pb.Crypto, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Keys_pb.Crypto) => void): grpc.ClientUnaryCall;
    keysSign(request: Keys_pb.Crypto, callback: (error: grpc.ServiceError | null, response: Keys_pb.Crypto) => void): grpc.ClientUnaryCall;
    keysSign(request: Keys_pb.Crypto, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Keys_pb.Crypto) => void): grpc.ClientUnaryCall;
    keysSign(request: Keys_pb.Crypto, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Keys_pb.Crypto) => void): grpc.ClientUnaryCall;
    keysVerify(request: Keys_pb.Crypto, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    keysVerify(request: Keys_pb.Crypto, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    keysVerify(request: Keys_pb.Crypto, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    keysPasswordChange(request: Sessions_pb.Password, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    keysPasswordChange(request: Sessions_pb.Password, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    keysPasswordChange(request: Sessions_pb.Password, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    keysCertsGet(request: Client_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Keys_pb.Certificate) => void): grpc.ClientUnaryCall;
    keysCertsGet(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Keys_pb.Certificate) => void): grpc.ClientUnaryCall;
    keysCertsGet(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Keys_pb.Certificate) => void): grpc.ClientUnaryCall;
    keysCertsChainGet(request: Client_pb.EmptyMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Keys_pb.Certificate>;
    keysCertsChainGet(request: Client_pb.EmptyMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Keys_pb.Certificate>;
    vaultsList(request: Client_pb.EmptyMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Vaults_pb.List>;
    vaultsList(request: Client_pb.EmptyMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Vaults_pb.List>;
    vaultsCreate(request: Vaults_pb.Vault, callback: (error: grpc.ServiceError | null, response: Vaults_pb.Vault) => void): grpc.ClientUnaryCall;
    vaultsCreate(request: Vaults_pb.Vault, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Vaults_pb.Vault) => void): grpc.ClientUnaryCall;
    vaultsCreate(request: Vaults_pb.Vault, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Vaults_pb.Vault) => void): grpc.ClientUnaryCall;
    vaultsRename(request: Vaults_pb.Rename, callback: (error: grpc.ServiceError | null, response: Vaults_pb.Vault) => void): grpc.ClientUnaryCall;
    vaultsRename(request: Vaults_pb.Rename, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Vaults_pb.Vault) => void): grpc.ClientUnaryCall;
    vaultsRename(request: Vaults_pb.Rename, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Vaults_pb.Vault) => void): grpc.ClientUnaryCall;
    vaultsDelete(request: Vaults_pb.Vault, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsDelete(request: Vaults_pb.Vault, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsDelete(request: Vaults_pb.Vault, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsPull(request: Vaults_pb.Pull, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsPull(request: Vaults_pb.Pull, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsPull(request: Vaults_pb.Pull, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsClone(request: Vaults_pb.Clone, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsClone(request: Vaults_pb.Clone, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsClone(request: Vaults_pb.Clone, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsScan(request: Nodes_pb.Node, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Vaults_pb.List>;
    vaultsScan(request: Nodes_pb.Node, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Vaults_pb.List>;
    vaultsSecretsList(request: Vaults_pb.Vault, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Secrets_pb.Secret>;
    vaultsSecretsList(request: Vaults_pb.Vault, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Secrets_pb.Secret>;
    vaultsSecretsMkdir(request: Vaults_pb.Mkdir, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsMkdir(request: Vaults_pb.Mkdir, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsMkdir(request: Vaults_pb.Mkdir, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsStat(request: Vaults_pb.Vault, callback: (error: grpc.ServiceError | null, response: Vaults_pb.Stat) => void): grpc.ClientUnaryCall;
    vaultsSecretsStat(request: Vaults_pb.Vault, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Vaults_pb.Stat) => void): grpc.ClientUnaryCall;
    vaultsSecretsStat(request: Vaults_pb.Vault, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Vaults_pb.Stat) => void): grpc.ClientUnaryCall;
    vaultsSecretsDelete(request: Secrets_pb.Secret, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsDelete(request: Secrets_pb.Secret, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsDelete(request: Secrets_pb.Secret, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsEdit(request: Secrets_pb.Secret, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsEdit(request: Secrets_pb.Secret, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsEdit(request: Secrets_pb.Secret, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsGet(request: Secrets_pb.Secret, callback: (error: grpc.ServiceError | null, response: Secrets_pb.Secret) => void): grpc.ClientUnaryCall;
    vaultsSecretsGet(request: Secrets_pb.Secret, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Secrets_pb.Secret) => void): grpc.ClientUnaryCall;
    vaultsSecretsGet(request: Secrets_pb.Secret, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Secrets_pb.Secret) => void): grpc.ClientUnaryCall;
    vaultsSecretsRename(request: Secrets_pb.Rename, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsRename(request: Secrets_pb.Rename, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsRename(request: Secrets_pb.Rename, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsNew(request: Secrets_pb.Secret, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsNew(request: Secrets_pb.Secret, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsNew(request: Secrets_pb.Secret, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsNewDir(request: Secrets_pb.Directory, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsNewDir(request: Secrets_pb.Directory, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsNewDir(request: Secrets_pb.Directory, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsPermissionsSet(request: Vaults_pb.PermSet, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsPermissionsSet(request: Vaults_pb.PermSet, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsPermissionsSet(request: Vaults_pb.PermSet, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsPermissionsUnset(request: Vaults_pb.PermUnset, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsPermissionsUnset(request: Vaults_pb.PermUnset, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsPermissionsUnset(request: Vaults_pb.PermUnset, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsPermissions(request: Vaults_pb.PermGet, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Vaults_pb.Permission>;
    vaultsPermissions(request: Vaults_pb.PermGet, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Vaults_pb.Permission>;
    vaultsVersion(request: Vaults_pb.Version, callback: (error: grpc.ServiceError | null, response: Vaults_pb.VersionResult) => void): grpc.ClientUnaryCall;
    vaultsVersion(request: Vaults_pb.Version, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Vaults_pb.VersionResult) => void): grpc.ClientUnaryCall;
    vaultsVersion(request: Vaults_pb.Version, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Vaults_pb.VersionResult) => void): grpc.ClientUnaryCall;
    vaultsLog(request: Vaults_pb.Log, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Vaults_pb.LogEntry>;
    vaultsLog(request: Vaults_pb.Log, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Vaults_pb.LogEntry>;
    identitiesAuthenticate(request: Identities_pb.Provider, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Identities_pb.Provider>;
    identitiesAuthenticate(request: Identities_pb.Provider, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Identities_pb.Provider>;
    identitiesTokenPut(request: Identities_pb.TokenSpecific, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    identitiesTokenPut(request: Identities_pb.TokenSpecific, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    identitiesTokenPut(request: Identities_pb.TokenSpecific, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    identitiesTokenGet(request: Identities_pb.Provider, callback: (error: grpc.ServiceError | null, response: Identities_pb.Token) => void): grpc.ClientUnaryCall;
    identitiesTokenGet(request: Identities_pb.Provider, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Identities_pb.Token) => void): grpc.ClientUnaryCall;
    identitiesTokenGet(request: Identities_pb.Provider, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Identities_pb.Token) => void): grpc.ClientUnaryCall;
    identitiesTokenDelete(request: Identities_pb.Provider, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    identitiesTokenDelete(request: Identities_pb.Provider, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    identitiesTokenDelete(request: Identities_pb.Provider, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    identitiesProvidersList(request: Client_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Identities_pb.Provider) => void): grpc.ClientUnaryCall;
    identitiesProvidersList(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Identities_pb.Provider) => void): grpc.ClientUnaryCall;
    identitiesProvidersList(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Identities_pb.Provider) => void): grpc.ClientUnaryCall;
    identitiesInfoGet(request: Identities_pb.Provider, callback: (error: grpc.ServiceError | null, response: Identities_pb.Provider) => void): grpc.ClientUnaryCall;
    identitiesInfoGet(request: Identities_pb.Provider, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Identities_pb.Provider) => void): grpc.ClientUnaryCall;
    identitiesInfoGet(request: Identities_pb.Provider, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Identities_pb.Provider) => void): grpc.ClientUnaryCall;
    identitiesInfoGetConnected(request: Identities_pb.ProviderSearch, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Identities_pb.Info>;
    identitiesInfoGetConnected(request: Identities_pb.ProviderSearch, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Identities_pb.Info>;
    identitiesClaim(request: Identities_pb.Provider, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    identitiesClaim(request: Identities_pb.Provider, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    identitiesClaim(request: Identities_pb.Provider, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsGestaltList(request: Client_pb.EmptyMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Gestalts_pb.Gestalt>;
    gestaltsGestaltList(request: Client_pb.EmptyMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Gestalts_pb.Gestalt>;
    gestaltsGestaltGetByNode(request: Nodes_pb.Node, callback: (error: grpc.ServiceError | null, response: Gestalts_pb.Graph) => void): grpc.ClientUnaryCall;
    gestaltsGestaltGetByNode(request: Nodes_pb.Node, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Gestalts_pb.Graph) => void): grpc.ClientUnaryCall;
    gestaltsGestaltGetByNode(request: Nodes_pb.Node, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Gestalts_pb.Graph) => void): grpc.ClientUnaryCall;
    gestaltsGestaltGetByIdentity(request: Identities_pb.Provider, callback: (error: grpc.ServiceError | null, response: Gestalts_pb.Graph) => void): grpc.ClientUnaryCall;
    gestaltsGestaltGetByIdentity(request: Identities_pb.Provider, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Gestalts_pb.Graph) => void): grpc.ClientUnaryCall;
    gestaltsGestaltGetByIdentity(request: Identities_pb.Provider, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Gestalts_pb.Graph) => void): grpc.ClientUnaryCall;
    gestaltsDiscoveryByNode(request: Nodes_pb.Node, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsDiscoveryByNode(request: Nodes_pb.Node, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsDiscoveryByNode(request: Nodes_pb.Node, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsDiscoveryByIdentity(request: Identities_pb.Provider, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsDiscoveryByIdentity(request: Identities_pb.Provider, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsDiscoveryByIdentity(request: Identities_pb.Provider, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsGetByNode(request: Nodes_pb.Node, callback: (error: grpc.ServiceError | null, response: Permissions_pb.Actions) => void): grpc.ClientUnaryCall;
    gestaltsActionsGetByNode(request: Nodes_pb.Node, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Permissions_pb.Actions) => void): grpc.ClientUnaryCall;
    gestaltsActionsGetByNode(request: Nodes_pb.Node, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Permissions_pb.Actions) => void): grpc.ClientUnaryCall;
    gestaltsActionsGetByIdentity(request: Identities_pb.Provider, callback: (error: grpc.ServiceError | null, response: Permissions_pb.Actions) => void): grpc.ClientUnaryCall;
    gestaltsActionsGetByIdentity(request: Identities_pb.Provider, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Permissions_pb.Actions) => void): grpc.ClientUnaryCall;
    gestaltsActionsGetByIdentity(request: Identities_pb.Provider, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Permissions_pb.Actions) => void): grpc.ClientUnaryCall;
    gestaltsActionsSetByNode(request: Permissions_pb.ActionSet, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsSetByNode(request: Permissions_pb.ActionSet, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsSetByNode(request: Permissions_pb.ActionSet, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsSetByIdentity(request: Permissions_pb.ActionSet, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsSetByIdentity(request: Permissions_pb.ActionSet, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsSetByIdentity(request: Permissions_pb.ActionSet, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsUnsetByNode(request: Permissions_pb.ActionSet, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsUnsetByNode(request: Permissions_pb.ActionSet, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsUnsetByNode(request: Permissions_pb.ActionSet, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsUnsetByIdentity(request: Permissions_pb.ActionSet, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsUnsetByIdentity(request: Permissions_pb.ActionSet, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsUnsetByIdentity(request: Permissions_pb.ActionSet, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    notificationsSend(request: Notifications_pb.Send, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    notificationsSend(request: Notifications_pb.Send, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    notificationsSend(request: Notifications_pb.Send, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    notificationsRead(request: Notifications_pb.Read, callback: (error: grpc.ServiceError | null, response: Notifications_pb.List) => void): grpc.ClientUnaryCall;
    notificationsRead(request: Notifications_pb.Read, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Notifications_pb.List) => void): grpc.ClientUnaryCall;
    notificationsRead(request: Notifications_pb.Read, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Notifications_pb.List) => void): grpc.ClientUnaryCall;
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
    public sessionUnlock(request: Sessions_pb.Password, callback: (error: grpc.ServiceError | null, response: Sessions_pb.Token) => void): grpc.ClientUnaryCall;
    public sessionUnlock(request: Sessions_pb.Password, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Sessions_pb.Token) => void): grpc.ClientUnaryCall;
    public sessionUnlock(request: Sessions_pb.Password, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Sessions_pb.Token) => void): grpc.ClientUnaryCall;
    public sessionRefresh(request: Client_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Sessions_pb.Token) => void): grpc.ClientUnaryCall;
    public sessionRefresh(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Sessions_pb.Token) => void): grpc.ClientUnaryCall;
    public sessionRefresh(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Sessions_pb.Token) => void): grpc.ClientUnaryCall;
    public sessionLockAll(request: Client_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public sessionLockAll(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public sessionLockAll(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public nodesAdd(request: Nodes_pb.Address, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public nodesAdd(request: Nodes_pb.Address, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public nodesAdd(request: Nodes_pb.Address, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public nodesPing(request: Nodes_pb.Node, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public nodesPing(request: Nodes_pb.Node, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public nodesPing(request: Nodes_pb.Node, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public nodesClaim(request: Nodes_pb.Claim, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public nodesClaim(request: Nodes_pb.Claim, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public nodesClaim(request: Nodes_pb.Claim, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public nodesFind(request: Nodes_pb.Node, callback: (error: grpc.ServiceError | null, response: Nodes_pb.Address) => void): grpc.ClientUnaryCall;
    public nodesFind(request: Nodes_pb.Node, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Nodes_pb.Address) => void): grpc.ClientUnaryCall;
    public nodesFind(request: Nodes_pb.Node, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Nodes_pb.Address) => void): grpc.ClientUnaryCall;
    public keysKeyPairRoot(request: Client_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Keys_pb.KeyPair) => void): grpc.ClientUnaryCall;
    public keysKeyPairRoot(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Keys_pb.KeyPair) => void): grpc.ClientUnaryCall;
    public keysKeyPairRoot(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Keys_pb.KeyPair) => void): grpc.ClientUnaryCall;
    public keysKeyPairReset(request: Keys_pb.Key, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public keysKeyPairReset(request: Keys_pb.Key, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public keysKeyPairReset(request: Keys_pb.Key, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public keysKeyPairRenew(request: Keys_pb.Key, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public keysKeyPairRenew(request: Keys_pb.Key, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public keysKeyPairRenew(request: Keys_pb.Key, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public keysEncrypt(request: Keys_pb.Crypto, callback: (error: grpc.ServiceError | null, response: Keys_pb.Crypto) => void): grpc.ClientUnaryCall;
    public keysEncrypt(request: Keys_pb.Crypto, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Keys_pb.Crypto) => void): grpc.ClientUnaryCall;
    public keysEncrypt(request: Keys_pb.Crypto, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Keys_pb.Crypto) => void): grpc.ClientUnaryCall;
    public keysDecrypt(request: Keys_pb.Crypto, callback: (error: grpc.ServiceError | null, response: Keys_pb.Crypto) => void): grpc.ClientUnaryCall;
    public keysDecrypt(request: Keys_pb.Crypto, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Keys_pb.Crypto) => void): grpc.ClientUnaryCall;
    public keysDecrypt(request: Keys_pb.Crypto, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Keys_pb.Crypto) => void): grpc.ClientUnaryCall;
    public keysSign(request: Keys_pb.Crypto, callback: (error: grpc.ServiceError | null, response: Keys_pb.Crypto) => void): grpc.ClientUnaryCall;
    public keysSign(request: Keys_pb.Crypto, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Keys_pb.Crypto) => void): grpc.ClientUnaryCall;
    public keysSign(request: Keys_pb.Crypto, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Keys_pb.Crypto) => void): grpc.ClientUnaryCall;
    public keysVerify(request: Keys_pb.Crypto, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public keysVerify(request: Keys_pb.Crypto, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public keysVerify(request: Keys_pb.Crypto, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public keysPasswordChange(request: Sessions_pb.Password, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public keysPasswordChange(request: Sessions_pb.Password, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public keysPasswordChange(request: Sessions_pb.Password, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public keysCertsGet(request: Client_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Keys_pb.Certificate) => void): grpc.ClientUnaryCall;
    public keysCertsGet(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Keys_pb.Certificate) => void): grpc.ClientUnaryCall;
    public keysCertsGet(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Keys_pb.Certificate) => void): grpc.ClientUnaryCall;
    public keysCertsChainGet(request: Client_pb.EmptyMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Keys_pb.Certificate>;
    public keysCertsChainGet(request: Client_pb.EmptyMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Keys_pb.Certificate>;
    public vaultsList(request: Client_pb.EmptyMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Vaults_pb.List>;
    public vaultsList(request: Client_pb.EmptyMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Vaults_pb.List>;
    public vaultsCreate(request: Vaults_pb.Vault, callback: (error: grpc.ServiceError | null, response: Vaults_pb.Vault) => void): grpc.ClientUnaryCall;
    public vaultsCreate(request: Vaults_pb.Vault, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Vaults_pb.Vault) => void): grpc.ClientUnaryCall;
    public vaultsCreate(request: Vaults_pb.Vault, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Vaults_pb.Vault) => void): grpc.ClientUnaryCall;
    public vaultsRename(request: Vaults_pb.Rename, callback: (error: grpc.ServiceError | null, response: Vaults_pb.Vault) => void): grpc.ClientUnaryCall;
    public vaultsRename(request: Vaults_pb.Rename, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Vaults_pb.Vault) => void): grpc.ClientUnaryCall;
    public vaultsRename(request: Vaults_pb.Rename, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Vaults_pb.Vault) => void): grpc.ClientUnaryCall;
    public vaultsDelete(request: Vaults_pb.Vault, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsDelete(request: Vaults_pb.Vault, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsDelete(request: Vaults_pb.Vault, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsPull(request: Vaults_pb.Pull, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsPull(request: Vaults_pb.Pull, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsPull(request: Vaults_pb.Pull, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsClone(request: Vaults_pb.Clone, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsClone(request: Vaults_pb.Clone, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsClone(request: Vaults_pb.Clone, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsScan(request: Nodes_pb.Node, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Vaults_pb.List>;
    public vaultsScan(request: Nodes_pb.Node, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Vaults_pb.List>;
    public vaultsSecretsList(request: Vaults_pb.Vault, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Secrets_pb.Secret>;
    public vaultsSecretsList(request: Vaults_pb.Vault, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Secrets_pb.Secret>;
    public vaultsSecretsMkdir(request: Vaults_pb.Mkdir, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsMkdir(request: Vaults_pb.Mkdir, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsMkdir(request: Vaults_pb.Mkdir, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsStat(request: Vaults_pb.Vault, callback: (error: grpc.ServiceError | null, response: Vaults_pb.Stat) => void): grpc.ClientUnaryCall;
    public vaultsSecretsStat(request: Vaults_pb.Vault, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Vaults_pb.Stat) => void): grpc.ClientUnaryCall;
    public vaultsSecretsStat(request: Vaults_pb.Vault, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Vaults_pb.Stat) => void): grpc.ClientUnaryCall;
    public vaultsSecretsDelete(request: Secrets_pb.Secret, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsDelete(request: Secrets_pb.Secret, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsDelete(request: Secrets_pb.Secret, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsEdit(request: Secrets_pb.Secret, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsEdit(request: Secrets_pb.Secret, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsEdit(request: Secrets_pb.Secret, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsGet(request: Secrets_pb.Secret, callback: (error: grpc.ServiceError | null, response: Secrets_pb.Secret) => void): grpc.ClientUnaryCall;
    public vaultsSecretsGet(request: Secrets_pb.Secret, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Secrets_pb.Secret) => void): grpc.ClientUnaryCall;
    public vaultsSecretsGet(request: Secrets_pb.Secret, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Secrets_pb.Secret) => void): grpc.ClientUnaryCall;
    public vaultsSecretsRename(request: Secrets_pb.Rename, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsRename(request: Secrets_pb.Rename, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsRename(request: Secrets_pb.Rename, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsNew(request: Secrets_pb.Secret, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsNew(request: Secrets_pb.Secret, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsNew(request: Secrets_pb.Secret, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsNewDir(request: Secrets_pb.Directory, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsNewDir(request: Secrets_pb.Directory, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsNewDir(request: Secrets_pb.Directory, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsPermissionsSet(request: Vaults_pb.PermSet, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsPermissionsSet(request: Vaults_pb.PermSet, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsPermissionsSet(request: Vaults_pb.PermSet, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsPermissionsUnset(request: Vaults_pb.PermUnset, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsPermissionsUnset(request: Vaults_pb.PermUnset, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsPermissionsUnset(request: Vaults_pb.PermUnset, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsPermissions(request: Vaults_pb.PermGet, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Vaults_pb.Permission>;
    public vaultsPermissions(request: Vaults_pb.PermGet, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Vaults_pb.Permission>;
    public vaultsVersion(request: Vaults_pb.Version, callback: (error: grpc.ServiceError | null, response: Vaults_pb.VersionResult) => void): grpc.ClientUnaryCall;
    public vaultsVersion(request: Vaults_pb.Version, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Vaults_pb.VersionResult) => void): grpc.ClientUnaryCall;
    public vaultsVersion(request: Vaults_pb.Version, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Vaults_pb.VersionResult) => void): grpc.ClientUnaryCall;
    public vaultsLog(request: Vaults_pb.Log, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Vaults_pb.LogEntry>;
    public vaultsLog(request: Vaults_pb.Log, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Vaults_pb.LogEntry>;
    public identitiesAuthenticate(request: Identities_pb.Provider, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Identities_pb.Provider>;
    public identitiesAuthenticate(request: Identities_pb.Provider, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Identities_pb.Provider>;
    public identitiesTokenPut(request: Identities_pb.TokenSpecific, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public identitiesTokenPut(request: Identities_pb.TokenSpecific, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public identitiesTokenPut(request: Identities_pb.TokenSpecific, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public identitiesTokenGet(request: Identities_pb.Provider, callback: (error: grpc.ServiceError | null, response: Identities_pb.Token) => void): grpc.ClientUnaryCall;
    public identitiesTokenGet(request: Identities_pb.Provider, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Identities_pb.Token) => void): grpc.ClientUnaryCall;
    public identitiesTokenGet(request: Identities_pb.Provider, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Identities_pb.Token) => void): grpc.ClientUnaryCall;
    public identitiesTokenDelete(request: Identities_pb.Provider, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public identitiesTokenDelete(request: Identities_pb.Provider, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public identitiesTokenDelete(request: Identities_pb.Provider, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public identitiesProvidersList(request: Client_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Identities_pb.Provider) => void): grpc.ClientUnaryCall;
    public identitiesProvidersList(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Identities_pb.Provider) => void): grpc.ClientUnaryCall;
    public identitiesProvidersList(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Identities_pb.Provider) => void): grpc.ClientUnaryCall;
    public identitiesInfoGet(request: Identities_pb.Provider, callback: (error: grpc.ServiceError | null, response: Identities_pb.Provider) => void): grpc.ClientUnaryCall;
    public identitiesInfoGet(request: Identities_pb.Provider, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Identities_pb.Provider) => void): grpc.ClientUnaryCall;
    public identitiesInfoGet(request: Identities_pb.Provider, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Identities_pb.Provider) => void): grpc.ClientUnaryCall;
    public identitiesInfoGetConnected(request: Identities_pb.ProviderSearch, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Identities_pb.Info>;
    public identitiesInfoGetConnected(request: Identities_pb.ProviderSearch, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Identities_pb.Info>;
    public identitiesClaim(request: Identities_pb.Provider, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public identitiesClaim(request: Identities_pb.Provider, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public identitiesClaim(request: Identities_pb.Provider, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsGestaltList(request: Client_pb.EmptyMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Gestalts_pb.Gestalt>;
    public gestaltsGestaltList(request: Client_pb.EmptyMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<Gestalts_pb.Gestalt>;
    public gestaltsGestaltGetByNode(request: Nodes_pb.Node, callback: (error: grpc.ServiceError | null, response: Gestalts_pb.Graph) => void): grpc.ClientUnaryCall;
    public gestaltsGestaltGetByNode(request: Nodes_pb.Node, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Gestalts_pb.Graph) => void): grpc.ClientUnaryCall;
    public gestaltsGestaltGetByNode(request: Nodes_pb.Node, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Gestalts_pb.Graph) => void): grpc.ClientUnaryCall;
    public gestaltsGestaltGetByIdentity(request: Identities_pb.Provider, callback: (error: grpc.ServiceError | null, response: Gestalts_pb.Graph) => void): grpc.ClientUnaryCall;
    public gestaltsGestaltGetByIdentity(request: Identities_pb.Provider, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Gestalts_pb.Graph) => void): grpc.ClientUnaryCall;
    public gestaltsGestaltGetByIdentity(request: Identities_pb.Provider, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Gestalts_pb.Graph) => void): grpc.ClientUnaryCall;
    public gestaltsDiscoveryByNode(request: Nodes_pb.Node, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsDiscoveryByNode(request: Nodes_pb.Node, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsDiscoveryByNode(request: Nodes_pb.Node, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsDiscoveryByIdentity(request: Identities_pb.Provider, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsDiscoveryByIdentity(request: Identities_pb.Provider, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsDiscoveryByIdentity(request: Identities_pb.Provider, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsGetByNode(request: Nodes_pb.Node, callback: (error: grpc.ServiceError | null, response: Permissions_pb.Actions) => void): grpc.ClientUnaryCall;
    public gestaltsActionsGetByNode(request: Nodes_pb.Node, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Permissions_pb.Actions) => void): grpc.ClientUnaryCall;
    public gestaltsActionsGetByNode(request: Nodes_pb.Node, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Permissions_pb.Actions) => void): grpc.ClientUnaryCall;
    public gestaltsActionsGetByIdentity(request: Identities_pb.Provider, callback: (error: grpc.ServiceError | null, response: Permissions_pb.Actions) => void): grpc.ClientUnaryCall;
    public gestaltsActionsGetByIdentity(request: Identities_pb.Provider, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Permissions_pb.Actions) => void): grpc.ClientUnaryCall;
    public gestaltsActionsGetByIdentity(request: Identities_pb.Provider, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Permissions_pb.Actions) => void): grpc.ClientUnaryCall;
    public gestaltsActionsSetByNode(request: Permissions_pb.ActionSet, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsSetByNode(request: Permissions_pb.ActionSet, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsSetByNode(request: Permissions_pb.ActionSet, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsSetByIdentity(request: Permissions_pb.ActionSet, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsSetByIdentity(request: Permissions_pb.ActionSet, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsSetByIdentity(request: Permissions_pb.ActionSet, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsUnsetByNode(request: Permissions_pb.ActionSet, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsUnsetByNode(request: Permissions_pb.ActionSet, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsUnsetByNode(request: Permissions_pb.ActionSet, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsUnsetByIdentity(request: Permissions_pb.ActionSet, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsUnsetByIdentity(request: Permissions_pb.ActionSet, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsUnsetByIdentity(request: Permissions_pb.ActionSet, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public notificationsSend(request: Notifications_pb.Send, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public notificationsSend(request: Notifications_pb.Send, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public notificationsSend(request: Notifications_pb.Send, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public notificationsRead(request: Notifications_pb.Read, callback: (error: grpc.ServiceError | null, response: Notifications_pb.List) => void): grpc.ClientUnaryCall;
    public notificationsRead(request: Notifications_pb.Read, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Notifications_pb.List) => void): grpc.ClientUnaryCall;
    public notificationsRead(request: Notifications_pb.Read, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Notifications_pb.List) => void): grpc.ClientUnaryCall;
    public notificationsClear(request: Client_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public notificationsClear(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public notificationsClear(request: Client_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: Client_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
}
