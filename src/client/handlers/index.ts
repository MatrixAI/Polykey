import type { DB } from '@matrixai/db';
import type Logger from '@matrixai/logger';
import type ACL from '../../acl/ACL';
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
import agentLockAll from './agentLockAll';
import agentStatus from './agentStatus';
import agentStop from './agentStop';
import agentUnlock from './agentUnlock';
import gestaltsActionsGetByIdentity from './gestaltsActionsGetByIdentity';
import gestaltsActionsGetByNode from './gestaltsActionsGetByNode';
import gestaltsActionsSetByIdentity from './gestaltsActionsSetByIdentity';
import gestaltsActionsSetByNode from './gestaltsActionsSetByNode';
import gestaltsActionsUnsetByIdentity from './gestaltsActionsUnsetByIdentity';
import gestaltsActionsUnsetByNode from './gestaltsActionsUnsetByNode';
import gestaltsDiscoveryByIdentity from './gestaltsDiscoveryByIdentity';
import gestaltsDiscoveryByNode from './gestaltsDiscoveryByNode';
import gestaltsGestaltGetByIdentity from './gestaltsGestaltGetByIdentity';
import gestaltsGestaltGetByNode from './gestaltsGestaltGetByNode';
import gestaltsGestaltList from './gestaltsGestaltList';
import gestaltsGestaltTrustByIdentity from './gestaltsGestaltTrustByIdentity';
import gestaltsGestaltTrustByNode from './gestaltsGestaltTrustByNode';
import identitiesAuthenticate from './identitiesAuthenticate';
import identitiesAuthenticatedGet from './identitiesAuthenticatedGet';
import identitiesClaim from './identitiesClaim';
import identitiesInfoConnectedGet from './identitiesInfoConnectedGet';
import identitiesInfoGet from './identitiesInfoGet';
import identitiesInvite from './identitiesInvite';
import identitiesProvidersList from './identitiesProvidersList';
import identitiesTokenDelete from './identitiesTokenDelete';
import identitiesTokenGet from './identitiesTokenGet';
import identitiesTokenPut from './identitiesTokenPut';
import keysCertsChainGet from './keysCertsChainGet';
import keysCertsGet from './keysCertsGet';
import keysDecrypt from './keysDecrypt';
import keysEncrypt from './keysEncrypt';
import keysKeyPair from './keysKeyPair';
import keysKeyPairRenew from './keysKeyPairRenew';
import keysKeyPairReset from './keysKeyPairReset';
import keysPasswordChange from './keysPasswordChange';
import keysPublicKey from './keysPublicKey';
import keysSign from './keysSign';
import keysVerify from './keysVerify';
import nodesAdd from './nodesAdd';
import nodesClaim from './nodesClaim';
import nodesFind from './nodesFind';
import nodesGetAll from './nodesGetAll';
import nodesListConnections from './nodesListConnections';
import nodesPing from './nodesPing';
import notificationsClear from './notificationsClear';
import notificationsRead from './notificationsRead';
import notificationsSend from './notificationsSend';
import vaultsClone from './vaultsClone';
import vaultsCreate from './vaultsCreate';
import vaultsDelete from './vaultsDelete';
import vaultsList from './vaultsList';
import vaultsLog from './vaultsLog';
import vaultsPermissionGet from './vaultsPermissionGet';
import vaultsPermissionSet from './vaultsPermissionSet';
import vaultsPermissionUnset from './vaultsPermissionUnset';
import vaultsPull from './vaultsPull';
import vaultsRename from './vaultsRename';
import vaultsScan from './vaultsScan';
import vaultsSecretsDelete from './vaultsSecretsDelete';
import vaultsSecretsEdit from './vaultsSecretsEdit';
import vaultsSecretsGet from './vaultsSecretsGet';
import vaultsSecretsList from './vaultsSecretsList';
import vaultsSecretsMkdir from './vaultsSecretsMkdir';
import vaultsSecretsNew from './vaultsSecretsNew';
import vaultsSecretsNewDir from './vaultsSecretsNewDir';
import vaultsSecretsRename from './vaultsSecretsRename';
import vaultsSecretsStat from './vaultsSecretsStat';
import vaultsVersion from './vaultsVersion';

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
  notificationsManager: NotificationsManager;
  nodeManager: NodeManager;
  nodeConnectionManager: NodeConnectionManager;
  nodeGraph: NodeGraph;
  vaultManager: VaultManager;
  fs: FileSystem;
  logger: Logger;
}) => {
  return {
    agentLockAll: new agentLockAll(container),
    agentStatus: new agentStatus(container),
    agentStop: new agentStop(container),
    agentUnlock: new agentUnlock(container),
    gestaltsActionsGetByIdentity: new gestaltsActionsGetByIdentity(container),
    gestaltsActionsGetByNode: new gestaltsActionsGetByNode(container),
    gestaltsActionsSetByIdentity: new gestaltsActionsSetByNode(container),
    gestaltsActionsSetByNode: new gestaltsActionsSetByNode(container),
    gestaltsActionsUnsetByIdentity: new gestaltsActionsUnsetByIdentity(
      container,
    ),
    gestaltsActionsUnsetByNode: new gestaltsActionsUnsetByNode(container),
    gestaltsDiscoveryByIdentity: new gestaltsDiscoveryByIdentity(container),
    gestaltsDiscoveryByNode: new gestaltsDiscoveryByNode(container),
    gestaltsGestaltGetByIdentity: new gestaltsGestaltGetByIdentity(container),
    gestaltsGestaltGetByNode: new gestaltsGestaltGetByNode(container),
    gestaltsGestaltList: new gestaltsGestaltList(container),
    gestaltsGestaltTrustByIdentity: new gestaltsGestaltTrustByIdentity(
      container,
    ),
    gestaltsGestaltTrustByNode: new gestaltsGestaltTrustByNode(container),
    identitiesAuthenticate: new identitiesAuthenticate(container),
    identitiesAuthenticatedGet: new identitiesAuthenticatedGet(container),
    identitiesClaim: new identitiesClaim(container),
    identitiesInfoConnectedGet: new identitiesInfoConnectedGet(container),
    identitiesInfoGet: new identitiesInfoGet(container),
    identitiesInvite: new identitiesInvite(container),
    identitiesProvidersList: new identitiesProvidersList(container),
    identitiesTokenDelete: new identitiesTokenDelete(container),
    identitiesTokenGet: new identitiesTokenGet(container),
    identitiesTokenPut: new identitiesTokenPut(container),
    keysCertsChainGet: new keysCertsChainGet(container),
    keysCertsGet: new keysCertsGet(container),
    keysDecrypt: new keysDecrypt(container),
    keysEncrypt: new keysEncrypt(container),
    keysKeyPair: new keysKeyPair(container),
    keysKeyPairRenew: new keysKeyPairRenew(container),
    keysKeyPairReset: new keysKeyPairReset(container),
    keysPasswordChange: new keysPasswordChange(container),
    keysPublicKey: new keysPublicKey(container),
    keysSign: new keysSign(container),
    keysVerify: new keysVerify(container),
    nodesAdd: new nodesAdd(container),
    nodesClaim: new nodesClaim(container),
    nodesFind: new nodesFind(container),
    nodesGetAll: new nodesGetAll(container),
    nodesListConnections: new nodesListConnections(container),
    nodesPing: new nodesPing(container),
    notificationsClear: new notificationsClear(container),
    notificationsRead: new notificationsRead(container),
    notificationsSend: new notificationsSend(container),
    vaultsClone: new vaultsClone(container),
    vaultsCreate: new vaultsCreate(container),
    vaultsDelete: new vaultsDelete(container),
    vaultsList: new vaultsList(container),
    vaultsLog: new vaultsLog(container),
    vaultsPermissionGet: new vaultsPermissionGet(container),
    vaultsPermissionSet: new vaultsPermissionSet(container),
    vaultsPermissionUnset: new vaultsPermissionUnset(container),
    vaultsPull: new vaultsPull(container),
    vaultsRename: new vaultsRename(container),
    vaultsScan: new vaultsScan(container),
    vaultsSecretsDelete: new vaultsSecretsDelete(container),
    vaultsSecretsEdit: new vaultsSecretsEdit(container),
    vaultsSecretsGet: new vaultsSecretsGet(container),
    vaultsSecretsList: new vaultsSecretsList(container),
    vaultsSecretsMkdir: new vaultsSecretsMkdir(container),
    vaultsSecretsNew: new vaultsSecretsNew(container),
    vaultsSecretsNewDir: new vaultsSecretsNewDir(container),
    vaultsSecretsRename: new vaultsSecretsRename(container),
    vaultsSecretsStat: new vaultsSecretsStat(container),
    vaultsVersion: new vaultsVersion(container),
  };
};

export default serverManifest;

export {
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
