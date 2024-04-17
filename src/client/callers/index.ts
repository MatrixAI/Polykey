import agentLockAll from './agentLockAll';
import agentStatus from './agentStatus';
import agentStop from './agentStop';
import agentUnlock from './agentUnlock';
import auditEventsGet from './auditEventsGet';
import auditMetricGet from './auditMetricGet';
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
import gestaltsDiscoveryQueue from './gestaltsDiscoveryQueue';
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
import vaultsSecretsEnv from './vaultsSecretsEnv';
import vaultsSecretsGet from './vaultsSecretsGet';
import vaultsSecretsList from './vaultsSecretsList';
import vaultsSecretsMkdir from './vaultsSecretsMkdir';
import vaultsSecretsNew from './vaultsSecretsNew';
import vaultsSecretsNewDir from './vaultsSecretsNewDir';
import vaultsSecretsRename from './vaultsSecretsRename';
import vaultsSecretsStat from './vaultsSecretsStat';
import vaultsVersion from './vaultsVersion';

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
  vaultsSecretsEnv,
  vaultsSecretsGet,
  vaultsSecretsList,
  vaultsSecretsMkdir,
  vaultsSecretsNew,
  vaultsSecretsNewDir,
  vaultsSecretsRename,
  vaultsSecretsStat,
  vaultsVersion,
};

export default clientManifest;

export {
  agentLockAll,
  agentStatus,
  agentStop,
  agentUnlock,
  auditEventsGet,
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
  vaultsSecretsEnv,
  vaultsSecretsGet,
  vaultsSecretsList,
  vaultsSecretsMkdir,
  vaultsSecretsNew,
  vaultsSecretsNewDir,
  vaultsSecretsRename,
  vaultsSecretsStat,
  vaultsVersion,
};
