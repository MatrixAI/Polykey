import type { DB } from '@matrixai/db';
import type Logger from '@matrixai/logger';
import type ACL from '../../acl/ACL.js';
import type Audit from '../../audit/Audit.js';
import type KeyRing from '../../keys/KeyRing.js';
import type CertManager from '../../keys/CertManager.js';
import type SessionManager from '../../sessions/SessionManager.js';
import type GestaltGraph from '../../gestalts/GestaltGraph.js';
import type IdentitiesManager from '../../identities/IdentitiesManager.js';
import type Discovery from '../../discovery/Discovery.js';
import type NotificationsManager from '../../notifications/NotificationsManager.js';
import type NodeManager from '../../nodes/NodeManager.js';
import type NodeConnectionManager from '../../nodes/NodeConnectionManager.js';
import type NodeGraph from '../../nodes/NodeGraph.js';
import type VaultManager from '../../vaults/VaultManager.js';
import type PolykeyAgent from '../../PolykeyAgent.js';
import type { FileSystem } from '../../types.js';
import type { AgentClientManifest } from '../../nodes/agent/callers/index.js';
import AgentLockAll from './AgentLockAll.js';
import AgentStatus from './AgentStatus.js';
import AgentStop from './AgentStop.js';
import AgentUnlock from './AgentUnlock.js';
import AuditEventsGet from './AuditEventsGet.js';
import AuditMetricGet from './AuditMetricGet.js';
import AuthIdentityToken from './AuthIdentityToken.js';
import GestaltsActionsGetByIdentity from './GestaltsActionsGetByIdentity.js';
import GestaltsActionsGetByNode from './GestaltsActionsGetByNode.js';
import GestaltsActionsSetByIdentity from './GestaltsActionsSetByIdentity.js';
import GestaltsActionsSetByNode from './GestaltsActionsSetByNode.js';
import GestaltsActionsUnsetByIdentity from './GestaltsActionsUnsetByIdentity.js';
import GestaltsActionsUnsetByNode from './GestaltsActionsUnsetByNode.js';
import GestaltsDiscoveryByIdentity from './GestaltsDiscoveryByIdentity.js';
import GestaltsDiscoveryByNode from './GestaltsDiscoveryByNode.js';
import GestaltsGestaltGetByIdentity from './GestaltsGestaltGetByIdentity.js';
import GestaltsGestaltGetByNode from './GestaltsGestaltGetByNode.js';
import GestaltsGestaltList from './GestaltsGestaltList.js';
import GestaltsGestaltTrustByIdentity from './GestaltsGestaltTrustByIdentity.js';
import GestaltsGestaltTrustByNode from './GestaltsGestaltTrustByNode.js';
import GestaltsDiscoveryQueue from './GestaltsDiscoveryQueue.js';
import IdentitiesAuthenticate from './IdentitiesAuthenticate.js';
import IdentitiesAuthenticatedGet from './IdentitiesAuthenticatedGet.js';
import IdentitiesClaim from './IdentitiesClaim.js';
import IdentitiesInfoConnectedGet from './IdentitiesInfoConnectedGet.js';
import IdentitiesInfoGet from './IdentitiesInfoGet.js';
import IdentitiesInvite from './IdentitiesInvite.js';
import IdentitiesProvidersList from './IdentitiesProvidersList.js';
import IdentitiesTokenDelete from './IdentitiesTokenDelete.js';
import IdentitiesTokenGet from './IdentitiesTokenGet.js';
import IdentitiesTokenPut from './IdentitiesTokenPut.js';
import KeysCertsChainGet from './KeysCertsChainGet.js';
import KeysCertsGet from './KeysCertsGet.js';
import KeysDecrypt from './KeysDecrypt.js';
import KeysEncrypt from './KeysEncrypt.js';
import KeysKeyPair from './KeysKeyPair.js';
import KeysKeyPairRenew from './KeysKeyPairRenew.js';
import KeysKeyPairReset from './KeysKeyPairReset.js';
import KeysPasswordChange from './KeysPasswordChange.js';
import KeysPublicKey from './KeysPublicKey.js';
import KeysSign from './KeysSign.js';
import KeysVerify from './KeysVerify.js';
import NodesAdd from './NodesAdd.js';
import NodesClaim from './NodesClaim.js';
import NodesFind from './NodesFind.js';
import NodesGetAll from './NodesGetAll.js';
import NodesListConnections from './NodesListConnections.js';
import NodesPing from './NodesPing.js';
import NotificationsInboxClear from './NotificationsInboxClear.js';
import NotificationsInboxRead from './NotificationsInboxRead.js';
import NotificationsInboxRemove from './NotificationsInboxRemove.js';
import NotificationsOutboxClear from './NotificationsOutboxClear.js';
import NotificationsOutboxRead from './NotificationsOutboxRead.js';
import NotificationsOutboxRemove from './NotificationsOutboxRemove.js';
import NotificationsSend from './NotificationsSend.js';
import VaultsClone from './VaultsClone.js';
import VaultsCreate from './VaultsCreate.js';
import VaultsDelete from './VaultsDelete.js';
import VaultsList from './VaultsList.js';
import VaultsLog from './VaultsLog.js';
import VaultsPermissionGet from './VaultsPermissionGet.js';
import VaultsPermissionSet from './VaultsPermissionSet.js';
import VaultsPermissionUnset from './VaultsPermissionUnset.js';
import VaultsPull from './VaultsPull.js';
import VaultsRename from './VaultsRename.js';
import VaultsScan from './VaultsScan.js';
import VaultsSecretsCat from './VaultsSecretsCat.js';
import VaultsSecretsEnv from './VaultsSecretsEnv.js';
import VaultsSecretsList from './VaultsSecretsList.js';
import VaultsSecretsMkdir from './VaultsSecretsMkdir.js';
import VaultsSecretsNewDir from './VaultsSecretsNewDir.js';
import VaultsSecretsRename from './VaultsSecretsRename.js';
import VaultsSecretsRemove from './VaultsSecretsRemove.js';
import VaultsSecretsStat from './VaultsSecretsStat.js';
import VaultsSecretsTouch from './VaultsSecretsTouch.js';
import VaultsSecretsWriteFile from './VaultsSecretsWriteFile.js';
import VaultsVersion from './VaultsVersion.js';

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
  nodeManager: NodeManager<AgentClientManifest>;
  nodeConnectionManager: NodeConnectionManager<AgentClientManifest>;
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
    authIdentityToken: new AuthIdentityToken(container),
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
    vaultsSecretsCat: new VaultsSecretsCat(container),
    vaultsSecretsEnv: new VaultsSecretsEnv(container),
    vaultsSecretsList: new VaultsSecretsList(container),
    vaultsSecretsMkdir: new VaultsSecretsMkdir(container),
    vaultsSecretsNewDir: new VaultsSecretsNewDir(container),
    vaultsSecretsRename: new VaultsSecretsRename(container),
    vaultsSecretsRemove: new VaultsSecretsRemove(container),
    vaultsSecretsStat: new VaultsSecretsStat(container),
    vaultsSecretsTouch: new VaultsSecretsTouch(container),
    vaultsSecretsWriteFile: new VaultsSecretsWriteFile(container),
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
  AuthIdentityToken,
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
  VaultsSecretsCat,
  VaultsSecretsEnv,
  VaultsSecretsList,
  VaultsSecretsMkdir,
  VaultsSecretsNewDir,
  VaultsSecretsRename,
  VaultsSecretsRemove,
  VaultsSecretsStat,
  VaultsSecretsTouch,
  VaultsSecretsWriteFile,
  VaultsVersion,
};
