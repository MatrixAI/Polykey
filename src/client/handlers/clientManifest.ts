import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type {
  ActionsListMessage,
  AddressMessage,
  AuthProcessMessage,
  CertMessage,
  ClaimIdMessage,
  ClaimNodeMessage,
  DataMessage,
  DecryptMessage,
  GestaltMessage,
  IdentityInfoMessage,
  IdentityMessage,
  KeyPairMessage,
  NodeConnectionMessage,
  NodeIdMessage,
  NodesAddMessage,
  NodesGetMessage,
  NotificationMessage,
  NotificationReadMessage,
  PasswordMessage,
  ProviderSearchMessage,
  PublicKeyMessage,
  SetIdentityActionMessage,
  SetNodeActionMessage,
  SignatureMessage,
  StatusResultMessage,
  SuccessMessage,
  TokenMessage,
  VerifySignatureMessage,
  CloneMessage,
  ContentMessage,
  LogEntryMessage,
  NotificationSendMessage,
  PermissionSetMessage,
  SecretContentMessage,
  SecretDirMessage,
  SecretIdentifierMessage,
  SecretMkdirMessage,
  SecretNameMessage,
  SecretRenameMessage,
  SecretStatMessage,
  VaultIdentifierMessage,
  VaultIdMessage,
  VaultListMessage,
  VaultNameMessage,
  VaultPermissionMessage,
  VaultsLatestVersionMessage,
  VaultsLogMessage,
  VaultsPullMessage,
  VaultsRenameMessage,
  VaultsScanMessage,
  VaultsVersionMessage,
} from './types';
import type { GestaltAction } from '../../gestalts/types';
import { ServerCaller, UnaryCaller } from '@matrixai/rpc';

const agentLockAll = new UnaryCaller<
  ClientRPCRequestParams,
  ClientRPCResponseResult
>();

const agentStatus = new UnaryCaller<
  ClientRPCRequestParams,
  ClientRPCResponseResult<StatusResultMessage>
>();

const agentStop = new UnaryCaller<
  ClientRPCRequestParams,
  ClientRPCResponseResult
>();

const agentUnlock = new UnaryCaller<
  ClientRPCRequestParams,
  ClientRPCResponseResult
>();

const gestaltsActionsGetByIdentity = new UnaryCaller<
  ClientRPCRequestParams<IdentityMessage>,
  ClientRPCResponseResult<{
    actionsList: Array<GestaltAction>;
  }>
>();

const gestaltsActionsGetByNode = new UnaryCaller<
  ClientRPCRequestParams<NodeIdMessage>,
  ClientRPCResponseResult<ActionsListMessage>
>();

const gestaltsActionsSetByIdentity = new UnaryCaller<
  ClientRPCRequestParams<SetIdentityActionMessage>,
  ClientRPCResponseResult
>();

const gestaltsActionsSetByNode = new UnaryCaller<
  ClientRPCRequestParams<SetNodeActionMessage>,
  ClientRPCResponseResult
>();

const gestaltsActionsUnsetByIdentity = new UnaryCaller<
  ClientRPCRequestParams<SetIdentityActionMessage>,
  ClientRPCResponseResult
>();

const gestaltsActionsUnsetByNode = new UnaryCaller<
  ClientRPCRequestParams<SetNodeActionMessage>,
  ClientRPCResponseResult
>();

const gestaltsDiscoveryByIdentity = new UnaryCaller<
  ClientRPCRequestParams<IdentityMessage>,
  ClientRPCResponseResult
>();

const gestaltsDiscoveryByNode = new UnaryCaller<
  ClientRPCRequestParams<NodeIdMessage>,
  ClientRPCResponseResult
>();

const gestaltsGestaltGetByIdentity = new UnaryCaller<
  ClientRPCRequestParams<IdentityMessage>,
  ClientRPCResponseResult<GestaltMessage>
>();

const gestaltsGestaltGetByNode = new UnaryCaller<
  ClientRPCRequestParams<NodeIdMessage>,
  ClientRPCResponseResult<GestaltMessage>
>();

const gestaltsGestaltList = new ServerCaller<
  ClientRPCRequestParams,
  ClientRPCResponseResult<GestaltMessage>
>();

const gestaltsGestaltTrustByIdentity = new UnaryCaller<
  ClientRPCRequestParams<IdentityMessage>,
  ClientRPCResponseResult
>();

const gestaltsGestaltTrustByNode = new UnaryCaller<
  ClientRPCRequestParams<NodeIdMessage>,
  ClientRPCResponseResult
>();

const identitiesAuthenticate = new ServerCaller<
  ClientRPCRequestParams<{
    providerId: string;
  }>,
  ClientRPCResponseResult<AuthProcessMessage>
>();

const identitiesAuthenticatedGet = new ServerCaller<
  ClientRPCRequestParams<{
    providerId?: string;
  }>,
  ClientRPCResponseResult<IdentityMessage>
>();

const identitiesClaim = new UnaryCaller<
  ClientRPCRequestParams<IdentityMessage>,
  ClientRPCResponseResult<ClaimIdMessage>
>();

const identitiesInfoConnectedGet = new ServerCaller<
  ClientRPCRequestParams<ProviderSearchMessage>,
  ClientRPCResponseResult<IdentityInfoMessage>
>();

const identitiesInfoGet = new ServerCaller<
  ClientRPCRequestParams<ProviderSearchMessage>,
  ClientRPCResponseResult<IdentityInfoMessage>
>();

const identitiesInvite = new UnaryCaller<
  ClientRPCRequestParams<ClaimNodeMessage>,
  ClientRPCResponseResult
>();

const identitiesProvidersList = new UnaryCaller<
  ClientRPCRequestParams,
  ClientRPCResponseResult<{
    providerIds: Array<string>;
  }>
>();

const identitiesTokenDelete = new UnaryCaller<
  ClientRPCRequestParams<IdentityMessage>,
  ClientRPCResponseResult
>();

const identitiesTokenGet = new UnaryCaller<
  ClientRPCRequestParams<IdentityMessage>,
  ClientRPCResponseResult<Partial<TokenMessage>>
>();

const identitiesTokenPut = new UnaryCaller<
  ClientRPCRequestParams<IdentityMessage & TokenMessage>,
  ClientRPCResponseResult
>();

const keysCertsChainGet = new ServerCaller<
  ClientRPCRequestParams,
  ClientRPCResponseResult<CertMessage>
>();

const keysCertsGet = new UnaryCaller<
  ClientRPCRequestParams,
  ClientRPCResponseResult<CertMessage>
>();

const keysDecrypt = new UnaryCaller<
  ClientRPCRequestParams<DataMessage>,
  ClientRPCResponseResult<DataMessage>
>();

const keysEncrypt = new UnaryCaller<
  ClientRPCRequestParams<DecryptMessage>,
  ClientRPCResponseResult<DataMessage>
>();

const keysKeyPair = new UnaryCaller<
  ClientRPCRequestParams<PasswordMessage>,
  ClientRPCResponseResult<KeyPairMessage>
>();

const keysKeyPairRenew = new UnaryCaller<
  ClientRPCRequestParams<PasswordMessage>,
  ClientRPCResponseResult
>();

const keysKeyPairReset = new UnaryCaller<
  ClientRPCRequestParams<PasswordMessage>,
  ClientRPCResponseResult
>();

const keysPasswordChange = new UnaryCaller<
  ClientRPCRequestParams<PasswordMessage>,
  ClientRPCResponseResult
>();

const keysPublicKey = new UnaryCaller<
  ClientRPCRequestParams,
  ClientRPCResponseResult<PublicKeyMessage>
>();

const keysSign = new UnaryCaller<
  ClientRPCRequestParams<DataMessage>,
  ClientRPCResponseResult<SignatureMessage>
>();

const keysVerify = new UnaryCaller<
  ClientRPCRequestParams<VerifySignatureMessage>,
  ClientRPCResponseResult<SuccessMessage>
>();

const nodesAdd = new UnaryCaller<
  ClientRPCRequestParams<NodesAddMessage>,
  ClientRPCResponseResult
>();

const nodesClaim = new UnaryCaller<
  ClientRPCRequestParams<ClaimNodeMessage>,
  ClientRPCResponseResult<SuccessMessage>
>();

const nodesFind = new UnaryCaller<
  ClientRPCRequestParams<NodeIdMessage>,
  ClientRPCResponseResult<AddressMessage>
>();

const nodesGetAll = new ServerCaller<
  ClientRPCRequestParams,
  ClientRPCResponseResult<NodesGetMessage>
>();

const nodesListConnections = new ServerCaller<
  ClientRPCRequestParams,
  ClientRPCResponseResult<NodeConnectionMessage>
>();

const nodesPing = new UnaryCaller<
  ClientRPCRequestParams<NodeIdMessage>,
  ClientRPCResponseResult<SuccessMessage>
>();

const notificationsClear = new UnaryCaller<
  ClientRPCRequestParams,
  ClientRPCResponseResult
>();

const notificationsRead = new ServerCaller<
  ClientRPCRequestParams<NotificationReadMessage>,
  ClientRPCResponseResult<NotificationMessage>
>();

const notificationsSend = new UnaryCaller<
  ClientRPCRequestParams<NotificationSendMessage>,
  ClientRPCResponseResult
>();

const vaultsClone = new UnaryCaller<
  ClientRPCRequestParams<CloneMessage>,
  ClientRPCResponseResult<SuccessMessage>
>();

const vaultsCreate = new UnaryCaller<
  ClientRPCRequestParams<VaultNameMessage>,
  ClientRPCResponseResult<VaultIdMessage>
>();

const vaultsDelete = new UnaryCaller<
  ClientRPCRequestParams<VaultIdentifierMessage>,
  ClientRPCResponseResult<SuccessMessage>
>();

const vaultsList = new ServerCaller<
  ClientRPCRequestParams,
  ClientRPCResponseResult<VaultListMessage>
>();

const vaultsLog = new ServerCaller<
  ClientRPCRequestParams<VaultsLogMessage>,
  ClientRPCResponseResult<LogEntryMessage>
>();

const vaultsPermissionGet = new ServerCaller<
  ClientRPCRequestParams<VaultIdentifierMessage>,
  ClientRPCResponseResult<VaultPermissionMessage>
>();

const vaultsPermissionSet = new UnaryCaller<
  ClientRPCRequestParams<PermissionSetMessage>,
  ClientRPCResponseResult<SuccessMessage>
>();

const vaultsPermissionUnset = new UnaryCaller<
  ClientRPCRequestParams<PermissionSetMessage>,
  ClientRPCResponseResult<SuccessMessage>
>();

const vaultsPull = new UnaryCaller<
  ClientRPCRequestParams<VaultsPullMessage>,
  ClientRPCResponseResult<SuccessMessage>
>();

const vaultsRename = new UnaryCaller<
  ClientRPCRequestParams<VaultsRenameMessage>,
  ClientRPCResponseResult<VaultIdMessage>
>();

const vaultsScan = new ServerCaller<
  ClientRPCRequestParams<NodeIdMessage>,
  ClientRPCResponseResult<VaultsScanMessage>
>();

const vaultsSecretsDelete = new UnaryCaller<
  ClientRPCRequestParams<SecretIdentifierMessage>,
  ClientRPCResponseResult<SuccessMessage>
>();

const vaultsSecretsEdit = new UnaryCaller<
  ClientRPCRequestParams<SecretContentMessage>,
  ClientRPCResponseResult<SuccessMessage>
>();

const vaultsSecretsGet = new UnaryCaller<
  ClientRPCRequestParams<SecretIdentifierMessage>,
  ClientRPCResponseResult<ContentMessage>
>();

const vaultsSecretsList = new ServerCaller<
  ClientRPCRequestParams<VaultIdentifierMessage>,
  ClientRPCResponseResult<SecretNameMessage>
>();

const vaultsSecretsMkdir = new UnaryCaller<
  ClientRPCRequestParams<SecretMkdirMessage>,
  ClientRPCResponseResult<SuccessMessage>
>();

const vaultsSecretsNew = new UnaryCaller<
  ClientRPCRequestParams<SecretContentMessage>,
  ClientRPCResponseResult<SuccessMessage>
>();

const vaultsSecretsNewDir = new UnaryCaller<
  ClientRPCRequestParams<SecretDirMessage>,
  ClientRPCResponseResult<SuccessMessage>
>();

const vaultsSecretsRename = new UnaryCaller<
  ClientRPCRequestParams<SecretRenameMessage>,
  ClientRPCResponseResult<SuccessMessage>
>();

const vaultsSecretsStat = new UnaryCaller<
  ClientRPCRequestParams<SecretIdentifierMessage>,
  ClientRPCResponseResult<SecretStatMessage>
>();

const vaultsVersion = new UnaryCaller<
  ClientRPCRequestParams<VaultsVersionMessage>,
  ClientRPCResponseResult<VaultsLatestVersionMessage>
>();

/**
 * All the client caller definitions for the ClientClient RPC.
 * Used by the RPCClient to register callers and enforce types.
 *
 * No type used here, it will override type inference.
 */
const clientManifest = {
  agentLockAll,
  agentStatus,
  agentStop,
  agentUnlock,
  gestaltsActionsGetByIdentity,
  gestaltsActionsGetByNode,
  gestaltsActionsSetByIdentity,
  gestaltsActionsSetByNode,
  gestaltsActionsUnsetByIdentity,
  gestaltsActionsUnsetByNode,
  gestaltsDiscoveryByIdentity,
  gestaltsDiscoveryByNode,
  gestaltsGestaltGetByIdentity,
  gestaltsGestaltGetByNode,
  gestaltsGestaltList,
  gestaltsGestaltTrustByIdentity,
  gestaltsGestaltTrustByNode,
  identitiesAuthenticate,
  identitiesAuthenticatedGet,
  identitiesClaim,
  identitiesInfoConnectedGet,
  identitiesInfoGet,
  identitiesInvite,
  identitiesProvidersList,
  identitiesTokenDelete,
  identitiesTokenGet,
  identitiesTokenPut,
  keysCertsChainGet,
  keysCertsGet,
  keysDecrypt,
  keysEncrypt,
  keysKeyPair,
  keysKeyPairRenew,
  keysKeyPairReset,
  keysPasswordChange,
  keysPublicKey,
  keysSign,
  keysVerify,
  nodesAdd,
  nodesClaim,
  nodesFind,
  nodesGetAll,
  nodesListConnections,
  nodesPing,
  notificationsClear,
  notificationsRead,
  notificationsSend,
  vaultsClone,
  vaultsCreate,
  vaultsDelete,
  vaultsList,
  vaultsLog,
  vaultsPermissionGet,
  vaultsPermissionSet,
  vaultsPermissionUnset,
  vaultsPull,
  vaultsRename,
  vaultsScan,
  vaultsSecretsDelete,
  vaultsSecretsEdit,
  vaultsSecretsGet,
  vaultsSecretsList,
  vaultsSecretsMkdir,
  vaultsSecretsNew,
  vaultsSecretsNewDir,
  vaultsSecretsRename,
  vaultsSecretsStat,
  vaultsVersion,
};

export {
  clientManifest,
  agentLockAll,
  agentStatus,
  agentStop,
  agentUnlock,
  gestaltsActionsGetByIdentity,
  gestaltsActionsGetByNode,
  gestaltsActionsSetByIdentity,
  gestaltsActionsSetByNode,
  gestaltsActionsUnsetByIdentity,
  gestaltsActionsUnsetByNode,
  gestaltsDiscoveryByIdentity,
  gestaltsDiscoveryByNode,
  gestaltsGestaltGetByIdentity,
  gestaltsGestaltGetByNode,
  gestaltsGestaltList,
  gestaltsGestaltTrustByIdentity,
  gestaltsGestaltTrustByNode,
  identitiesAuthenticate,
  identitiesAuthenticatedGet,
  identitiesClaim,
  identitiesInfoConnectedGet,
  identitiesInfoGet,
  identitiesInvite,
  identitiesProvidersList,
  identitiesTokenDelete,
  identitiesTokenGet,
  identitiesTokenPut,
  keysCertsChainGet,
  keysCertsGet,
  keysDecrypt,
  keysEncrypt,
  keysKeyPair,
  keysKeyPairRenew,
  keysKeyPairReset,
  keysPasswordChange,
  keysPublicKey,
  keysSign,
  keysVerify,
  nodesAdd,
  nodesClaim,
  nodesFind,
  nodesGetAll,
  nodesListConnections,
  nodesPing,
  notificationsClear,
  notificationsRead,
  notificationsSend,
  vaultsClone,
  vaultsCreate,
  vaultsDelete,
  vaultsList,
  vaultsLog,
  vaultsPermissionGet,
  vaultsPermissionSet,
  vaultsPermissionUnset,
  vaultsPull,
  vaultsRename,
  vaultsScan,
  vaultsSecretsDelete,
  vaultsSecretsEdit,
  vaultsSecretsGet,
  vaultsSecretsList,
  vaultsSecretsMkdir,
  vaultsSecretsNew,
  vaultsSecretsNewDir,
  vaultsSecretsRename,
  vaultsSecretsStat,
  vaultsVersion,
};
