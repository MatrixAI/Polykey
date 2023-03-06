import type Logger from '@matrixai/logger';
import type SessionManager from '../../sessions/SessionManager';
import type KeyRing from '../../keys/KeyRing';
import type CertManager from '../../keys/CertManager';
import type PolykeyAgent from '../../PolykeyAgent';
import type { DB } from '@matrixai/db';
import type GestaltGraph from '../../gestalts/GestaltGraph';
import type Discovery from 'discovery/Discovery';
import type IdentitiesManager from 'identities/IdentitiesManager';
import type { NotificationsManager } from 'notifications/index';
import type ACL from 'acl/ACL';
import type NodeManager from '../../nodes/NodeManager';
import type NodeConnectionManager from '../../nodes/NodeConnectionManager';
import type NodeGraph from '../../nodes/NodeGraph';
import type VaultManager from '../../vaults/VaultManager';
import { keysSign, KeysSignHandler } from 'clientRPC/handlers/keysSign';
import { keysVerify, KeysVerifyHandler } from 'clientRPC/handlers/keysVerify';
import { vaultsClone, VaultsCloneHandler } from './vaultsClone';
import { vaultsCreate, VaultsCreatehandler } from './vaultsCreate';
import { vaultsDelete, VaultsDeleteHandler } from './vaultsDelete';
import { vaultsList, VaultsListHandler } from './vaultsList';
import { vaultsLog, VaultsLogHandler } from './vaultsLog';
import {
  VaultsPermissionGetHandler,
  vaultsPermissionGet,
} from './vaultsPermissionGet';
import {
  vaultsPermissionSet,
  VaultsPermissionSetHandler,
} from './vaultsPermissionSet';
import {
  vaultsPermissionUnset,
  VaultsPermissionUnsetHandler,
} from './vaultsPermissionUnset';
import { nodesAdd, NodesAddHandler } from './nodesAdd';
import { nodesClaim, NodesClaimHandler } from './nodesClaim';
import { nodesFind, NodesFindHandler } from './nodesFind';
import { nodesGetAll, NodesGetAllHandler } from './nodesGetAll';
import {
  nodesListConnections,
  NodesListConnectionsHandler,
} from './nodesListConnections';
import { nodesPing, NodesPingHandler } from './nodesPing';
import {
  gestaltsActionsGetByIdentity,
  GestaltsActionsGetByIdentityHandler,
} from './gestaltsActionsGetByIdentity';
import {
  gestaltsActionsGetByNode,
  GestaltsActionsGetByNodeHandler,
} from './gestaltsActionsGetByNode';
import {
  gestaltsActionsSetByIdentity,
  GestaltsActionsSetByIdentityHandler,
} from './gestaltsActionsSetByIdentity';
import {
  gestaltsActionsSetByNode,
  GestaltsActionsSetByNodeHandler,
} from './gestaltsActionsSetByNode';
import {
  gestaltsActionsUnsetByIdentity,
  GestaltsActionsUnsetByIdentityHandler,
} from './gestaltsActionsUnsetByIdentity';
import {
  gestaltsActionsUnsetByNode,
  GestaltsActionsUnsetByNodeHandler,
} from './gestaltsActionsUnsetByNode';
import {
  gestaltsDiscoveryByIdentity,
  GestaltsDiscoveryByIdentityHandler,
} from './gestaltsDiscoveryByIdentity';
import {
  gestaltsDiscoveryByNode,
  GestaltsDiscoveryByNodeHandler,
} from './gestaltsDiscoveryByNode';
import {
  gestaltsGestaltGetByIdentity,
  GestaltsGestaltGetByIdentityHandler,
} from './gestaltsGestaltGetByIdentity';
import {
  gestaltsGestaltGetByNode,
  GestaltsGestaltGetByNodeHandler,
} from './gestaltsGestaltGetByNode';
import {
  gestaltsGestaltList,
  GestaltsGestaltListHandler,
} from './gestaltsGestaltList';
import {
  gestaltsGestaltTrustByIdentity,
  GestaltsGestaltTrustByIdentityHandler,
} from './gestaltsGestaltTrustByIdentity';
import {
  gestaltsGestaltTrustByNode,
  GestaltsGestaltTrustByNodeHandler,
} from './gestaltsGestaltTrustByNode';
import {
  identitiesAuthenticate,
  IdentitiesAuthenticateHandler,
} from './identitiesAuthenticate';
import {
  identitiesAuthenticatedGet,
  IdentitiesAuthenticatedGetHandler,
} from './identitiesAuthenticatedGet';
import { identitiesClaim, IdentitiesClaimHandler } from './identitiesClaim';
import { agentStatus, AgentStatusHandler } from './agentStatus';
import { agentStop, AgentStopHandler } from './agentStop';
import { agentUnlock, AgentUnlockHandler } from './agentUnlock';
import { agentLockAll, AgentLockAllHandler } from './agentLockAll';
import {
  identitiesInfoGet,
  IdentitiesInfoGetHandler,
} from './identitiesInfoGet';
import {
  identitiesInfoConnectedGet,
  IdentitiesInfoConnectedGetHandler,
} from './identitiesInfoConnectedGet';
import { identitiesInvite, IdentitiesInviteHandler } from './identitiesInvite';
import {
  identitiesProvidersList,
  IdentitiesProvidersListHandler,
} from './identitiesProvidersList';
import {
  identitiesTokenDelete,
  IdentitiesTokenDeleteHandler,
} from './identitiesTokenDelete';
import {
  identitiesTokenGet,
  IdentitiesTokenGetHandler,
} from './identitiesTokenGet';
import {
  identitiesTokenPut,
  IdentitiesTokenPutHandler,
} from './identitiesTokenPut';
import {
  KeysCertsChainGetHandler,
  keysCertsChainGet,
} from './keysCertsChainGet';
import { keysCertsGet, KeysCertsGetHandler } from './keysCertsGet';
import { keysDecrypt, KeysDecryptHandler } from './keysDecrypt';
import { keysEncrypt, KeysEncryptHandler } from './keysEncrypt';
import { keysKeyPair, KeysKeyPairHandler } from './keysKeyPair';
import { keysKeyPairRenew, KeysKeyPairRenewHandler } from './keysKeyPairRenew';
import { keysKeyPairReset, KeysKeyPairResethandler } from './keysKeyPairReset';
import {
  keysPasswordChange,
  KeysPasswordChangeHandler,
} from './keysPasswordChange';
import { keysPublicKey, KeysPublicKeyHandler } from './keysPublicKey';
import {
  notificationsClear,
  NotificationsClearHandler,
} from './notificationsClear';
import {
  notificationsRead,
  NotificationsReadHandler,
} from './notificationsRead';
import {
  notificationsSend,
  NotificationsSendHandler,
} from './notificationsSend';
import { vaultsPull, VaultsPullHandler } from './vaultsPull';
import { vaultsRename, VaultsRenameHandler } from './vaultsRename';
import { vaultsScan, VaultsScanHandler } from './vaultsScan';
import {
  vaultsSecretsDelete,
  VaultsSecretsDeleteHandler,
} from './vaultsSecretsDelete';
import {
  vaultsSecretsEdit,
  VaultsSecretsEditHandler,
} from './vaultsSecretsEdit';
import { vaultsSecretsGet, VaultsSecretsGetHandler } from './vaultsSecretsGet';
import {
  vaultsSecretsList,
  VaultsSecretsListHandler,
} from './vaultsSecretsList';
import {
  vaultsSecretsMkdir,
  VaultsSecretsMkdirHandler,
} from './vaultsSecretsMkdir';
import { vaultsSecretsNew, VaultsSecretsNewHandler } from './vaultsSecretsNew';
import {
  vaultsSecretsNewDir,
  VaultsSecretsNewDirHandler,
} from './vaultsSecretsNewDir';
import {
  vaultsSecretsRename,
  VaultsSecretsRenameHandler,
} from './vaultsSecretsRename';
import {
  vaultsSecretsStat,
  VaultsSecretsStatHandler,
} from './vaultsSecretsStat';
import { vaultsVersion, VaultsVersionHandler } from './vaultsVersion';

const serverManifest = (container: {
  pkAgent: PolykeyAgent;
  keyRing: KeyRing;
  certManager: CertManager;
  db: DB;
  sessionManager: SessionManager;
  gestaltGraph: GestaltGraph;
  identitiesManager: IdentitiesManager;
  discovery: Discovery;
  acl: ACL;
  notificationsManager: NotificationsManager;
  nodeManager: NodeManager;
  nodeConnectionManager: NodeConnectionManager;
  nodeGraph: NodeGraph;
  vaultManager: VaultManager;
  fs: FileSystem;
  logger: Logger;
}) => {
  // No type used here, it will override type inference
  return {
    agentLockAll: new AgentLockAllHandler(container),
    agentStatus: new AgentStatusHandler(container),
    agentStop: new AgentStopHandler(container),
    agentUnlock: new AgentUnlockHandler(container),
    gestaltsActionsGetByIdentity: new GestaltsActionsGetByIdentityHandler(
      container,
    ),
    gestaltsActionsGetByNode: new GestaltsActionsGetByNodeHandler(container),
    gestaltsActionsSetByIdentity: new GestaltsActionsSetByIdentityHandler(
      container,
    ),
    gestaltsActionsSetByNode: new GestaltsActionsSetByNodeHandler(container),
    gestaltsActionsUnsetByIdentity: new GestaltsActionsUnsetByIdentityHandler(
      container,
    ),
    gestaltsActionsUnsetByNode: new GestaltsActionsUnsetByNodeHandler(
      container,
    ),
    gestaltsDiscoveryByIdentity: new GestaltsDiscoveryByIdentityHandler(
      container,
    ),
    gestaltsDiscoveryByNode: new GestaltsDiscoveryByNodeHandler(container),
    gestaltsGestaltGetByIdentity: new GestaltsGestaltGetByIdentityHandler(
      container,
    ),
    gestaltsGestaltGetByNode: new GestaltsGestaltGetByNodeHandler(container),
    gestaltsGestaltList: new GestaltsGestaltListHandler(container),
    gestaltsGestaltTrustByIdentity: new GestaltsGestaltTrustByIdentityHandler(
      container,
    ),
    gestaltsGestaltTrustByNode: new GestaltsGestaltTrustByNodeHandler(
      container,
    ),
    identitiesAuthenticate: new IdentitiesAuthenticateHandler(container),
    identitiesAuthenticatedGet: new IdentitiesAuthenticatedGetHandler(
      container,
    ),
    identitiesClaim: new IdentitiesClaimHandler(container),
    identitiesInfoConnectedGet: new IdentitiesInfoConnectedGetHandler(
      container,
    ),
    identitiesInfoGet: new IdentitiesInfoGetHandler(container),
    identitiesInvite: new IdentitiesInviteHandler(container),
    identitiesProvidersList: new IdentitiesProvidersListHandler(container),
    identitiesTokenDelete: new IdentitiesTokenDeleteHandler(container),
    identitiesTokenGet: new IdentitiesTokenGetHandler(container),
    identitiesTokenPut: new IdentitiesTokenPutHandler(container),
    keysCertsChainGet: new KeysCertsChainGetHandler(container),
    keysCertsGet: new KeysCertsGetHandler(container),
    keysDecrypt: new KeysDecryptHandler(container),
    keysEncrypt: new KeysEncryptHandler(container),
    keysKeyPair: new KeysKeyPairHandler(container),
    keysKeyPairRenew: new KeysKeyPairRenewHandler(container),
    keysKeyPairReset: new KeysKeyPairResethandler(container),
    keysPasswordChange: new KeysPasswordChangeHandler(container),
    keysPublicKey: new KeysPublicKeyHandler(container),
    keysSign: new KeysSignHandler(container),
    keysVerify: new KeysVerifyHandler(container),
    nodesAdd: new NodesAddHandler(container),
    nodesClaim: new NodesClaimHandler(container),
    nodesFind: new NodesFindHandler(container),
    nodesGetAll: new NodesGetAllHandler(container),
    nodesListConnections: new NodesListConnectionsHandler(container),
    nodesPing: new NodesPingHandler(container),
    notificationsClear: new NotificationsClearHandler(container),
    notificationsRead: new NotificationsReadHandler(container),
    notificationsSend: new NotificationsSendHandler(container),
    vaultsClone: new VaultsCloneHandler(container),
    vaultsCreate: new VaultsCreatehandler(container),
    vaultsDelete: new VaultsDeleteHandler(container),
    vaultsList: new VaultsListHandler(container),
    vaultsLog: new VaultsLogHandler(container),
    vaultsPermissionGet: new VaultsPermissionGetHandler(container),
    vaultsPermissionSet: new VaultsPermissionSetHandler(container),
    vaultsPermissionUnset: new VaultsPermissionUnsetHandler(container),
    vaultsPull: new VaultsPullHandler(container),
    vaultsRename: new VaultsRenameHandler(container),
    vaultsScan: new VaultsScanHandler(container),
    vaultsSecretsDelete: new VaultsSecretsDeleteHandler(container),
    vaultsSecretsEdit: new VaultsSecretsEditHandler(container),
    vaultsSecretsGet: new VaultsSecretsGetHandler(container),
    vaultsSecretsList: new VaultsSecretsListHandler(container),
    vaultsSecretsMkdir: new VaultsSecretsMkdirHandler(container),
    vaultsSecretsNew: new VaultsSecretsNewHandler(container),
    vaultsSecretsNewDir: new VaultsSecretsNewDirHandler(container),
    vaultsSecretsRename: new VaultsSecretsRenameHandler(container),
    vaultsSecretsStat: new VaultsSecretsStatHandler(container),
    vaultsVersion: new VaultsVersionHandler(container),
  };
};

// No type used here, it will override type inference
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

export { serverManifest, clientManifest };
