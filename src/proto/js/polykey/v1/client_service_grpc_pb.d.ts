// package: polykey.v1
// file: polykey/v1/client_service.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as polykey_v1_client_service_pb from "../../polykey/v1/client_service_pb";
import * as polykey_v1_agent_agent_pb from "../../polykey/v1/agent/agent_pb";
import * as polykey_v1_gestalts_gestalts_pb from "../../polykey/v1/gestalts/gestalts_pb";
import * as polykey_v1_identities_identities_pb from "../../polykey/v1/identities/identities_pb";
import * as polykey_v1_keys_keys_pb from "../../polykey/v1/keys/keys_pb";
import * as polykey_v1_nodes_nodes_pb from "../../polykey/v1/nodes/nodes_pb";
import * as polykey_v1_notifications_notifications_pb from "../../polykey/v1/notifications/notifications_pb";
import * as polykey_v1_permissions_permissions_pb from "../../polykey/v1/permissions/permissions_pb";
import * as polykey_v1_secrets_secrets_pb from "../../polykey/v1/secrets/secrets_pb";
import * as polykey_v1_sessions_sessions_pb from "../../polykey/v1/sessions/sessions_pb";
import * as polykey_v1_vaults_vaults_pb from "../../polykey/v1/vaults/vaults_pb";
import * as polykey_v1_utils_utils_pb from "../../polykey/v1/utils/utils_pb";

interface IClientServiceService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    agentLockAll: IClientServiceService_IAgentLockAll;
    agentStatus: IClientServiceService_IAgentStatus;
    agentStop: IClientServiceService_IAgentStop;
    agentUnlock: IClientServiceService_IAgentUnlock;
    nodesAdd: IClientServiceService_INodesAdd;
    nodesPing: IClientServiceService_INodesPing;
    nodesClaim: IClientServiceService_INodesClaim;
    nodesFind: IClientServiceService_INodesFind;
    nodesGetAll: IClientServiceService_INodesGetAll;
    keysKeyPairRoot: IClientServiceService_IKeysKeyPairRoot;
    keysKeyPairReset: IClientServiceService_IKeysKeyPairReset;
    keysKeyPairRenew: IClientServiceService_IKeysKeyPairRenew;
    keysEncrypt: IClientServiceService_IKeysEncrypt;
    keysDecrypt: IClientServiceService_IKeysDecrypt;
    keysSign: IClientServiceService_IKeysSign;
    keysVerify: IClientServiceService_IKeysVerify;
    keysPasswordChange: IClientServiceService_IKeysPasswordChange;
    keysCertsGet: IClientServiceService_IKeysCertsGet;
    keysCertsChainGet: IClientServiceService_IKeysCertsChainGet;
    vaultsList: IClientServiceService_IVaultsList;
    vaultsCreate: IClientServiceService_IVaultsCreate;
    vaultsRename: IClientServiceService_IVaultsRename;
    vaultsDelete: IClientServiceService_IVaultsDelete;
    vaultsPull: IClientServiceService_IVaultsPull;
    vaultsClone: IClientServiceService_IVaultsClone;
    vaultsSecretsList: IClientServiceService_IVaultsSecretsList;
    vaultsSecretsMkdir: IClientServiceService_IVaultsSecretsMkdir;
    vaultsSecretsDelete: IClientServiceService_IVaultsSecretsDelete;
    vaultsSecretsEdit: IClientServiceService_IVaultsSecretsEdit;
    vaultsSecretsGet: IClientServiceService_IVaultsSecretsGet;
    vaultsSecretsRename: IClientServiceService_IVaultsSecretsRename;
    vaultsSecretsNew: IClientServiceService_IVaultsSecretsNew;
    vaultsSecretsNewDir: IClientServiceService_IVaultsSecretsNewDir;
    vaultsSecretsStat: IClientServiceService_IvaultsSecretsStat;
    vaultsPermissionGet: IClientServiceService_IVaultsPermissionGet;
    vaultsPermissionSet: IClientServiceService_IVaultsPermissionSet;
    vaultsPermissionUnset: IClientServiceService_IVaultsPermissionUnset;
    vaultsVersion: IClientServiceService_IVaultsVersion;
    vaultsLog: IClientServiceService_IVaultsLog;
    vaultsScan: IClientServiceService_IVaultsScan;
    identitiesAuthenticate: IClientServiceService_IIdentitiesAuthenticate;
    identitiesAuthenticatedGet: IClientServiceService_IIdentitiesAuthenticatedGet;
    identitiesTokenPut: IClientServiceService_IIdentitiesTokenPut;
    identitiesTokenGet: IClientServiceService_IIdentitiesTokenGet;
    identitiesTokenDelete: IClientServiceService_IIdentitiesTokenDelete;
    identitiesProvidersList: IClientServiceService_IIdentitiesProvidersList;
    identitiesInfoGet: IClientServiceService_IIdentitiesInfoGet;
    identitiesInfoConnectedGet: IClientServiceService_IIdentitiesInfoConnectedGet;
    identitiesClaim: IClientServiceService_IIdentitiesClaim;
    gestaltsGestaltList: IClientServiceService_IGestaltsGestaltList;
    gestaltsGestaltGetByNode: IClientServiceService_IGestaltsGestaltGetByNode;
    gestaltsGestaltGetByIdentity: IClientServiceService_IGestaltsGestaltGetByIdentity;
    gestaltsGestaltTrustByNode: IClientServiceService_IGestaltsGestaltTrustByNode;
    gestaltsGestaltTrustByIdentity: IClientServiceService_IGestaltsGestaltTrustByIdentity;
    gestaltsDiscoveryByNode: IClientServiceService_IGestaltsDiscoveryByNode;
    gestaltsDiscoveryByIdentity: IClientServiceService_IGestaltsDiscoveryByIdentity;
    gestaltsActionsGetByNode: IClientServiceService_IGestaltsActionsGetByNode;
    gestaltsActionsGetByIdentity: IClientServiceService_IGestaltsActionsGetByIdentity;
    gestaltsActionsSetByNode: IClientServiceService_IGestaltsActionsSetByNode;
    gestaltsActionsSetByIdentity: IClientServiceService_IGestaltsActionsSetByIdentity;
    gestaltsActionsUnsetByNode: IClientServiceService_IGestaltsActionsUnsetByNode;
    gestaltsActionsUnsetByIdentity: IClientServiceService_IGestaltsActionsUnsetByIdentity;
    notificationsSend: IClientServiceService_INotificationsSend;
    notificationsRead: IClientServiceService_INotificationsRead;
    notificationsClear: IClientServiceService_INotificationsClear;
}

interface IClientServiceService_IAgentLockAll extends grpc.MethodDefinition<polykey_v1_utils_utils_pb.EmptyMessage, polykey_v1_utils_utils_pb.EmptyMessage> {
    path: "/polykey.v1.ClientService/AgentLockAll";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EmptyMessage>;
}
interface IClientServiceService_IAgentStatus extends grpc.MethodDefinition<polykey_v1_utils_utils_pb.EmptyMessage, polykey_v1_agent_agent_pb.InfoMessage> {
    path: "/polykey.v1.ClientService/AgentStatus";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<polykey_v1_agent_agent_pb.InfoMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_agent_agent_pb.InfoMessage>;
}
interface IClientServiceService_IAgentStop extends grpc.MethodDefinition<polykey_v1_utils_utils_pb.EmptyMessage, polykey_v1_utils_utils_pb.EmptyMessage> {
    path: "/polykey.v1.ClientService/AgentStop";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EmptyMessage>;
}
interface IClientServiceService_IAgentUnlock extends grpc.MethodDefinition<polykey_v1_utils_utils_pb.EmptyMessage, polykey_v1_utils_utils_pb.EmptyMessage> {
    path: "/polykey.v1.ClientService/AgentUnlock";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EmptyMessage>;
}
interface IClientServiceService_INodesAdd extends grpc.MethodDefinition<polykey_v1_nodes_nodes_pb.NodeAdd, polykey_v1_utils_utils_pb.EmptyMessage> {
    path: "/polykey.v1.ClientService/NodesAdd";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_nodes_nodes_pb.NodeAdd>;
    requestDeserialize: grpc.deserialize<polykey_v1_nodes_nodes_pb.NodeAdd>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EmptyMessage>;
}
interface IClientServiceService_INodesPing extends grpc.MethodDefinition<polykey_v1_nodes_nodes_pb.Node, polykey_v1_utils_utils_pb.StatusMessage> {
    path: "/polykey.v1.ClientService/NodesPing";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_nodes_nodes_pb.Node>;
    requestDeserialize: grpc.deserialize<polykey_v1_nodes_nodes_pb.Node>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.StatusMessage>;
}
interface IClientServiceService_INodesClaim extends grpc.MethodDefinition<polykey_v1_nodes_nodes_pb.Claim, polykey_v1_utils_utils_pb.StatusMessage> {
    path: "/polykey.v1.ClientService/NodesClaim";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_nodes_nodes_pb.Claim>;
    requestDeserialize: grpc.deserialize<polykey_v1_nodes_nodes_pb.Claim>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.StatusMessage>;
}
interface IClientServiceService_INodesFind extends grpc.MethodDefinition<polykey_v1_nodes_nodes_pb.Node, polykey_v1_nodes_nodes_pb.NodeAddress> {
    path: "/polykey.v1.ClientService/NodesFind";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_nodes_nodes_pb.Node>;
    requestDeserialize: grpc.deserialize<polykey_v1_nodes_nodes_pb.Node>;
    responseSerialize: grpc.serialize<polykey_v1_nodes_nodes_pb.NodeAddress>;
    responseDeserialize: grpc.deserialize<polykey_v1_nodes_nodes_pb.NodeAddress>;
}
interface IClientServiceService_INodesGetAll extends grpc.MethodDefinition<polykey_v1_utils_utils_pb.EmptyMessage, polykey_v1_nodes_nodes_pb.NodeBuckets> {
    path: "/polykey.v1.ClientService/NodesGetAll";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<polykey_v1_nodes_nodes_pb.NodeBuckets>;
    responseDeserialize: grpc.deserialize<polykey_v1_nodes_nodes_pb.NodeBuckets>;
}
interface IClientServiceService_IKeysKeyPairRoot extends grpc.MethodDefinition<polykey_v1_utils_utils_pb.EmptyMessage, polykey_v1_keys_keys_pb.KeyPair> {
    path: "/polykey.v1.ClientService/KeysKeyPairRoot";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<polykey_v1_keys_keys_pb.KeyPair>;
    responseDeserialize: grpc.deserialize<polykey_v1_keys_keys_pb.KeyPair>;
}
interface IClientServiceService_IKeysKeyPairReset extends grpc.MethodDefinition<polykey_v1_keys_keys_pb.Key, polykey_v1_utils_utils_pb.EmptyMessage> {
    path: "/polykey.v1.ClientService/KeysKeyPairReset";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_keys_keys_pb.Key>;
    requestDeserialize: grpc.deserialize<polykey_v1_keys_keys_pb.Key>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EmptyMessage>;
}
interface IClientServiceService_IKeysKeyPairRenew extends grpc.MethodDefinition<polykey_v1_keys_keys_pb.Key, polykey_v1_utils_utils_pb.EmptyMessage> {
    path: "/polykey.v1.ClientService/KeysKeyPairRenew";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_keys_keys_pb.Key>;
    requestDeserialize: grpc.deserialize<polykey_v1_keys_keys_pb.Key>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EmptyMessage>;
}
interface IClientServiceService_IKeysEncrypt extends grpc.MethodDefinition<polykey_v1_keys_keys_pb.Crypto, polykey_v1_keys_keys_pb.Crypto> {
    path: "/polykey.v1.ClientService/KeysEncrypt";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_keys_keys_pb.Crypto>;
    requestDeserialize: grpc.deserialize<polykey_v1_keys_keys_pb.Crypto>;
    responseSerialize: grpc.serialize<polykey_v1_keys_keys_pb.Crypto>;
    responseDeserialize: grpc.deserialize<polykey_v1_keys_keys_pb.Crypto>;
}
interface IClientServiceService_IKeysDecrypt extends grpc.MethodDefinition<polykey_v1_keys_keys_pb.Crypto, polykey_v1_keys_keys_pb.Crypto> {
    path: "/polykey.v1.ClientService/KeysDecrypt";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_keys_keys_pb.Crypto>;
    requestDeserialize: grpc.deserialize<polykey_v1_keys_keys_pb.Crypto>;
    responseSerialize: grpc.serialize<polykey_v1_keys_keys_pb.Crypto>;
    responseDeserialize: grpc.deserialize<polykey_v1_keys_keys_pb.Crypto>;
}
interface IClientServiceService_IKeysSign extends grpc.MethodDefinition<polykey_v1_keys_keys_pb.Crypto, polykey_v1_keys_keys_pb.Crypto> {
    path: "/polykey.v1.ClientService/KeysSign";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_keys_keys_pb.Crypto>;
    requestDeserialize: grpc.deserialize<polykey_v1_keys_keys_pb.Crypto>;
    responseSerialize: grpc.serialize<polykey_v1_keys_keys_pb.Crypto>;
    responseDeserialize: grpc.deserialize<polykey_v1_keys_keys_pb.Crypto>;
}
interface IClientServiceService_IKeysVerify extends grpc.MethodDefinition<polykey_v1_keys_keys_pb.Crypto, polykey_v1_utils_utils_pb.StatusMessage> {
    path: "/polykey.v1.ClientService/KeysVerify";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_keys_keys_pb.Crypto>;
    requestDeserialize: grpc.deserialize<polykey_v1_keys_keys_pb.Crypto>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.StatusMessage>;
}
interface IClientServiceService_IKeysPasswordChange extends grpc.MethodDefinition<polykey_v1_sessions_sessions_pb.Password, polykey_v1_utils_utils_pb.EmptyMessage> {
    path: "/polykey.v1.ClientService/KeysPasswordChange";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_sessions_sessions_pb.Password>;
    requestDeserialize: grpc.deserialize<polykey_v1_sessions_sessions_pb.Password>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EmptyMessage>;
}
interface IClientServiceService_IKeysCertsGet extends grpc.MethodDefinition<polykey_v1_utils_utils_pb.EmptyMessage, polykey_v1_keys_keys_pb.Certificate> {
    path: "/polykey.v1.ClientService/KeysCertsGet";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<polykey_v1_keys_keys_pb.Certificate>;
    responseDeserialize: grpc.deserialize<polykey_v1_keys_keys_pb.Certificate>;
}
interface IClientServiceService_IKeysCertsChainGet extends grpc.MethodDefinition<polykey_v1_utils_utils_pb.EmptyMessage, polykey_v1_keys_keys_pb.Certificate> {
    path: "/polykey.v1.ClientService/KeysCertsChainGet";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<polykey_v1_keys_keys_pb.Certificate>;
    responseDeserialize: grpc.deserialize<polykey_v1_keys_keys_pb.Certificate>;
}
interface IClientServiceService_IVaultsList extends grpc.MethodDefinition<polykey_v1_utils_utils_pb.EmptyMessage, polykey_v1_vaults_vaults_pb.List> {
    path: "/polykey.v1.ClientService/VaultsList";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<polykey_v1_vaults_vaults_pb.List>;
    responseDeserialize: grpc.deserialize<polykey_v1_vaults_vaults_pb.List>;
}
interface IClientServiceService_IVaultsCreate extends grpc.MethodDefinition<polykey_v1_vaults_vaults_pb.Vault, polykey_v1_vaults_vaults_pb.Vault> {
    path: "/polykey.v1.ClientService/VaultsCreate";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_vaults_vaults_pb.Vault>;
    requestDeserialize: grpc.deserialize<polykey_v1_vaults_vaults_pb.Vault>;
    responseSerialize: grpc.serialize<polykey_v1_vaults_vaults_pb.Vault>;
    responseDeserialize: grpc.deserialize<polykey_v1_vaults_vaults_pb.Vault>;
}
interface IClientServiceService_IVaultsRename extends grpc.MethodDefinition<polykey_v1_vaults_vaults_pb.Rename, polykey_v1_vaults_vaults_pb.Vault> {
    path: "/polykey.v1.ClientService/VaultsRename";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_vaults_vaults_pb.Rename>;
    requestDeserialize: grpc.deserialize<polykey_v1_vaults_vaults_pb.Rename>;
    responseSerialize: grpc.serialize<polykey_v1_vaults_vaults_pb.Vault>;
    responseDeserialize: grpc.deserialize<polykey_v1_vaults_vaults_pb.Vault>;
}
interface IClientServiceService_IVaultsDelete extends grpc.MethodDefinition<polykey_v1_vaults_vaults_pb.Vault, polykey_v1_utils_utils_pb.StatusMessage> {
    path: "/polykey.v1.ClientService/VaultsDelete";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_vaults_vaults_pb.Vault>;
    requestDeserialize: grpc.deserialize<polykey_v1_vaults_vaults_pb.Vault>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.StatusMessage>;
}
interface IClientServiceService_IVaultsPull extends grpc.MethodDefinition<polykey_v1_vaults_vaults_pb.Pull, polykey_v1_utils_utils_pb.StatusMessage> {
    path: "/polykey.v1.ClientService/VaultsPull";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_vaults_vaults_pb.Pull>;
    requestDeserialize: grpc.deserialize<polykey_v1_vaults_vaults_pb.Pull>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.StatusMessage>;
}
interface IClientServiceService_IVaultsClone extends grpc.MethodDefinition<polykey_v1_vaults_vaults_pb.Clone, polykey_v1_utils_utils_pb.StatusMessage> {
    path: "/polykey.v1.ClientService/VaultsClone";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_vaults_vaults_pb.Clone>;
    requestDeserialize: grpc.deserialize<polykey_v1_vaults_vaults_pb.Clone>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.StatusMessage>;
}
interface IClientServiceService_IVaultsSecretsList extends grpc.MethodDefinition<polykey_v1_vaults_vaults_pb.Vault, polykey_v1_secrets_secrets_pb.Secret> {
    path: "/polykey.v1.ClientService/VaultsSecretsList";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<polykey_v1_vaults_vaults_pb.Vault>;
    requestDeserialize: grpc.deserialize<polykey_v1_vaults_vaults_pb.Vault>;
    responseSerialize: grpc.serialize<polykey_v1_secrets_secrets_pb.Secret>;
    responseDeserialize: grpc.deserialize<polykey_v1_secrets_secrets_pb.Secret>;
}
interface IClientServiceService_IVaultsSecretsMkdir extends grpc.MethodDefinition<polykey_v1_vaults_vaults_pb.Mkdir, polykey_v1_utils_utils_pb.StatusMessage> {
    path: "/polykey.v1.ClientService/VaultsSecretsMkdir";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_vaults_vaults_pb.Mkdir>;
    requestDeserialize: grpc.deserialize<polykey_v1_vaults_vaults_pb.Mkdir>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.StatusMessage>;
}
interface IClientServiceService_IVaultsSecretsDelete extends grpc.MethodDefinition<polykey_v1_secrets_secrets_pb.Secret, polykey_v1_utils_utils_pb.StatusMessage> {
    path: "/polykey.v1.ClientService/VaultsSecretsDelete";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_secrets_secrets_pb.Secret>;
    requestDeserialize: grpc.deserialize<polykey_v1_secrets_secrets_pb.Secret>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.StatusMessage>;
}
interface IClientServiceService_IVaultsSecretsEdit extends grpc.MethodDefinition<polykey_v1_secrets_secrets_pb.Secret, polykey_v1_utils_utils_pb.StatusMessage> {
    path: "/polykey.v1.ClientService/VaultsSecretsEdit";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_secrets_secrets_pb.Secret>;
    requestDeserialize: grpc.deserialize<polykey_v1_secrets_secrets_pb.Secret>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.StatusMessage>;
}
interface IClientServiceService_IVaultsSecretsGet extends grpc.MethodDefinition<polykey_v1_secrets_secrets_pb.Secret, polykey_v1_secrets_secrets_pb.Secret> {
    path: "/polykey.v1.ClientService/VaultsSecretsGet";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_secrets_secrets_pb.Secret>;
    requestDeserialize: grpc.deserialize<polykey_v1_secrets_secrets_pb.Secret>;
    responseSerialize: grpc.serialize<polykey_v1_secrets_secrets_pb.Secret>;
    responseDeserialize: grpc.deserialize<polykey_v1_secrets_secrets_pb.Secret>;
}
interface IClientServiceService_IVaultsSecretsRename extends grpc.MethodDefinition<polykey_v1_secrets_secrets_pb.Rename, polykey_v1_utils_utils_pb.StatusMessage> {
    path: "/polykey.v1.ClientService/VaultsSecretsRename";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_secrets_secrets_pb.Rename>;
    requestDeserialize: grpc.deserialize<polykey_v1_secrets_secrets_pb.Rename>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.StatusMessage>;
}
interface IClientServiceService_IVaultsSecretsNew extends grpc.MethodDefinition<polykey_v1_secrets_secrets_pb.Secret, polykey_v1_utils_utils_pb.StatusMessage> {
    path: "/polykey.v1.ClientService/VaultsSecretsNew";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_secrets_secrets_pb.Secret>;
    requestDeserialize: grpc.deserialize<polykey_v1_secrets_secrets_pb.Secret>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.StatusMessage>;
}
interface IClientServiceService_IVaultsSecretsNewDir extends grpc.MethodDefinition<polykey_v1_secrets_secrets_pb.Directory, polykey_v1_utils_utils_pb.StatusMessage> {
    path: "/polykey.v1.ClientService/VaultsSecretsNewDir";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_secrets_secrets_pb.Directory>;
    requestDeserialize: grpc.deserialize<polykey_v1_secrets_secrets_pb.Directory>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.StatusMessage>;
}
interface IClientServiceService_IvaultsSecretsStat extends grpc.MethodDefinition<polykey_v1_secrets_secrets_pb.Secret, polykey_v1_secrets_secrets_pb.Stat> {
    path: "/polykey.v1.ClientService/vaultsSecretsStat";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_secrets_secrets_pb.Secret>;
    requestDeserialize: grpc.deserialize<polykey_v1_secrets_secrets_pb.Secret>;
    responseSerialize: grpc.serialize<polykey_v1_secrets_secrets_pb.Stat>;
    responseDeserialize: grpc.deserialize<polykey_v1_secrets_secrets_pb.Stat>;
}
interface IClientServiceService_IVaultsPermissionGet extends grpc.MethodDefinition<polykey_v1_vaults_vaults_pb.Vault, polykey_v1_vaults_vaults_pb.Permissions> {
    path: "/polykey.v1.ClientService/VaultsPermissionGet";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<polykey_v1_vaults_vaults_pb.Vault>;
    requestDeserialize: grpc.deserialize<polykey_v1_vaults_vaults_pb.Vault>;
    responseSerialize: grpc.serialize<polykey_v1_vaults_vaults_pb.Permissions>;
    responseDeserialize: grpc.deserialize<polykey_v1_vaults_vaults_pb.Permissions>;
}
interface IClientServiceService_IVaultsPermissionSet extends grpc.MethodDefinition<polykey_v1_vaults_vaults_pb.Permissions, polykey_v1_utils_utils_pb.StatusMessage> {
    path: "/polykey.v1.ClientService/VaultsPermissionSet";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_vaults_vaults_pb.Permissions>;
    requestDeserialize: grpc.deserialize<polykey_v1_vaults_vaults_pb.Permissions>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.StatusMessage>;
}
interface IClientServiceService_IVaultsPermissionUnset extends grpc.MethodDefinition<polykey_v1_vaults_vaults_pb.Permissions, polykey_v1_utils_utils_pb.StatusMessage> {
    path: "/polykey.v1.ClientService/VaultsPermissionUnset";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_vaults_vaults_pb.Permissions>;
    requestDeserialize: grpc.deserialize<polykey_v1_vaults_vaults_pb.Permissions>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.StatusMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.StatusMessage>;
}
interface IClientServiceService_IVaultsVersion extends grpc.MethodDefinition<polykey_v1_vaults_vaults_pb.Version, polykey_v1_vaults_vaults_pb.VersionResult> {
    path: "/polykey.v1.ClientService/VaultsVersion";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_vaults_vaults_pb.Version>;
    requestDeserialize: grpc.deserialize<polykey_v1_vaults_vaults_pb.Version>;
    responseSerialize: grpc.serialize<polykey_v1_vaults_vaults_pb.VersionResult>;
    responseDeserialize: grpc.deserialize<polykey_v1_vaults_vaults_pb.VersionResult>;
}
interface IClientServiceService_IVaultsLog extends grpc.MethodDefinition<polykey_v1_vaults_vaults_pb.Log, polykey_v1_vaults_vaults_pb.LogEntry> {
    path: "/polykey.v1.ClientService/VaultsLog";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<polykey_v1_vaults_vaults_pb.Log>;
    requestDeserialize: grpc.deserialize<polykey_v1_vaults_vaults_pb.Log>;
    responseSerialize: grpc.serialize<polykey_v1_vaults_vaults_pb.LogEntry>;
    responseDeserialize: grpc.deserialize<polykey_v1_vaults_vaults_pb.LogEntry>;
}
interface IClientServiceService_IVaultsScan extends grpc.MethodDefinition<polykey_v1_nodes_nodes_pb.Node, polykey_v1_vaults_vaults_pb.List> {
    path: "/polykey.v1.ClientService/VaultsScan";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<polykey_v1_nodes_nodes_pb.Node>;
    requestDeserialize: grpc.deserialize<polykey_v1_nodes_nodes_pb.Node>;
    responseSerialize: grpc.serialize<polykey_v1_vaults_vaults_pb.List>;
    responseDeserialize: grpc.deserialize<polykey_v1_vaults_vaults_pb.List>;
}
interface IClientServiceService_IIdentitiesAuthenticate extends grpc.MethodDefinition<polykey_v1_identities_identities_pb.Provider, polykey_v1_identities_identities_pb.AuthenticationProcess> {
    path: "/polykey.v1.ClientService/IdentitiesAuthenticate";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<polykey_v1_identities_identities_pb.Provider>;
    requestDeserialize: grpc.deserialize<polykey_v1_identities_identities_pb.Provider>;
    responseSerialize: grpc.serialize<polykey_v1_identities_identities_pb.AuthenticationProcess>;
    responseDeserialize: grpc.deserialize<polykey_v1_identities_identities_pb.AuthenticationProcess>;
}
interface IClientServiceService_IIdentitiesAuthenticatedGet extends grpc.MethodDefinition<polykey_v1_identities_identities_pb.OptionalProvider, polykey_v1_identities_identities_pb.Provider> {
    path: "/polykey.v1.ClientService/IdentitiesAuthenticatedGet";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<polykey_v1_identities_identities_pb.OptionalProvider>;
    requestDeserialize: grpc.deserialize<polykey_v1_identities_identities_pb.OptionalProvider>;
    responseSerialize: grpc.serialize<polykey_v1_identities_identities_pb.Provider>;
    responseDeserialize: grpc.deserialize<polykey_v1_identities_identities_pb.Provider>;
}
interface IClientServiceService_IIdentitiesTokenPut extends grpc.MethodDefinition<polykey_v1_identities_identities_pb.TokenSpecific, polykey_v1_utils_utils_pb.EmptyMessage> {
    path: "/polykey.v1.ClientService/IdentitiesTokenPut";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_identities_identities_pb.TokenSpecific>;
    requestDeserialize: grpc.deserialize<polykey_v1_identities_identities_pb.TokenSpecific>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EmptyMessage>;
}
interface IClientServiceService_IIdentitiesTokenGet extends grpc.MethodDefinition<polykey_v1_identities_identities_pb.Provider, polykey_v1_identities_identities_pb.Token> {
    path: "/polykey.v1.ClientService/IdentitiesTokenGet";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_identities_identities_pb.Provider>;
    requestDeserialize: grpc.deserialize<polykey_v1_identities_identities_pb.Provider>;
    responseSerialize: grpc.serialize<polykey_v1_identities_identities_pb.Token>;
    responseDeserialize: grpc.deserialize<polykey_v1_identities_identities_pb.Token>;
}
interface IClientServiceService_IIdentitiesTokenDelete extends grpc.MethodDefinition<polykey_v1_identities_identities_pb.Provider, polykey_v1_utils_utils_pb.EmptyMessage> {
    path: "/polykey.v1.ClientService/IdentitiesTokenDelete";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_identities_identities_pb.Provider>;
    requestDeserialize: grpc.deserialize<polykey_v1_identities_identities_pb.Provider>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EmptyMessage>;
}
interface IClientServiceService_IIdentitiesProvidersList extends grpc.MethodDefinition<polykey_v1_utils_utils_pb.EmptyMessage, polykey_v1_identities_identities_pb.Provider> {
    path: "/polykey.v1.ClientService/IdentitiesProvidersList";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<polykey_v1_identities_identities_pb.Provider>;
    responseDeserialize: grpc.deserialize<polykey_v1_identities_identities_pb.Provider>;
}
interface IClientServiceService_IIdentitiesInfoGet extends grpc.MethodDefinition<polykey_v1_identities_identities_pb.ProviderSearch, polykey_v1_identities_identities_pb.Info> {
    path: "/polykey.v1.ClientService/IdentitiesInfoGet";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<polykey_v1_identities_identities_pb.ProviderSearch>;
    requestDeserialize: grpc.deserialize<polykey_v1_identities_identities_pb.ProviderSearch>;
    responseSerialize: grpc.serialize<polykey_v1_identities_identities_pb.Info>;
    responseDeserialize: grpc.deserialize<polykey_v1_identities_identities_pb.Info>;
}
interface IClientServiceService_IIdentitiesInfoConnectedGet extends grpc.MethodDefinition<polykey_v1_identities_identities_pb.ProviderSearch, polykey_v1_identities_identities_pb.Info> {
    path: "/polykey.v1.ClientService/IdentitiesInfoConnectedGet";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<polykey_v1_identities_identities_pb.ProviderSearch>;
    requestDeserialize: grpc.deserialize<polykey_v1_identities_identities_pb.ProviderSearch>;
    responseSerialize: grpc.serialize<polykey_v1_identities_identities_pb.Info>;
    responseDeserialize: grpc.deserialize<polykey_v1_identities_identities_pb.Info>;
}
interface IClientServiceService_IIdentitiesClaim extends grpc.MethodDefinition<polykey_v1_identities_identities_pb.Provider, polykey_v1_identities_identities_pb.Claim> {
    path: "/polykey.v1.ClientService/IdentitiesClaim";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_identities_identities_pb.Provider>;
    requestDeserialize: grpc.deserialize<polykey_v1_identities_identities_pb.Provider>;
    responseSerialize: grpc.serialize<polykey_v1_identities_identities_pb.Claim>;
    responseDeserialize: grpc.deserialize<polykey_v1_identities_identities_pb.Claim>;
}
interface IClientServiceService_IGestaltsGestaltList extends grpc.MethodDefinition<polykey_v1_utils_utils_pb.EmptyMessage, polykey_v1_gestalts_gestalts_pb.Gestalt> {
    path: "/polykey.v1.ClientService/GestaltsGestaltList";
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<polykey_v1_gestalts_gestalts_pb.Gestalt>;
    responseDeserialize: grpc.deserialize<polykey_v1_gestalts_gestalts_pb.Gestalt>;
}
interface IClientServiceService_IGestaltsGestaltGetByNode extends grpc.MethodDefinition<polykey_v1_nodes_nodes_pb.Node, polykey_v1_gestalts_gestalts_pb.Graph> {
    path: "/polykey.v1.ClientService/GestaltsGestaltGetByNode";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_nodes_nodes_pb.Node>;
    requestDeserialize: grpc.deserialize<polykey_v1_nodes_nodes_pb.Node>;
    responseSerialize: grpc.serialize<polykey_v1_gestalts_gestalts_pb.Graph>;
    responseDeserialize: grpc.deserialize<polykey_v1_gestalts_gestalts_pb.Graph>;
}
interface IClientServiceService_IGestaltsGestaltGetByIdentity extends grpc.MethodDefinition<polykey_v1_identities_identities_pb.Provider, polykey_v1_gestalts_gestalts_pb.Graph> {
    path: "/polykey.v1.ClientService/GestaltsGestaltGetByIdentity";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_identities_identities_pb.Provider>;
    requestDeserialize: grpc.deserialize<polykey_v1_identities_identities_pb.Provider>;
    responseSerialize: grpc.serialize<polykey_v1_gestalts_gestalts_pb.Graph>;
    responseDeserialize: grpc.deserialize<polykey_v1_gestalts_gestalts_pb.Graph>;
}
interface IClientServiceService_IGestaltsGestaltTrustByNode extends grpc.MethodDefinition<polykey_v1_nodes_nodes_pb.Node, polykey_v1_utils_utils_pb.EmptyMessage> {
    path: "/polykey.v1.ClientService/GestaltsGestaltTrustByNode";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_nodes_nodes_pb.Node>;
    requestDeserialize: grpc.deserialize<polykey_v1_nodes_nodes_pb.Node>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EmptyMessage>;
}
interface IClientServiceService_IGestaltsGestaltTrustByIdentity extends grpc.MethodDefinition<polykey_v1_identities_identities_pb.Provider, polykey_v1_utils_utils_pb.EmptyMessage> {
    path: "/polykey.v1.ClientService/GestaltsGestaltTrustByIdentity";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_identities_identities_pb.Provider>;
    requestDeserialize: grpc.deserialize<polykey_v1_identities_identities_pb.Provider>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EmptyMessage>;
}
interface IClientServiceService_IGestaltsDiscoveryByNode extends grpc.MethodDefinition<polykey_v1_nodes_nodes_pb.Node, polykey_v1_utils_utils_pb.EmptyMessage> {
    path: "/polykey.v1.ClientService/GestaltsDiscoveryByNode";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_nodes_nodes_pb.Node>;
    requestDeserialize: grpc.deserialize<polykey_v1_nodes_nodes_pb.Node>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EmptyMessage>;
}
interface IClientServiceService_IGestaltsDiscoveryByIdentity extends grpc.MethodDefinition<polykey_v1_identities_identities_pb.Provider, polykey_v1_utils_utils_pb.EmptyMessage> {
    path: "/polykey.v1.ClientService/GestaltsDiscoveryByIdentity";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_identities_identities_pb.Provider>;
    requestDeserialize: grpc.deserialize<polykey_v1_identities_identities_pb.Provider>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EmptyMessage>;
}
interface IClientServiceService_IGestaltsActionsGetByNode extends grpc.MethodDefinition<polykey_v1_nodes_nodes_pb.Node, polykey_v1_permissions_permissions_pb.Actions> {
    path: "/polykey.v1.ClientService/GestaltsActionsGetByNode";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_nodes_nodes_pb.Node>;
    requestDeserialize: grpc.deserialize<polykey_v1_nodes_nodes_pb.Node>;
    responseSerialize: grpc.serialize<polykey_v1_permissions_permissions_pb.Actions>;
    responseDeserialize: grpc.deserialize<polykey_v1_permissions_permissions_pb.Actions>;
}
interface IClientServiceService_IGestaltsActionsGetByIdentity extends grpc.MethodDefinition<polykey_v1_identities_identities_pb.Provider, polykey_v1_permissions_permissions_pb.Actions> {
    path: "/polykey.v1.ClientService/GestaltsActionsGetByIdentity";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_identities_identities_pb.Provider>;
    requestDeserialize: grpc.deserialize<polykey_v1_identities_identities_pb.Provider>;
    responseSerialize: grpc.serialize<polykey_v1_permissions_permissions_pb.Actions>;
    responseDeserialize: grpc.deserialize<polykey_v1_permissions_permissions_pb.Actions>;
}
interface IClientServiceService_IGestaltsActionsSetByNode extends grpc.MethodDefinition<polykey_v1_permissions_permissions_pb.ActionSet, polykey_v1_utils_utils_pb.EmptyMessage> {
    path: "/polykey.v1.ClientService/GestaltsActionsSetByNode";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_permissions_permissions_pb.ActionSet>;
    requestDeserialize: grpc.deserialize<polykey_v1_permissions_permissions_pb.ActionSet>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EmptyMessage>;
}
interface IClientServiceService_IGestaltsActionsSetByIdentity extends grpc.MethodDefinition<polykey_v1_permissions_permissions_pb.ActionSet, polykey_v1_utils_utils_pb.EmptyMessage> {
    path: "/polykey.v1.ClientService/GestaltsActionsSetByIdentity";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_permissions_permissions_pb.ActionSet>;
    requestDeserialize: grpc.deserialize<polykey_v1_permissions_permissions_pb.ActionSet>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EmptyMessage>;
}
interface IClientServiceService_IGestaltsActionsUnsetByNode extends grpc.MethodDefinition<polykey_v1_permissions_permissions_pb.ActionSet, polykey_v1_utils_utils_pb.EmptyMessage> {
    path: "/polykey.v1.ClientService/GestaltsActionsUnsetByNode";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_permissions_permissions_pb.ActionSet>;
    requestDeserialize: grpc.deserialize<polykey_v1_permissions_permissions_pb.ActionSet>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EmptyMessage>;
}
interface IClientServiceService_IGestaltsActionsUnsetByIdentity extends grpc.MethodDefinition<polykey_v1_permissions_permissions_pb.ActionSet, polykey_v1_utils_utils_pb.EmptyMessage> {
    path: "/polykey.v1.ClientService/GestaltsActionsUnsetByIdentity";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_permissions_permissions_pb.ActionSet>;
    requestDeserialize: grpc.deserialize<polykey_v1_permissions_permissions_pb.ActionSet>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EmptyMessage>;
}
interface IClientServiceService_INotificationsSend extends grpc.MethodDefinition<polykey_v1_notifications_notifications_pb.Send, polykey_v1_utils_utils_pb.EmptyMessage> {
    path: "/polykey.v1.ClientService/NotificationsSend";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_notifications_notifications_pb.Send>;
    requestDeserialize: grpc.deserialize<polykey_v1_notifications_notifications_pb.Send>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EmptyMessage>;
}
interface IClientServiceService_INotificationsRead extends grpc.MethodDefinition<polykey_v1_notifications_notifications_pb.Read, polykey_v1_notifications_notifications_pb.List> {
    path: "/polykey.v1.ClientService/NotificationsRead";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_notifications_notifications_pb.Read>;
    requestDeserialize: grpc.deserialize<polykey_v1_notifications_notifications_pb.Read>;
    responseSerialize: grpc.serialize<polykey_v1_notifications_notifications_pb.List>;
    responseDeserialize: grpc.deserialize<polykey_v1_notifications_notifications_pb.List>;
}
interface IClientServiceService_INotificationsClear extends grpc.MethodDefinition<polykey_v1_utils_utils_pb.EmptyMessage, polykey_v1_utils_utils_pb.EmptyMessage> {
    path: "/polykey.v1.ClientService/NotificationsClear";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    requestDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    responseSerialize: grpc.serialize<polykey_v1_utils_utils_pb.EmptyMessage>;
    responseDeserialize: grpc.deserialize<polykey_v1_utils_utils_pb.EmptyMessage>;
}

export const ClientServiceService: IClientServiceService;

export interface IClientServiceServer extends grpc.UntypedServiceImplementation {
    agentLockAll: grpc.handleUnaryCall<polykey_v1_utils_utils_pb.EmptyMessage, polykey_v1_utils_utils_pb.EmptyMessage>;
    agentStatus: grpc.handleUnaryCall<polykey_v1_utils_utils_pb.EmptyMessage, polykey_v1_agent_agent_pb.InfoMessage>;
    agentStop: grpc.handleUnaryCall<polykey_v1_utils_utils_pb.EmptyMessage, polykey_v1_utils_utils_pb.EmptyMessage>;
    agentUnlock: grpc.handleUnaryCall<polykey_v1_utils_utils_pb.EmptyMessage, polykey_v1_utils_utils_pb.EmptyMessage>;
    nodesAdd: grpc.handleUnaryCall<polykey_v1_nodes_nodes_pb.NodeAdd, polykey_v1_utils_utils_pb.EmptyMessage>;
    nodesPing: grpc.handleUnaryCall<polykey_v1_nodes_nodes_pb.Node, polykey_v1_utils_utils_pb.StatusMessage>;
    nodesClaim: grpc.handleUnaryCall<polykey_v1_nodes_nodes_pb.Claim, polykey_v1_utils_utils_pb.StatusMessage>;
    nodesFind: grpc.handleUnaryCall<polykey_v1_nodes_nodes_pb.Node, polykey_v1_nodes_nodes_pb.NodeAddress>;
    nodesGetAll: grpc.handleUnaryCall<polykey_v1_utils_utils_pb.EmptyMessage, polykey_v1_nodes_nodes_pb.NodeBuckets>;
    keysKeyPairRoot: grpc.handleUnaryCall<polykey_v1_utils_utils_pb.EmptyMessage, polykey_v1_keys_keys_pb.KeyPair>;
    keysKeyPairReset: grpc.handleUnaryCall<polykey_v1_keys_keys_pb.Key, polykey_v1_utils_utils_pb.EmptyMessage>;
    keysKeyPairRenew: grpc.handleUnaryCall<polykey_v1_keys_keys_pb.Key, polykey_v1_utils_utils_pb.EmptyMessage>;
    keysEncrypt: grpc.handleUnaryCall<polykey_v1_keys_keys_pb.Crypto, polykey_v1_keys_keys_pb.Crypto>;
    keysDecrypt: grpc.handleUnaryCall<polykey_v1_keys_keys_pb.Crypto, polykey_v1_keys_keys_pb.Crypto>;
    keysSign: grpc.handleUnaryCall<polykey_v1_keys_keys_pb.Crypto, polykey_v1_keys_keys_pb.Crypto>;
    keysVerify: grpc.handleUnaryCall<polykey_v1_keys_keys_pb.Crypto, polykey_v1_utils_utils_pb.StatusMessage>;
    keysPasswordChange: grpc.handleUnaryCall<polykey_v1_sessions_sessions_pb.Password, polykey_v1_utils_utils_pb.EmptyMessage>;
    keysCertsGet: grpc.handleUnaryCall<polykey_v1_utils_utils_pb.EmptyMessage, polykey_v1_keys_keys_pb.Certificate>;
    keysCertsChainGet: grpc.handleServerStreamingCall<polykey_v1_utils_utils_pb.EmptyMessage, polykey_v1_keys_keys_pb.Certificate>;
    vaultsList: grpc.handleServerStreamingCall<polykey_v1_utils_utils_pb.EmptyMessage, polykey_v1_vaults_vaults_pb.List>;
    vaultsCreate: grpc.handleUnaryCall<polykey_v1_vaults_vaults_pb.Vault, polykey_v1_vaults_vaults_pb.Vault>;
    vaultsRename: grpc.handleUnaryCall<polykey_v1_vaults_vaults_pb.Rename, polykey_v1_vaults_vaults_pb.Vault>;
    vaultsDelete: grpc.handleUnaryCall<polykey_v1_vaults_vaults_pb.Vault, polykey_v1_utils_utils_pb.StatusMessage>;
    vaultsPull: grpc.handleUnaryCall<polykey_v1_vaults_vaults_pb.Pull, polykey_v1_utils_utils_pb.StatusMessage>;
    vaultsClone: grpc.handleUnaryCall<polykey_v1_vaults_vaults_pb.Clone, polykey_v1_utils_utils_pb.StatusMessage>;
    vaultsSecretsList: grpc.handleServerStreamingCall<polykey_v1_vaults_vaults_pb.Vault, polykey_v1_secrets_secrets_pb.Secret>;
    vaultsSecretsMkdir: grpc.handleUnaryCall<polykey_v1_vaults_vaults_pb.Mkdir, polykey_v1_utils_utils_pb.StatusMessage>;
    vaultsSecretsDelete: grpc.handleUnaryCall<polykey_v1_secrets_secrets_pb.Secret, polykey_v1_utils_utils_pb.StatusMessage>;
    vaultsSecretsEdit: grpc.handleUnaryCall<polykey_v1_secrets_secrets_pb.Secret, polykey_v1_utils_utils_pb.StatusMessage>;
    vaultsSecretsGet: grpc.handleUnaryCall<polykey_v1_secrets_secrets_pb.Secret, polykey_v1_secrets_secrets_pb.Secret>;
    vaultsSecretsRename: grpc.handleUnaryCall<polykey_v1_secrets_secrets_pb.Rename, polykey_v1_utils_utils_pb.StatusMessage>;
    vaultsSecretsNew: grpc.handleUnaryCall<polykey_v1_secrets_secrets_pb.Secret, polykey_v1_utils_utils_pb.StatusMessage>;
    vaultsSecretsNewDir: grpc.handleUnaryCall<polykey_v1_secrets_secrets_pb.Directory, polykey_v1_utils_utils_pb.StatusMessage>;
    vaultsSecretsStat: grpc.handleUnaryCall<polykey_v1_secrets_secrets_pb.Secret, polykey_v1_secrets_secrets_pb.Stat>;
    vaultsPermissionGet: grpc.handleServerStreamingCall<polykey_v1_vaults_vaults_pb.Vault, polykey_v1_vaults_vaults_pb.Permissions>;
    vaultsPermissionSet: grpc.handleUnaryCall<polykey_v1_vaults_vaults_pb.Permissions, polykey_v1_utils_utils_pb.StatusMessage>;
    vaultsPermissionUnset: grpc.handleUnaryCall<polykey_v1_vaults_vaults_pb.Permissions, polykey_v1_utils_utils_pb.StatusMessage>;
    vaultsVersion: grpc.handleUnaryCall<polykey_v1_vaults_vaults_pb.Version, polykey_v1_vaults_vaults_pb.VersionResult>;
    vaultsLog: grpc.handleServerStreamingCall<polykey_v1_vaults_vaults_pb.Log, polykey_v1_vaults_vaults_pb.LogEntry>;
    vaultsScan: grpc.handleServerStreamingCall<polykey_v1_nodes_nodes_pb.Node, polykey_v1_vaults_vaults_pb.List>;
    identitiesAuthenticate: grpc.handleServerStreamingCall<polykey_v1_identities_identities_pb.Provider, polykey_v1_identities_identities_pb.AuthenticationProcess>;
    identitiesAuthenticatedGet: grpc.handleServerStreamingCall<polykey_v1_identities_identities_pb.OptionalProvider, polykey_v1_identities_identities_pb.Provider>;
    identitiesTokenPut: grpc.handleUnaryCall<polykey_v1_identities_identities_pb.TokenSpecific, polykey_v1_utils_utils_pb.EmptyMessage>;
    identitiesTokenGet: grpc.handleUnaryCall<polykey_v1_identities_identities_pb.Provider, polykey_v1_identities_identities_pb.Token>;
    identitiesTokenDelete: grpc.handleUnaryCall<polykey_v1_identities_identities_pb.Provider, polykey_v1_utils_utils_pb.EmptyMessage>;
    identitiesProvidersList: grpc.handleUnaryCall<polykey_v1_utils_utils_pb.EmptyMessage, polykey_v1_identities_identities_pb.Provider>;
    identitiesInfoGet: grpc.handleServerStreamingCall<polykey_v1_identities_identities_pb.ProviderSearch, polykey_v1_identities_identities_pb.Info>;
    identitiesInfoConnectedGet: grpc.handleServerStreamingCall<polykey_v1_identities_identities_pb.ProviderSearch, polykey_v1_identities_identities_pb.Info>;
    identitiesClaim: grpc.handleUnaryCall<polykey_v1_identities_identities_pb.Provider, polykey_v1_identities_identities_pb.Claim>;
    gestaltsGestaltList: grpc.handleServerStreamingCall<polykey_v1_utils_utils_pb.EmptyMessage, polykey_v1_gestalts_gestalts_pb.Gestalt>;
    gestaltsGestaltGetByNode: grpc.handleUnaryCall<polykey_v1_nodes_nodes_pb.Node, polykey_v1_gestalts_gestalts_pb.Graph>;
    gestaltsGestaltGetByIdentity: grpc.handleUnaryCall<polykey_v1_identities_identities_pb.Provider, polykey_v1_gestalts_gestalts_pb.Graph>;
    gestaltsGestaltTrustByNode: grpc.handleUnaryCall<polykey_v1_nodes_nodes_pb.Node, polykey_v1_utils_utils_pb.EmptyMessage>;
    gestaltsGestaltTrustByIdentity: grpc.handleUnaryCall<polykey_v1_identities_identities_pb.Provider, polykey_v1_utils_utils_pb.EmptyMessage>;
    gestaltsDiscoveryByNode: grpc.handleUnaryCall<polykey_v1_nodes_nodes_pb.Node, polykey_v1_utils_utils_pb.EmptyMessage>;
    gestaltsDiscoveryByIdentity: grpc.handleUnaryCall<polykey_v1_identities_identities_pb.Provider, polykey_v1_utils_utils_pb.EmptyMessage>;
    gestaltsActionsGetByNode: grpc.handleUnaryCall<polykey_v1_nodes_nodes_pb.Node, polykey_v1_permissions_permissions_pb.Actions>;
    gestaltsActionsGetByIdentity: grpc.handleUnaryCall<polykey_v1_identities_identities_pb.Provider, polykey_v1_permissions_permissions_pb.Actions>;
    gestaltsActionsSetByNode: grpc.handleUnaryCall<polykey_v1_permissions_permissions_pb.ActionSet, polykey_v1_utils_utils_pb.EmptyMessage>;
    gestaltsActionsSetByIdentity: grpc.handleUnaryCall<polykey_v1_permissions_permissions_pb.ActionSet, polykey_v1_utils_utils_pb.EmptyMessage>;
    gestaltsActionsUnsetByNode: grpc.handleUnaryCall<polykey_v1_permissions_permissions_pb.ActionSet, polykey_v1_utils_utils_pb.EmptyMessage>;
    gestaltsActionsUnsetByIdentity: grpc.handleUnaryCall<polykey_v1_permissions_permissions_pb.ActionSet, polykey_v1_utils_utils_pb.EmptyMessage>;
    notificationsSend: grpc.handleUnaryCall<polykey_v1_notifications_notifications_pb.Send, polykey_v1_utils_utils_pb.EmptyMessage>;
    notificationsRead: grpc.handleUnaryCall<polykey_v1_notifications_notifications_pb.Read, polykey_v1_notifications_notifications_pb.List>;
    notificationsClear: grpc.handleUnaryCall<polykey_v1_utils_utils_pb.EmptyMessage, polykey_v1_utils_utils_pb.EmptyMessage>;
}

export interface IClientServiceClient {
    agentLockAll(request: polykey_v1_utils_utils_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    agentLockAll(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    agentLockAll(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    agentStatus(request: polykey_v1_utils_utils_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: polykey_v1_agent_agent_pb.InfoMessage) => void): grpc.ClientUnaryCall;
    agentStatus(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_agent_agent_pb.InfoMessage) => void): grpc.ClientUnaryCall;
    agentStatus(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_agent_agent_pb.InfoMessage) => void): grpc.ClientUnaryCall;
    agentStop(request: polykey_v1_utils_utils_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    agentStop(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    agentStop(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    agentUnlock(request: polykey_v1_utils_utils_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    agentUnlock(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    agentUnlock(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    nodesAdd(request: polykey_v1_nodes_nodes_pb.NodeAdd, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    nodesAdd(request: polykey_v1_nodes_nodes_pb.NodeAdd, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    nodesAdd(request: polykey_v1_nodes_nodes_pb.NodeAdd, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    nodesPing(request: polykey_v1_nodes_nodes_pb.Node, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    nodesPing(request: polykey_v1_nodes_nodes_pb.Node, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    nodesPing(request: polykey_v1_nodes_nodes_pb.Node, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    nodesClaim(request: polykey_v1_nodes_nodes_pb.Claim, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    nodesClaim(request: polykey_v1_nodes_nodes_pb.Claim, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    nodesClaim(request: polykey_v1_nodes_nodes_pb.Claim, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    nodesFind(request: polykey_v1_nodes_nodes_pb.Node, callback: (error: grpc.ServiceError | null, response: polykey_v1_nodes_nodes_pb.NodeAddress) => void): grpc.ClientUnaryCall;
    nodesFind(request: polykey_v1_nodes_nodes_pb.Node, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_nodes_nodes_pb.NodeAddress) => void): grpc.ClientUnaryCall;
    nodesFind(request: polykey_v1_nodes_nodes_pb.Node, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_nodes_nodes_pb.NodeAddress) => void): grpc.ClientUnaryCall;
    nodesGetAll(request: polykey_v1_utils_utils_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: polykey_v1_nodes_nodes_pb.NodeBuckets) => void): grpc.ClientUnaryCall;
    nodesGetAll(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_nodes_nodes_pb.NodeBuckets) => void): grpc.ClientUnaryCall;
    nodesGetAll(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_nodes_nodes_pb.NodeBuckets) => void): grpc.ClientUnaryCall;
    keysKeyPairRoot(request: polykey_v1_utils_utils_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: polykey_v1_keys_keys_pb.KeyPair) => void): grpc.ClientUnaryCall;
    keysKeyPairRoot(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_keys_keys_pb.KeyPair) => void): grpc.ClientUnaryCall;
    keysKeyPairRoot(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_keys_keys_pb.KeyPair) => void): grpc.ClientUnaryCall;
    keysKeyPairReset(request: polykey_v1_keys_keys_pb.Key, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    keysKeyPairReset(request: polykey_v1_keys_keys_pb.Key, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    keysKeyPairReset(request: polykey_v1_keys_keys_pb.Key, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    keysKeyPairRenew(request: polykey_v1_keys_keys_pb.Key, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    keysKeyPairRenew(request: polykey_v1_keys_keys_pb.Key, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    keysKeyPairRenew(request: polykey_v1_keys_keys_pb.Key, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    keysEncrypt(request: polykey_v1_keys_keys_pb.Crypto, callback: (error: grpc.ServiceError | null, response: polykey_v1_keys_keys_pb.Crypto) => void): grpc.ClientUnaryCall;
    keysEncrypt(request: polykey_v1_keys_keys_pb.Crypto, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_keys_keys_pb.Crypto) => void): grpc.ClientUnaryCall;
    keysEncrypt(request: polykey_v1_keys_keys_pb.Crypto, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_keys_keys_pb.Crypto) => void): grpc.ClientUnaryCall;
    keysDecrypt(request: polykey_v1_keys_keys_pb.Crypto, callback: (error: grpc.ServiceError | null, response: polykey_v1_keys_keys_pb.Crypto) => void): grpc.ClientUnaryCall;
    keysDecrypt(request: polykey_v1_keys_keys_pb.Crypto, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_keys_keys_pb.Crypto) => void): grpc.ClientUnaryCall;
    keysDecrypt(request: polykey_v1_keys_keys_pb.Crypto, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_keys_keys_pb.Crypto) => void): grpc.ClientUnaryCall;
    keysSign(request: polykey_v1_keys_keys_pb.Crypto, callback: (error: grpc.ServiceError | null, response: polykey_v1_keys_keys_pb.Crypto) => void): grpc.ClientUnaryCall;
    keysSign(request: polykey_v1_keys_keys_pb.Crypto, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_keys_keys_pb.Crypto) => void): grpc.ClientUnaryCall;
    keysSign(request: polykey_v1_keys_keys_pb.Crypto, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_keys_keys_pb.Crypto) => void): grpc.ClientUnaryCall;
    keysVerify(request: polykey_v1_keys_keys_pb.Crypto, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    keysVerify(request: polykey_v1_keys_keys_pb.Crypto, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    keysVerify(request: polykey_v1_keys_keys_pb.Crypto, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    keysPasswordChange(request: polykey_v1_sessions_sessions_pb.Password, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    keysPasswordChange(request: polykey_v1_sessions_sessions_pb.Password, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    keysPasswordChange(request: polykey_v1_sessions_sessions_pb.Password, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    keysCertsGet(request: polykey_v1_utils_utils_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: polykey_v1_keys_keys_pb.Certificate) => void): grpc.ClientUnaryCall;
    keysCertsGet(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_keys_keys_pb.Certificate) => void): grpc.ClientUnaryCall;
    keysCertsGet(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_keys_keys_pb.Certificate) => void): grpc.ClientUnaryCall;
    keysCertsChainGet(request: polykey_v1_utils_utils_pb.EmptyMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_keys_keys_pb.Certificate>;
    keysCertsChainGet(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_keys_keys_pb.Certificate>;
    vaultsList(request: polykey_v1_utils_utils_pb.EmptyMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_vaults_vaults_pb.List>;
    vaultsList(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_vaults_vaults_pb.List>;
    vaultsCreate(request: polykey_v1_vaults_vaults_pb.Vault, callback: (error: grpc.ServiceError | null, response: polykey_v1_vaults_vaults_pb.Vault) => void): grpc.ClientUnaryCall;
    vaultsCreate(request: polykey_v1_vaults_vaults_pb.Vault, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_vaults_vaults_pb.Vault) => void): grpc.ClientUnaryCall;
    vaultsCreate(request: polykey_v1_vaults_vaults_pb.Vault, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_vaults_vaults_pb.Vault) => void): grpc.ClientUnaryCall;
    vaultsRename(request: polykey_v1_vaults_vaults_pb.Rename, callback: (error: grpc.ServiceError | null, response: polykey_v1_vaults_vaults_pb.Vault) => void): grpc.ClientUnaryCall;
    vaultsRename(request: polykey_v1_vaults_vaults_pb.Rename, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_vaults_vaults_pb.Vault) => void): grpc.ClientUnaryCall;
    vaultsRename(request: polykey_v1_vaults_vaults_pb.Rename, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_vaults_vaults_pb.Vault) => void): grpc.ClientUnaryCall;
    vaultsDelete(request: polykey_v1_vaults_vaults_pb.Vault, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsDelete(request: polykey_v1_vaults_vaults_pb.Vault, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsDelete(request: polykey_v1_vaults_vaults_pb.Vault, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsPull(request: polykey_v1_vaults_vaults_pb.Pull, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsPull(request: polykey_v1_vaults_vaults_pb.Pull, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsPull(request: polykey_v1_vaults_vaults_pb.Pull, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsClone(request: polykey_v1_vaults_vaults_pb.Clone, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsClone(request: polykey_v1_vaults_vaults_pb.Clone, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsClone(request: polykey_v1_vaults_vaults_pb.Clone, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsList(request: polykey_v1_vaults_vaults_pb.Vault, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_secrets_secrets_pb.Secret>;
    vaultsSecretsList(request: polykey_v1_vaults_vaults_pb.Vault, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_secrets_secrets_pb.Secret>;
    vaultsSecretsMkdir(request: polykey_v1_vaults_vaults_pb.Mkdir, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsMkdir(request: polykey_v1_vaults_vaults_pb.Mkdir, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsMkdir(request: polykey_v1_vaults_vaults_pb.Mkdir, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsDelete(request: polykey_v1_secrets_secrets_pb.Secret, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsDelete(request: polykey_v1_secrets_secrets_pb.Secret, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsDelete(request: polykey_v1_secrets_secrets_pb.Secret, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsEdit(request: polykey_v1_secrets_secrets_pb.Secret, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsEdit(request: polykey_v1_secrets_secrets_pb.Secret, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsEdit(request: polykey_v1_secrets_secrets_pb.Secret, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsGet(request: polykey_v1_secrets_secrets_pb.Secret, callback: (error: grpc.ServiceError | null, response: polykey_v1_secrets_secrets_pb.Secret) => void): grpc.ClientUnaryCall;
    vaultsSecretsGet(request: polykey_v1_secrets_secrets_pb.Secret, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_secrets_secrets_pb.Secret) => void): grpc.ClientUnaryCall;
    vaultsSecretsGet(request: polykey_v1_secrets_secrets_pb.Secret, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_secrets_secrets_pb.Secret) => void): grpc.ClientUnaryCall;
    vaultsSecretsRename(request: polykey_v1_secrets_secrets_pb.Rename, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsRename(request: polykey_v1_secrets_secrets_pb.Rename, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsRename(request: polykey_v1_secrets_secrets_pb.Rename, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsNew(request: polykey_v1_secrets_secrets_pb.Secret, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsNew(request: polykey_v1_secrets_secrets_pb.Secret, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsNew(request: polykey_v1_secrets_secrets_pb.Secret, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsNewDir(request: polykey_v1_secrets_secrets_pb.Directory, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsNewDir(request: polykey_v1_secrets_secrets_pb.Directory, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsNewDir(request: polykey_v1_secrets_secrets_pb.Directory, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsSecretsStat(request: polykey_v1_secrets_secrets_pb.Secret, callback: (error: grpc.ServiceError | null, response: polykey_v1_secrets_secrets_pb.Stat) => void): grpc.ClientUnaryCall;
    vaultsSecretsStat(request: polykey_v1_secrets_secrets_pb.Secret, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_secrets_secrets_pb.Stat) => void): grpc.ClientUnaryCall;
    vaultsSecretsStat(request: polykey_v1_secrets_secrets_pb.Secret, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_secrets_secrets_pb.Stat) => void): grpc.ClientUnaryCall;
    vaultsPermissionGet(request: polykey_v1_vaults_vaults_pb.Vault, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_vaults_vaults_pb.Permissions>;
    vaultsPermissionGet(request: polykey_v1_vaults_vaults_pb.Vault, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_vaults_vaults_pb.Permissions>;
    vaultsPermissionSet(request: polykey_v1_vaults_vaults_pb.Permissions, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsPermissionSet(request: polykey_v1_vaults_vaults_pb.Permissions, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsPermissionSet(request: polykey_v1_vaults_vaults_pb.Permissions, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsPermissionUnset(request: polykey_v1_vaults_vaults_pb.Permissions, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsPermissionUnset(request: polykey_v1_vaults_vaults_pb.Permissions, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsPermissionUnset(request: polykey_v1_vaults_vaults_pb.Permissions, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    vaultsVersion(request: polykey_v1_vaults_vaults_pb.Version, callback: (error: grpc.ServiceError | null, response: polykey_v1_vaults_vaults_pb.VersionResult) => void): grpc.ClientUnaryCall;
    vaultsVersion(request: polykey_v1_vaults_vaults_pb.Version, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_vaults_vaults_pb.VersionResult) => void): grpc.ClientUnaryCall;
    vaultsVersion(request: polykey_v1_vaults_vaults_pb.Version, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_vaults_vaults_pb.VersionResult) => void): grpc.ClientUnaryCall;
    vaultsLog(request: polykey_v1_vaults_vaults_pb.Log, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_vaults_vaults_pb.LogEntry>;
    vaultsLog(request: polykey_v1_vaults_vaults_pb.Log, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_vaults_vaults_pb.LogEntry>;
    vaultsScan(request: polykey_v1_nodes_nodes_pb.Node, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_vaults_vaults_pb.List>;
    vaultsScan(request: polykey_v1_nodes_nodes_pb.Node, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_vaults_vaults_pb.List>;
    identitiesAuthenticate(request: polykey_v1_identities_identities_pb.Provider, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_identities_identities_pb.AuthenticationProcess>;
    identitiesAuthenticate(request: polykey_v1_identities_identities_pb.Provider, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_identities_identities_pb.AuthenticationProcess>;
    identitiesAuthenticatedGet(request: polykey_v1_identities_identities_pb.OptionalProvider, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_identities_identities_pb.Provider>;
    identitiesAuthenticatedGet(request: polykey_v1_identities_identities_pb.OptionalProvider, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_identities_identities_pb.Provider>;
    identitiesTokenPut(request: polykey_v1_identities_identities_pb.TokenSpecific, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    identitiesTokenPut(request: polykey_v1_identities_identities_pb.TokenSpecific, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    identitiesTokenPut(request: polykey_v1_identities_identities_pb.TokenSpecific, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    identitiesTokenGet(request: polykey_v1_identities_identities_pb.Provider, callback: (error: grpc.ServiceError | null, response: polykey_v1_identities_identities_pb.Token) => void): grpc.ClientUnaryCall;
    identitiesTokenGet(request: polykey_v1_identities_identities_pb.Provider, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_identities_identities_pb.Token) => void): grpc.ClientUnaryCall;
    identitiesTokenGet(request: polykey_v1_identities_identities_pb.Provider, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_identities_identities_pb.Token) => void): grpc.ClientUnaryCall;
    identitiesTokenDelete(request: polykey_v1_identities_identities_pb.Provider, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    identitiesTokenDelete(request: polykey_v1_identities_identities_pb.Provider, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    identitiesTokenDelete(request: polykey_v1_identities_identities_pb.Provider, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    identitiesProvidersList(request: polykey_v1_utils_utils_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: polykey_v1_identities_identities_pb.Provider) => void): grpc.ClientUnaryCall;
    identitiesProvidersList(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_identities_identities_pb.Provider) => void): grpc.ClientUnaryCall;
    identitiesProvidersList(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_identities_identities_pb.Provider) => void): grpc.ClientUnaryCall;
    identitiesInfoGet(request: polykey_v1_identities_identities_pb.ProviderSearch, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_identities_identities_pb.Info>;
    identitiesInfoGet(request: polykey_v1_identities_identities_pb.ProviderSearch, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_identities_identities_pb.Info>;
    identitiesInfoConnectedGet(request: polykey_v1_identities_identities_pb.ProviderSearch, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_identities_identities_pb.Info>;
    identitiesInfoConnectedGet(request: polykey_v1_identities_identities_pb.ProviderSearch, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_identities_identities_pb.Info>;
    identitiesClaim(request: polykey_v1_identities_identities_pb.Provider, callback: (error: grpc.ServiceError | null, response: polykey_v1_identities_identities_pb.Claim) => void): grpc.ClientUnaryCall;
    identitiesClaim(request: polykey_v1_identities_identities_pb.Provider, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_identities_identities_pb.Claim) => void): grpc.ClientUnaryCall;
    identitiesClaim(request: polykey_v1_identities_identities_pb.Provider, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_identities_identities_pb.Claim) => void): grpc.ClientUnaryCall;
    gestaltsGestaltList(request: polykey_v1_utils_utils_pb.EmptyMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_gestalts_gestalts_pb.Gestalt>;
    gestaltsGestaltList(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_gestalts_gestalts_pb.Gestalt>;
    gestaltsGestaltGetByNode(request: polykey_v1_nodes_nodes_pb.Node, callback: (error: grpc.ServiceError | null, response: polykey_v1_gestalts_gestalts_pb.Graph) => void): grpc.ClientUnaryCall;
    gestaltsGestaltGetByNode(request: polykey_v1_nodes_nodes_pb.Node, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_gestalts_gestalts_pb.Graph) => void): grpc.ClientUnaryCall;
    gestaltsGestaltGetByNode(request: polykey_v1_nodes_nodes_pb.Node, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_gestalts_gestalts_pb.Graph) => void): grpc.ClientUnaryCall;
    gestaltsGestaltGetByIdentity(request: polykey_v1_identities_identities_pb.Provider, callback: (error: grpc.ServiceError | null, response: polykey_v1_gestalts_gestalts_pb.Graph) => void): grpc.ClientUnaryCall;
    gestaltsGestaltGetByIdentity(request: polykey_v1_identities_identities_pb.Provider, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_gestalts_gestalts_pb.Graph) => void): grpc.ClientUnaryCall;
    gestaltsGestaltGetByIdentity(request: polykey_v1_identities_identities_pb.Provider, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_gestalts_gestalts_pb.Graph) => void): grpc.ClientUnaryCall;
    gestaltsGestaltTrustByNode(request: polykey_v1_nodes_nodes_pb.Node, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsGestaltTrustByNode(request: polykey_v1_nodes_nodes_pb.Node, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsGestaltTrustByNode(request: polykey_v1_nodes_nodes_pb.Node, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsGestaltTrustByIdentity(request: polykey_v1_identities_identities_pb.Provider, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsGestaltTrustByIdentity(request: polykey_v1_identities_identities_pb.Provider, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsGestaltTrustByIdentity(request: polykey_v1_identities_identities_pb.Provider, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsDiscoveryByNode(request: polykey_v1_nodes_nodes_pb.Node, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsDiscoveryByNode(request: polykey_v1_nodes_nodes_pb.Node, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsDiscoveryByNode(request: polykey_v1_nodes_nodes_pb.Node, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsDiscoveryByIdentity(request: polykey_v1_identities_identities_pb.Provider, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsDiscoveryByIdentity(request: polykey_v1_identities_identities_pb.Provider, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsDiscoveryByIdentity(request: polykey_v1_identities_identities_pb.Provider, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsGetByNode(request: polykey_v1_nodes_nodes_pb.Node, callback: (error: grpc.ServiceError | null, response: polykey_v1_permissions_permissions_pb.Actions) => void): grpc.ClientUnaryCall;
    gestaltsActionsGetByNode(request: polykey_v1_nodes_nodes_pb.Node, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_permissions_permissions_pb.Actions) => void): grpc.ClientUnaryCall;
    gestaltsActionsGetByNode(request: polykey_v1_nodes_nodes_pb.Node, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_permissions_permissions_pb.Actions) => void): grpc.ClientUnaryCall;
    gestaltsActionsGetByIdentity(request: polykey_v1_identities_identities_pb.Provider, callback: (error: grpc.ServiceError | null, response: polykey_v1_permissions_permissions_pb.Actions) => void): grpc.ClientUnaryCall;
    gestaltsActionsGetByIdentity(request: polykey_v1_identities_identities_pb.Provider, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_permissions_permissions_pb.Actions) => void): grpc.ClientUnaryCall;
    gestaltsActionsGetByIdentity(request: polykey_v1_identities_identities_pb.Provider, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_permissions_permissions_pb.Actions) => void): grpc.ClientUnaryCall;
    gestaltsActionsSetByNode(request: polykey_v1_permissions_permissions_pb.ActionSet, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsSetByNode(request: polykey_v1_permissions_permissions_pb.ActionSet, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsSetByNode(request: polykey_v1_permissions_permissions_pb.ActionSet, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsSetByIdentity(request: polykey_v1_permissions_permissions_pb.ActionSet, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsSetByIdentity(request: polykey_v1_permissions_permissions_pb.ActionSet, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsSetByIdentity(request: polykey_v1_permissions_permissions_pb.ActionSet, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsUnsetByNode(request: polykey_v1_permissions_permissions_pb.ActionSet, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsUnsetByNode(request: polykey_v1_permissions_permissions_pb.ActionSet, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsUnsetByNode(request: polykey_v1_permissions_permissions_pb.ActionSet, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsUnsetByIdentity(request: polykey_v1_permissions_permissions_pb.ActionSet, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsUnsetByIdentity(request: polykey_v1_permissions_permissions_pb.ActionSet, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    gestaltsActionsUnsetByIdentity(request: polykey_v1_permissions_permissions_pb.ActionSet, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    notificationsSend(request: polykey_v1_notifications_notifications_pb.Send, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    notificationsSend(request: polykey_v1_notifications_notifications_pb.Send, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    notificationsSend(request: polykey_v1_notifications_notifications_pb.Send, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    notificationsRead(request: polykey_v1_notifications_notifications_pb.Read, callback: (error: grpc.ServiceError | null, response: polykey_v1_notifications_notifications_pb.List) => void): grpc.ClientUnaryCall;
    notificationsRead(request: polykey_v1_notifications_notifications_pb.Read, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_notifications_notifications_pb.List) => void): grpc.ClientUnaryCall;
    notificationsRead(request: polykey_v1_notifications_notifications_pb.Read, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_notifications_notifications_pb.List) => void): grpc.ClientUnaryCall;
    notificationsClear(request: polykey_v1_utils_utils_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    notificationsClear(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    notificationsClear(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
}

export class ClientServiceClient extends grpc.Client implements IClientServiceClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: Partial<grpc.ClientOptions>);
    public agentLockAll(request: polykey_v1_utils_utils_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public agentLockAll(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public agentLockAll(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public agentStatus(request: polykey_v1_utils_utils_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: polykey_v1_agent_agent_pb.InfoMessage) => void): grpc.ClientUnaryCall;
    public agentStatus(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_agent_agent_pb.InfoMessage) => void): grpc.ClientUnaryCall;
    public agentStatus(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_agent_agent_pb.InfoMessage) => void): grpc.ClientUnaryCall;
    public agentStop(request: polykey_v1_utils_utils_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public agentStop(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public agentStop(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public agentUnlock(request: polykey_v1_utils_utils_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public agentUnlock(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public agentUnlock(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public nodesAdd(request: polykey_v1_nodes_nodes_pb.NodeAdd, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public nodesAdd(request: polykey_v1_nodes_nodes_pb.NodeAdd, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public nodesAdd(request: polykey_v1_nodes_nodes_pb.NodeAdd, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public nodesPing(request: polykey_v1_nodes_nodes_pb.Node, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public nodesPing(request: polykey_v1_nodes_nodes_pb.Node, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public nodesPing(request: polykey_v1_nodes_nodes_pb.Node, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public nodesClaim(request: polykey_v1_nodes_nodes_pb.Claim, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public nodesClaim(request: polykey_v1_nodes_nodes_pb.Claim, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public nodesClaim(request: polykey_v1_nodes_nodes_pb.Claim, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public nodesFind(request: polykey_v1_nodes_nodes_pb.Node, callback: (error: grpc.ServiceError | null, response: polykey_v1_nodes_nodes_pb.NodeAddress) => void): grpc.ClientUnaryCall;
    public nodesFind(request: polykey_v1_nodes_nodes_pb.Node, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_nodes_nodes_pb.NodeAddress) => void): grpc.ClientUnaryCall;
    public nodesFind(request: polykey_v1_nodes_nodes_pb.Node, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_nodes_nodes_pb.NodeAddress) => void): grpc.ClientUnaryCall;
    public nodesGetAll(request: polykey_v1_utils_utils_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: polykey_v1_nodes_nodes_pb.NodeBuckets) => void): grpc.ClientUnaryCall;
    public nodesGetAll(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_nodes_nodes_pb.NodeBuckets) => void): grpc.ClientUnaryCall;
    public nodesGetAll(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_nodes_nodes_pb.NodeBuckets) => void): grpc.ClientUnaryCall;
    public keysKeyPairRoot(request: polykey_v1_utils_utils_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: polykey_v1_keys_keys_pb.KeyPair) => void): grpc.ClientUnaryCall;
    public keysKeyPairRoot(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_keys_keys_pb.KeyPair) => void): grpc.ClientUnaryCall;
    public keysKeyPairRoot(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_keys_keys_pb.KeyPair) => void): grpc.ClientUnaryCall;
    public keysKeyPairReset(request: polykey_v1_keys_keys_pb.Key, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public keysKeyPairReset(request: polykey_v1_keys_keys_pb.Key, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public keysKeyPairReset(request: polykey_v1_keys_keys_pb.Key, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public keysKeyPairRenew(request: polykey_v1_keys_keys_pb.Key, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public keysKeyPairRenew(request: polykey_v1_keys_keys_pb.Key, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public keysKeyPairRenew(request: polykey_v1_keys_keys_pb.Key, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public keysEncrypt(request: polykey_v1_keys_keys_pb.Crypto, callback: (error: grpc.ServiceError | null, response: polykey_v1_keys_keys_pb.Crypto) => void): grpc.ClientUnaryCall;
    public keysEncrypt(request: polykey_v1_keys_keys_pb.Crypto, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_keys_keys_pb.Crypto) => void): grpc.ClientUnaryCall;
    public keysEncrypt(request: polykey_v1_keys_keys_pb.Crypto, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_keys_keys_pb.Crypto) => void): grpc.ClientUnaryCall;
    public keysDecrypt(request: polykey_v1_keys_keys_pb.Crypto, callback: (error: grpc.ServiceError | null, response: polykey_v1_keys_keys_pb.Crypto) => void): grpc.ClientUnaryCall;
    public keysDecrypt(request: polykey_v1_keys_keys_pb.Crypto, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_keys_keys_pb.Crypto) => void): grpc.ClientUnaryCall;
    public keysDecrypt(request: polykey_v1_keys_keys_pb.Crypto, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_keys_keys_pb.Crypto) => void): grpc.ClientUnaryCall;
    public keysSign(request: polykey_v1_keys_keys_pb.Crypto, callback: (error: grpc.ServiceError | null, response: polykey_v1_keys_keys_pb.Crypto) => void): grpc.ClientUnaryCall;
    public keysSign(request: polykey_v1_keys_keys_pb.Crypto, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_keys_keys_pb.Crypto) => void): grpc.ClientUnaryCall;
    public keysSign(request: polykey_v1_keys_keys_pb.Crypto, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_keys_keys_pb.Crypto) => void): grpc.ClientUnaryCall;
    public keysVerify(request: polykey_v1_keys_keys_pb.Crypto, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public keysVerify(request: polykey_v1_keys_keys_pb.Crypto, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public keysVerify(request: polykey_v1_keys_keys_pb.Crypto, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public keysPasswordChange(request: polykey_v1_sessions_sessions_pb.Password, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public keysPasswordChange(request: polykey_v1_sessions_sessions_pb.Password, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public keysPasswordChange(request: polykey_v1_sessions_sessions_pb.Password, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public keysCertsGet(request: polykey_v1_utils_utils_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: polykey_v1_keys_keys_pb.Certificate) => void): grpc.ClientUnaryCall;
    public keysCertsGet(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_keys_keys_pb.Certificate) => void): grpc.ClientUnaryCall;
    public keysCertsGet(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_keys_keys_pb.Certificate) => void): grpc.ClientUnaryCall;
    public keysCertsChainGet(request: polykey_v1_utils_utils_pb.EmptyMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_keys_keys_pb.Certificate>;
    public keysCertsChainGet(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_keys_keys_pb.Certificate>;
    public vaultsList(request: polykey_v1_utils_utils_pb.EmptyMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_vaults_vaults_pb.List>;
    public vaultsList(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_vaults_vaults_pb.List>;
    public vaultsCreate(request: polykey_v1_vaults_vaults_pb.Vault, callback: (error: grpc.ServiceError | null, response: polykey_v1_vaults_vaults_pb.Vault) => void): grpc.ClientUnaryCall;
    public vaultsCreate(request: polykey_v1_vaults_vaults_pb.Vault, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_vaults_vaults_pb.Vault) => void): grpc.ClientUnaryCall;
    public vaultsCreate(request: polykey_v1_vaults_vaults_pb.Vault, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_vaults_vaults_pb.Vault) => void): grpc.ClientUnaryCall;
    public vaultsRename(request: polykey_v1_vaults_vaults_pb.Rename, callback: (error: grpc.ServiceError | null, response: polykey_v1_vaults_vaults_pb.Vault) => void): grpc.ClientUnaryCall;
    public vaultsRename(request: polykey_v1_vaults_vaults_pb.Rename, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_vaults_vaults_pb.Vault) => void): grpc.ClientUnaryCall;
    public vaultsRename(request: polykey_v1_vaults_vaults_pb.Rename, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_vaults_vaults_pb.Vault) => void): grpc.ClientUnaryCall;
    public vaultsDelete(request: polykey_v1_vaults_vaults_pb.Vault, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsDelete(request: polykey_v1_vaults_vaults_pb.Vault, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsDelete(request: polykey_v1_vaults_vaults_pb.Vault, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsPull(request: polykey_v1_vaults_vaults_pb.Pull, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsPull(request: polykey_v1_vaults_vaults_pb.Pull, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsPull(request: polykey_v1_vaults_vaults_pb.Pull, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsClone(request: polykey_v1_vaults_vaults_pb.Clone, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsClone(request: polykey_v1_vaults_vaults_pb.Clone, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsClone(request: polykey_v1_vaults_vaults_pb.Clone, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsList(request: polykey_v1_vaults_vaults_pb.Vault, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_secrets_secrets_pb.Secret>;
    public vaultsSecretsList(request: polykey_v1_vaults_vaults_pb.Vault, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_secrets_secrets_pb.Secret>;
    public vaultsSecretsMkdir(request: polykey_v1_vaults_vaults_pb.Mkdir, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsMkdir(request: polykey_v1_vaults_vaults_pb.Mkdir, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsMkdir(request: polykey_v1_vaults_vaults_pb.Mkdir, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsDelete(request: polykey_v1_secrets_secrets_pb.Secret, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsDelete(request: polykey_v1_secrets_secrets_pb.Secret, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsDelete(request: polykey_v1_secrets_secrets_pb.Secret, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsEdit(request: polykey_v1_secrets_secrets_pb.Secret, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsEdit(request: polykey_v1_secrets_secrets_pb.Secret, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsEdit(request: polykey_v1_secrets_secrets_pb.Secret, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsGet(request: polykey_v1_secrets_secrets_pb.Secret, callback: (error: grpc.ServiceError | null, response: polykey_v1_secrets_secrets_pb.Secret) => void): grpc.ClientUnaryCall;
    public vaultsSecretsGet(request: polykey_v1_secrets_secrets_pb.Secret, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_secrets_secrets_pb.Secret) => void): grpc.ClientUnaryCall;
    public vaultsSecretsGet(request: polykey_v1_secrets_secrets_pb.Secret, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_secrets_secrets_pb.Secret) => void): grpc.ClientUnaryCall;
    public vaultsSecretsRename(request: polykey_v1_secrets_secrets_pb.Rename, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsRename(request: polykey_v1_secrets_secrets_pb.Rename, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsRename(request: polykey_v1_secrets_secrets_pb.Rename, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsNew(request: polykey_v1_secrets_secrets_pb.Secret, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsNew(request: polykey_v1_secrets_secrets_pb.Secret, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsNew(request: polykey_v1_secrets_secrets_pb.Secret, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsNewDir(request: polykey_v1_secrets_secrets_pb.Directory, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsNewDir(request: polykey_v1_secrets_secrets_pb.Directory, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsNewDir(request: polykey_v1_secrets_secrets_pb.Directory, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsSecretsStat(request: polykey_v1_secrets_secrets_pb.Secret, callback: (error: grpc.ServiceError | null, response: polykey_v1_secrets_secrets_pb.Stat) => void): grpc.ClientUnaryCall;
    public vaultsSecretsStat(request: polykey_v1_secrets_secrets_pb.Secret, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_secrets_secrets_pb.Stat) => void): grpc.ClientUnaryCall;
    public vaultsSecretsStat(request: polykey_v1_secrets_secrets_pb.Secret, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_secrets_secrets_pb.Stat) => void): grpc.ClientUnaryCall;
    public vaultsPermissionGet(request: polykey_v1_vaults_vaults_pb.Vault, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_vaults_vaults_pb.Permissions>;
    public vaultsPermissionGet(request: polykey_v1_vaults_vaults_pb.Vault, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_vaults_vaults_pb.Permissions>;
    public vaultsPermissionSet(request: polykey_v1_vaults_vaults_pb.Permissions, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsPermissionSet(request: polykey_v1_vaults_vaults_pb.Permissions, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsPermissionSet(request: polykey_v1_vaults_vaults_pb.Permissions, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsPermissionUnset(request: polykey_v1_vaults_vaults_pb.Permissions, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsPermissionUnset(request: polykey_v1_vaults_vaults_pb.Permissions, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsPermissionUnset(request: polykey_v1_vaults_vaults_pb.Permissions, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.StatusMessage) => void): grpc.ClientUnaryCall;
    public vaultsVersion(request: polykey_v1_vaults_vaults_pb.Version, callback: (error: grpc.ServiceError | null, response: polykey_v1_vaults_vaults_pb.VersionResult) => void): grpc.ClientUnaryCall;
    public vaultsVersion(request: polykey_v1_vaults_vaults_pb.Version, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_vaults_vaults_pb.VersionResult) => void): grpc.ClientUnaryCall;
    public vaultsVersion(request: polykey_v1_vaults_vaults_pb.Version, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_vaults_vaults_pb.VersionResult) => void): grpc.ClientUnaryCall;
    public vaultsLog(request: polykey_v1_vaults_vaults_pb.Log, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_vaults_vaults_pb.LogEntry>;
    public vaultsLog(request: polykey_v1_vaults_vaults_pb.Log, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_vaults_vaults_pb.LogEntry>;
    public vaultsScan(request: polykey_v1_nodes_nodes_pb.Node, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_vaults_vaults_pb.List>;
    public vaultsScan(request: polykey_v1_nodes_nodes_pb.Node, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_vaults_vaults_pb.List>;
    public identitiesAuthenticate(request: polykey_v1_identities_identities_pb.Provider, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_identities_identities_pb.AuthenticationProcess>;
    public identitiesAuthenticate(request: polykey_v1_identities_identities_pb.Provider, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_identities_identities_pb.AuthenticationProcess>;
    public identitiesAuthenticatedGet(request: polykey_v1_identities_identities_pb.OptionalProvider, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_identities_identities_pb.Provider>;
    public identitiesAuthenticatedGet(request: polykey_v1_identities_identities_pb.OptionalProvider, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_identities_identities_pb.Provider>;
    public identitiesTokenPut(request: polykey_v1_identities_identities_pb.TokenSpecific, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public identitiesTokenPut(request: polykey_v1_identities_identities_pb.TokenSpecific, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public identitiesTokenPut(request: polykey_v1_identities_identities_pb.TokenSpecific, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public identitiesTokenGet(request: polykey_v1_identities_identities_pb.Provider, callback: (error: grpc.ServiceError | null, response: polykey_v1_identities_identities_pb.Token) => void): grpc.ClientUnaryCall;
    public identitiesTokenGet(request: polykey_v1_identities_identities_pb.Provider, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_identities_identities_pb.Token) => void): grpc.ClientUnaryCall;
    public identitiesTokenGet(request: polykey_v1_identities_identities_pb.Provider, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_identities_identities_pb.Token) => void): grpc.ClientUnaryCall;
    public identitiesTokenDelete(request: polykey_v1_identities_identities_pb.Provider, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public identitiesTokenDelete(request: polykey_v1_identities_identities_pb.Provider, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public identitiesTokenDelete(request: polykey_v1_identities_identities_pb.Provider, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public identitiesProvidersList(request: polykey_v1_utils_utils_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: polykey_v1_identities_identities_pb.Provider) => void): grpc.ClientUnaryCall;
    public identitiesProvidersList(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_identities_identities_pb.Provider) => void): grpc.ClientUnaryCall;
    public identitiesProvidersList(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_identities_identities_pb.Provider) => void): grpc.ClientUnaryCall;
    public identitiesInfoGet(request: polykey_v1_identities_identities_pb.ProviderSearch, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_identities_identities_pb.Info>;
    public identitiesInfoGet(request: polykey_v1_identities_identities_pb.ProviderSearch, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_identities_identities_pb.Info>;
    public identitiesInfoConnectedGet(request: polykey_v1_identities_identities_pb.ProviderSearch, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_identities_identities_pb.Info>;
    public identitiesInfoConnectedGet(request: polykey_v1_identities_identities_pb.ProviderSearch, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_identities_identities_pb.Info>;
    public identitiesClaim(request: polykey_v1_identities_identities_pb.Provider, callback: (error: grpc.ServiceError | null, response: polykey_v1_identities_identities_pb.Claim) => void): grpc.ClientUnaryCall;
    public identitiesClaim(request: polykey_v1_identities_identities_pb.Provider, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_identities_identities_pb.Claim) => void): grpc.ClientUnaryCall;
    public identitiesClaim(request: polykey_v1_identities_identities_pb.Provider, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_identities_identities_pb.Claim) => void): grpc.ClientUnaryCall;
    public gestaltsGestaltList(request: polykey_v1_utils_utils_pb.EmptyMessage, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_gestalts_gestalts_pb.Gestalt>;
    public gestaltsGestaltList(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<polykey_v1_gestalts_gestalts_pb.Gestalt>;
    public gestaltsGestaltGetByNode(request: polykey_v1_nodes_nodes_pb.Node, callback: (error: grpc.ServiceError | null, response: polykey_v1_gestalts_gestalts_pb.Graph) => void): grpc.ClientUnaryCall;
    public gestaltsGestaltGetByNode(request: polykey_v1_nodes_nodes_pb.Node, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_gestalts_gestalts_pb.Graph) => void): grpc.ClientUnaryCall;
    public gestaltsGestaltGetByNode(request: polykey_v1_nodes_nodes_pb.Node, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_gestalts_gestalts_pb.Graph) => void): grpc.ClientUnaryCall;
    public gestaltsGestaltGetByIdentity(request: polykey_v1_identities_identities_pb.Provider, callback: (error: grpc.ServiceError | null, response: polykey_v1_gestalts_gestalts_pb.Graph) => void): grpc.ClientUnaryCall;
    public gestaltsGestaltGetByIdentity(request: polykey_v1_identities_identities_pb.Provider, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_gestalts_gestalts_pb.Graph) => void): grpc.ClientUnaryCall;
    public gestaltsGestaltGetByIdentity(request: polykey_v1_identities_identities_pb.Provider, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_gestalts_gestalts_pb.Graph) => void): grpc.ClientUnaryCall;
    public gestaltsGestaltTrustByNode(request: polykey_v1_nodes_nodes_pb.Node, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsGestaltTrustByNode(request: polykey_v1_nodes_nodes_pb.Node, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsGestaltTrustByNode(request: polykey_v1_nodes_nodes_pb.Node, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsGestaltTrustByIdentity(request: polykey_v1_identities_identities_pb.Provider, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsGestaltTrustByIdentity(request: polykey_v1_identities_identities_pb.Provider, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsGestaltTrustByIdentity(request: polykey_v1_identities_identities_pb.Provider, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsDiscoveryByNode(request: polykey_v1_nodes_nodes_pb.Node, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsDiscoveryByNode(request: polykey_v1_nodes_nodes_pb.Node, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsDiscoveryByNode(request: polykey_v1_nodes_nodes_pb.Node, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsDiscoveryByIdentity(request: polykey_v1_identities_identities_pb.Provider, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsDiscoveryByIdentity(request: polykey_v1_identities_identities_pb.Provider, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsDiscoveryByIdentity(request: polykey_v1_identities_identities_pb.Provider, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsGetByNode(request: polykey_v1_nodes_nodes_pb.Node, callback: (error: grpc.ServiceError | null, response: polykey_v1_permissions_permissions_pb.Actions) => void): grpc.ClientUnaryCall;
    public gestaltsActionsGetByNode(request: polykey_v1_nodes_nodes_pb.Node, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_permissions_permissions_pb.Actions) => void): grpc.ClientUnaryCall;
    public gestaltsActionsGetByNode(request: polykey_v1_nodes_nodes_pb.Node, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_permissions_permissions_pb.Actions) => void): grpc.ClientUnaryCall;
    public gestaltsActionsGetByIdentity(request: polykey_v1_identities_identities_pb.Provider, callback: (error: grpc.ServiceError | null, response: polykey_v1_permissions_permissions_pb.Actions) => void): grpc.ClientUnaryCall;
    public gestaltsActionsGetByIdentity(request: polykey_v1_identities_identities_pb.Provider, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_permissions_permissions_pb.Actions) => void): grpc.ClientUnaryCall;
    public gestaltsActionsGetByIdentity(request: polykey_v1_identities_identities_pb.Provider, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_permissions_permissions_pb.Actions) => void): grpc.ClientUnaryCall;
    public gestaltsActionsSetByNode(request: polykey_v1_permissions_permissions_pb.ActionSet, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsSetByNode(request: polykey_v1_permissions_permissions_pb.ActionSet, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsSetByNode(request: polykey_v1_permissions_permissions_pb.ActionSet, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsSetByIdentity(request: polykey_v1_permissions_permissions_pb.ActionSet, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsSetByIdentity(request: polykey_v1_permissions_permissions_pb.ActionSet, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsSetByIdentity(request: polykey_v1_permissions_permissions_pb.ActionSet, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsUnsetByNode(request: polykey_v1_permissions_permissions_pb.ActionSet, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsUnsetByNode(request: polykey_v1_permissions_permissions_pb.ActionSet, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsUnsetByNode(request: polykey_v1_permissions_permissions_pb.ActionSet, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsUnsetByIdentity(request: polykey_v1_permissions_permissions_pb.ActionSet, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsUnsetByIdentity(request: polykey_v1_permissions_permissions_pb.ActionSet, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public gestaltsActionsUnsetByIdentity(request: polykey_v1_permissions_permissions_pb.ActionSet, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public notificationsSend(request: polykey_v1_notifications_notifications_pb.Send, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public notificationsSend(request: polykey_v1_notifications_notifications_pb.Send, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public notificationsSend(request: polykey_v1_notifications_notifications_pb.Send, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public notificationsRead(request: polykey_v1_notifications_notifications_pb.Read, callback: (error: grpc.ServiceError | null, response: polykey_v1_notifications_notifications_pb.List) => void): grpc.ClientUnaryCall;
    public notificationsRead(request: polykey_v1_notifications_notifications_pb.Read, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_notifications_notifications_pb.List) => void): grpc.ClientUnaryCall;
    public notificationsRead(request: polykey_v1_notifications_notifications_pb.Read, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_notifications_notifications_pb.List) => void): grpc.ClientUnaryCall;
    public notificationsClear(request: polykey_v1_utils_utils_pb.EmptyMessage, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public notificationsClear(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
    public notificationsClear(request: polykey_v1_utils_utils_pb.EmptyMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: polykey_v1_utils_utils_pb.EmptyMessage) => void): grpc.ClientUnaryCall;
}
