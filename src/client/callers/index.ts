import agentLockAll from './agentLockAll.js';
import agentStatus from './agentStatus.js';
import agentStop from './agentStop.js';
import agentUnlock from './agentUnlock.js';
import auditEventsGet from './auditEventsGet.js';
import auditMetricGet from './auditMetricGet.js';
import authSignToken from './authSignToken.js';
import gestaltsActionsGetByIdentity from './gestaltsActionsGetByIdentity.js';
import gestaltsActionsGetByNode from './gestaltsActionsGetByNode.js';
import gestaltsActionsSetByIdentity from './gestaltsActionsSetByIdentity.js';
import gestaltsActionsSetByNode from './gestaltsActionsSetByNode.js';
import gestaltsActionsUnsetByIdentity from './gestaltsActionsUnsetByIdentity.js';
import gestaltsActionsUnsetByNode from './gestaltsActionsUnsetByNode.js';
import gestaltsDiscoveryByIdentity from './gestaltsDiscoveryByIdentity.js';
import gestaltsDiscoveryByNode from './gestaltsDiscoveryByNode.js';
import gestaltsGestaltGetByIdentity from './gestaltsGestaltGetByIdentity.js';
import gestaltsGestaltGetByNode from './gestaltsGestaltGetByNode.js';
import gestaltsDiscoveryQueue from './gestaltsDiscoveryQueue.js';
import gestaltsGestaltList from './gestaltsGestaltList.js';
import gestaltsGestaltTrustByIdentity from './gestaltsGestaltTrustByIdentity.js';
import gestaltsGestaltTrustByNode from './gestaltsGestaltTrustByNode.js';
import identitiesAuthenticate from './identitiesAuthenticate.js';
import identitiesAuthenticatedGet from './identitiesAuthenticatedGet.js';
import identitiesClaim from './identitiesClaim.js';
import identitiesInfoConnectedGet from './identitiesInfoConnectedGet.js';
import identitiesInfoGet from './identitiesInfoGet.js';
import identitiesInvite from './identitiesInvite.js';
import identitiesProvidersList from './identitiesProvidersList.js';
import identitiesTokenDelete from './identitiesTokenDelete.js';
import identitiesTokenGet from './identitiesTokenGet.js';
import identitiesTokenPut from './identitiesTokenPut.js';
import keysCertsChainGet from './keysCertsChainGet.js';
import keysCertsGet from './keysCertsGet.js';
import keysDecrypt from './keysDecrypt.js';
import keysEncrypt from './keysEncrypt.js';
import keysKeyPair from './keysKeyPair.js';
import keysKeyPairRenew from './keysKeyPairRenew.js';
import keysKeyPairReset from './keysKeyPairReset.js';
import keysPasswordChange from './keysPasswordChange.js';
import keysPublicKey from './keysPublicKey.js';
import keysSign from './keysSign.js';
import keysVerify from './keysVerify.js';
import nodesAdd from './nodesAdd.js';
import nodesClaim from './nodesClaim.js';
import nodesFind from './nodesFind.js';
import nodesGetAll from './nodesGetAll.js';
import nodesListConnections from './nodesListConnections.js';
import nodesPing from './nodesPing.js';
import notificationsInboxClear from './notificationsInboxClear.js';
import notificationsInboxRead from './notificationsInboxRead.js';
import notificationsInboxRemove from './notificationsInboxRemove.js';
import notificationsOutboxClear from './notificationsOutboxClear.js';
import notificationsOutboxRead from './notificationsOutboxRead.js';
import notificationsOutboxRemove from './notificationsOutboxRemove.js';
import notificationsSend from './notificationsSend.js';
import vaultsClone from './vaultsClone.js';
import vaultsCreate from './vaultsCreate.js';
import vaultsDelete from './vaultsDelete.js';
import vaultsList from './vaultsList.js';
import vaultsLog from './vaultsLog.js';
import vaultsPermissionGet from './vaultsPermissionGet.js';
import vaultsPermissionSet from './vaultsPermissionSet.js';
import vaultsPermissionUnset from './vaultsPermissionUnset.js';
import vaultsPull from './vaultsPull.js';
import vaultsRename from './vaultsRename.js';
import vaultsScan from './vaultsScan.js';
import vaultsSecretsCat from './vaultsSecretsCat.js';
import vaultsSecretsEnv from './vaultsSecretsEnv.js';
import vaultsSecretsList from './vaultsSecretsList.js';
import vaultsSecretsMkdir from './vaultsSecretsMkdir.js';
import vaultsSecretsNewDir from './vaultsSecretsNewDir.js';
import vaultsSecretsRename from './vaultsSecretsRename.js';
import vaultsSecretsRemove from './vaultsSecretsRemove.js';
import vaultsSecretsStat from './vaultsSecretsStat.js';
import vaultsSecretsTouch from './vaultsSecretsTouch.js';
import vaultsSecretsWriteFile from './vaultsSecretsWriteFile.js';
import vaultsVersion from './vaultsVersion.js';

/**
 * Client manifest
 */
const clientManifest = {
  agentLockAll,
  agentStatus,
  agentStop,
  agentUnlock,
  auditEventsGet,
  auditMetricGet,
  authSignToken,
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
  gestaltsDiscoveryQueue,
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
  notificationsInboxClear,
  notificationsInboxRead,
  notificationsInboxRemove,
  notificationsOutboxClear,
  notificationsOutboxRead,
  notificationsOutboxRemove,
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
  vaultsSecretsCat,
  vaultsSecretsEnv,
  vaultsSecretsList,
  vaultsSecretsMkdir,
  vaultsSecretsNewDir,
  vaultsSecretsRename,
  vaultsSecretsRemove,
  vaultsSecretsStat,
  vaultsSecretsTouch,
  vaultsSecretsWriteFile,
  vaultsVersion,
};

export default clientManifest;

export {
  agentLockAll,
  agentStatus,
  agentStop,
  agentUnlock,
  auditEventsGet,
  authSignToken,
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
  gestaltsDiscoveryQueue,
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
  notificationsInboxClear,
  notificationsInboxRead,
  notificationsInboxRemove,
  notificationsOutboxClear,
  notificationsOutboxRead,
  notificationsOutboxRemove,
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
  vaultsSecretsCat,
  vaultsSecretsEnv,
  vaultsSecretsList,
  vaultsSecretsMkdir,
  vaultsSecretsNewDir,
  vaultsSecretsRename,
  vaultsSecretsRemove,
  vaultsSecretsStat,
  vaultsSecretsTouch,
  vaultsSecretsWriteFile,
  vaultsVersion,
};
