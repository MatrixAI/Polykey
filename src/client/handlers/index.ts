import type { DB } from '@matrixai/db';
import type Logger from '@matrixai/logger';
import type ACL from '../../acl/ACL';
import type Audit from '../../audit/Audit';
import type KeyRing from '../../keys/KeyRing';
import type CertManager from '../../keys/CertManager';
import type SessionManager from '../../sessions/SessionManager';
import type GestaltGraph from '../../gestalts/GestaltGraph';
import type IdentitiesManager from '../../identities/IdentitiesManager';
import type Discovery from '../../discovery/Discovery';
import type NotificationsManager from '../../notifications/NotificationsManager';
import type NodeManager from '../../nodes/NodeManager';
import type NodeConnectionManager from '../../nodes/NodeConnectionManager';
import type NodeGraph from '../../nodes/NodeGraph';
import type VaultManager from '../../vaults/VaultManager';
import type PolykeyAgent from '../../PolykeyAgent';
import type { FileSystem } from '../../types';
import AgentLockAll from './AgentLockAll';
import AgentStatus from './AgentStatus';
import AgentStop from './AgentStop';
import AgentUnlock from './AgentUnlock';
import AuditEventsGet from './AuditEventsGet';
import AuditMetricGet from './AuditMetricGet';
import GestaltsActionsGetByIdentity from './GestaltsActionsGetByIdentity';
import GestaltsActionsGetByNode from './GestaltsActionsGetByNode';
import GestaltsActionsSetByIdentity from './GestaltsActionsSetByIdentity';
import GestaltsActionsSetByNode from './GestaltsActionsSetByNode';
import GestaltsActionsUnsetByIdentity from './GestaltsActionsUnsetByIdentity';
import GestaltsActionsUnsetByNode from './GestaltsActionsUnsetByNode';
import GestaltsDiscoveryByIdentity from './GestaltsDiscoveryByIdentity';
import GestaltsDiscoveryByNode from './GestaltsDiscoveryByNode';
import GestaltsGestaltGetByIdentity from './GestaltsGestaltGetByIdentity';
import GestaltsGestaltGetByNode from './GestaltsGestaltGetByNode';
import GestaltsGestaltList from './GestaltsGestaltList';
import GestaltsGestaltTrustByIdentity from './GestaltsGestaltTrustByIdentity';
import GestaltsGestaltTrustByNode from './GestaltsGestaltTrustByNode';
import GestaltsDiscoveryQueue from './GestaltsDiscoveryQueue';
import IdentitiesAuthenticate from './IdentitiesAuthenticate';
import IdentitiesAuthenticatedGet from './IdentitiesAuthenticatedGet';
import IdentitiesClaim from './IdentitiesClaim';
import IdentitiesInfoConnectedGet from './IdentitiesInfoConnectedGet';
import IdentitiesInfoGet from './IdentitiesInfoGet';
import IdentitiesInvite from './IdentitiesInvite';
import IdentitiesProvidersList from './IdentitiesProvidersList';
import IdentitiesTokenDelete from './IdentitiesTokenDelete';
import IdentitiesTokenGet from './IdentitiesTokenGet';
import IdentitiesTokenPut from './IdentitiesTokenPut';
import KeysCertsChainGet from './KeysCertsChainGet';
import KeysCertsGet from './KeysCertsGet';
import KeysDecrypt from './KeysDecrypt';
import KeysEncrypt from './KeysEncrypt';
import KeysKeyPair from './KeysKeyPair';
import KeysKeyPairRenew from './KeysKeyPairRenew';
import KeysKeyPairReset from './KeysKeyPairReset';
import KeysPasswordChange from './KeysPasswordChange';
import KeysPublicKey from './KeysPublicKey';
import KeysSign from './KeysSign';
import KeysVerify from './KeysVerify';
import NodesAdd from './NodesAdd';
import NodesClaim from './NodesClaim';
import NodesFind from './NodesFind';
import NodesGetAll from './NodesGetAll';
import NodesListConnections from './NodesListConnections';
import NodesPing from './NodesPing';
import NotificationsInboxClear from './NotificationsInboxClear';
import NotificationsInboxRead from './NotificationsInboxRead';
import NotificationsInboxRemove from './NotificationsInboxRemove';
import NotificationsOutboxClear from './NotificationsOutboxClear';
import NotificationsOutboxRead from './NotificationsOutboxRead';
import NotificationsOutboxRemove from './NotificationsOutboxRemove';
import NotificationsSend from './NotificationsSend';
import VaultsClone from './VaultsClone';
import VaultsCreate from './VaultsCreate';
import VaultsDelete from './VaultsDelete';
import VaultsList from './VaultsList';
import VaultsLog from './VaultsLog';
import VaultsPermissionGet from './VaultsPermissionGet';
import VaultsPermissionSet from './VaultsPermissionSet';
import VaultsPermissionUnset from './VaultsPermissionUnset';
import VaultsPull from './VaultsPull';
import VaultsRename from './VaultsRename';
import VaultsScan from './VaultsScan';
import VaultsSecretsDelete from './VaultsSecretsDelete';
import VaultsSecretsEdit from './VaultsSecretsEdit';
import VaultsSecretsEnv from './VaultsSecretsEnv';
import VaultsSecretsGet from './VaultsSecretsGet';
import VaultsSecretsList from './VaultsSecretsList';
import VaultsSecretsMkdir from './VaultsSecretsMkdir';
import VaultsSecretsNew from './VaultsSecretsNew';
import VaultsSecretsNewDir from './VaultsSecretsNewDir';
import VaultsSecretsRename from './VaultsSecretsRename';
import VaultsSecretsStat from './VaultsSecretsStat';
import VaultsVersion from './VaultsVersion';

/**
 * Server manifest factory.
 */
const serverManifest = (container: {
  polykeyAgent: PolykeyAgent;
  keyRing: KeyRing;
  certManager: CertManager;
  db: DB;
  sessionManager: SessionManager;
  gestaltGraph: GestaltGraph;
  identitiesManager: IdentitiesManager;
  discovery: Discovery;
  acl: ACL;
  audit: Audit;
  notificationsManager: NotificationsManager;
  nodeManager: NodeManager;
  nodeConnectionManager: NodeConnectionManager;
  nodeGraph: NodeGraph;
  vaultManager: VaultManager;
  fs: FileSystem;
  logger: Logger;
}) => {
  return {
    agentLockAll: new AgentLockAll(container),
    agentStatus: new AgentStatus(container),
    agentStop: new AgentStop(container),
    agentUnlock: new AgentUnlock(container),
    auditEventsGet: new AuditEventsGet(container),
    auditMetricGet: new AuditMetricGet(container),
    gestaltsActionsGetByIdentity: new GestaltsActionsGetByIdentity(container),
    gestaltsActionsGetByNode: new GestaltsActionsGetByNode(container),
    gestaltsActionsSetByIdentity: new GestaltsActionsSetByIdentity(container),
    gestaltsActionsSetByNode: new GestaltsActionsSetByNode(container),
    gestaltsActionsUnsetByIdentity: new GestaltsActionsUnsetByIdentity(
      container,
    ),
    gestaltsActionsUnsetByNode: new GestaltsActionsUnsetByNode(container),
    gestaltsDiscoveryByIdentity: new GestaltsDiscoveryByIdentity(container),
    gestaltsDiscoveryByNode: new GestaltsDiscoveryByNode(container),
    gestaltsGestaltGetByIdentity: new GestaltsGestaltGetByIdentity(container),
    gestaltsGestaltGetByNode: new GestaltsGestaltGetByNode(container),
    gestaltsGestaltList: new GestaltsGestaltList(container),
    gestaltsGestaltTrustByIdentity: new GestaltsGestaltTrustByIdentity(
      container,
    ),
    gestaltsGestaltTrustByNode: new GestaltsGestaltTrustByNode(container),
    gestaltsDiscoveryQueue: new GestaltsDiscoveryQueue(container),
    identitiesAuthenticate: new IdentitiesAuthenticate(container),
    identitiesAuthenticatedGet: new IdentitiesAuthenticatedGet(container),
    identitiesClaim: new IdentitiesClaim(container),
    identitiesInfoConnectedGet: new IdentitiesInfoConnectedGet(container),
    identitiesInfoGet: new IdentitiesInfoGet(container),
    identitiesInvite: new IdentitiesInvite(container),
    identitiesProvidersList: new IdentitiesProvidersList(container),
    identitiesTokenDelete: new IdentitiesTokenDelete(container),
    identitiesTokenGet: new IdentitiesTokenGet(container),
    identitiesTokenPut: new IdentitiesTokenPut(container),
    keysCertsChainGet: new KeysCertsChainGet(container),
    keysCertsGet: new KeysCertsGet(container),
    keysDecrypt: new KeysDecrypt(container),
    keysEncrypt: new KeysEncrypt(container),
    keysKeyPair: new KeysKeyPair(container),
    keysKeyPairRenew: new KeysKeyPairRenew(container),
    keysKeyPairReset: new KeysKeyPairReset(container),
    keysPasswordChange: new KeysPasswordChange(container),
    keysPublicKey: new KeysPublicKey(container),
    keysSign: new KeysSign(container),
    keysVerify: new KeysVerify(container),
    nodesAdd: new NodesAdd(container),
    nodesClaim: new NodesClaim(container),
    nodesFind: new NodesFind(container),
    nodesGetAll: new NodesGetAll(container),
    nodesListConnections: new NodesListConnections(container),
    nodesPing: new NodesPing(container),
    notificationsInboxClear: new NotificationsInboxClear(container),
    notificationsInboxRead: new NotificationsInboxRead(container),
    notificationsInboxRemove: new NotificationsInboxRemove(container),
    notificationsOutboxClear: new NotificationsOutboxClear(container),
    notificationsOutboxRead: new NotificationsOutboxRead(container),
    notificationsOutboxRemove: new NotificationsOutboxRemove(container),
    notificationsSend: new NotificationsSend(container),
    vaultsClone: new VaultsClone(container),
    vaultsCreate: new VaultsCreate(container),
    vaultsDelete: new VaultsDelete(container),
    vaultsList: new VaultsList(container),
    vaultsLog: new VaultsLog(container),
    vaultsPermissionGet: new VaultsPermissionGet(container),
    vaultsPermissionSet: new VaultsPermissionSet(container),
    vaultsPermissionUnset: new VaultsPermissionUnset(container),
    vaultsPull: new VaultsPull(container),
    vaultsRename: new VaultsRename(container),
    vaultsScan: new VaultsScan(container),
    vaultsSecretsDelete: new VaultsSecretsDelete(container),
    vaultsSecretsEdit: new VaultsSecretsEdit(container),
    vaultsSecretsEnv: new VaultsSecretsEnv(container),
    vaultsSecretsGet: new VaultsSecretsGet(container),
    vaultsSecretsList: new VaultsSecretsList(container),
    vaultsSecretsMkdir: new VaultsSecretsMkdir(container),
    vaultsSecretsNew: new VaultsSecretsNew(container),
    vaultsSecretsNewDir: new VaultsSecretsNewDir(container),
    vaultsSecretsRename: new VaultsSecretsRename(container),
    vaultsSecretsStat: new VaultsSecretsStat(container),
    vaultsVersion: new VaultsVersion(container),
  };
};

export default serverManifest;

export {
  AgentLockAll,
  AgentStatus,
  AgentStop,
  AgentUnlock,
  AuditEventsGet,
  AuditMetricGet,
  GestaltsActionsGetByIdentity,
  GestaltsActionsGetByNode,
  GestaltsActionsSetByIdentity,
  GestaltsActionsSetByNode,
  GestaltsActionsUnsetByIdentity,
  GestaltsActionsUnsetByNode,
  GestaltsDiscoveryByIdentity,
  GestaltsDiscoveryByNode,
  GestaltsDiscoveryQueue,
  GestaltsGestaltGetByIdentity,
  GestaltsGestaltGetByNode,
  GestaltsGestaltList,
  GestaltsGestaltTrustByIdentity,
  GestaltsGestaltTrustByNode,
  IdentitiesAuthenticate,
  IdentitiesAuthenticatedGet,
  IdentitiesClaim,
  IdentitiesInfoConnectedGet,
  IdentitiesInfoGet,
  IdentitiesInvite,
  IdentitiesProvidersList,
  IdentitiesTokenDelete,
  IdentitiesTokenGet,
  IdentitiesTokenPut,
  KeysCertsChainGet,
  KeysCertsGet,
  KeysDecrypt,
  KeysEncrypt,
  KeysKeyPair,
  KeysKeyPairRenew,
  KeysKeyPairReset,
  KeysPasswordChange,
  KeysPublicKey,
  KeysSign,
  KeysVerify,
  NodesAdd,
  NodesClaim,
  NodesFind,
  NodesGetAll,
  NodesListConnections,
  NodesPing,
  NotificationsInboxClear,
  NotificationsInboxRead,
  NotificationsInboxRemove,
  NotificationsOutboxClear,
  NotificationsOutboxRead,
  NotificationsOutboxRemove,
  NotificationsSend,
  VaultsClone,
  VaultsCreate,
  VaultsDelete,
  VaultsList,
  VaultsLog,
  VaultsPermissionGet,
  VaultsPermissionSet,
  VaultsPermissionUnset,
  VaultsPull,
  VaultsRename,
  VaultsScan,
  VaultsSecretsDelete,
  VaultsSecretsEdit,
  VaultsSecretsEnv,
  VaultsSecretsGet,
  VaultsSecretsList,
  VaultsSecretsMkdir,
  VaultsSecretsNew,
  VaultsSecretsNewDir,
  VaultsSecretsRename,
  VaultsSecretsStat,
  VaultsVersion,
};
