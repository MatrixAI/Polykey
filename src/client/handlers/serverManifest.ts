import type Logger from '@matrixai/logger';
import type { DB } from '@matrixai/db';
import type SessionManager from '../../sessions/SessionManager';
import type KeyRing from '../../keys/KeyRing';
import type CertManager from '../../keys/CertManager';
import type PolykeyAgent from '../../PolykeyAgent';
import type GestaltGraph from '../../gestalts/GestaltGraph';
import type Discovery from '../../discovery/Discovery';
import type IdentitiesManager from '../../identities/IdentitiesManager';
import type { NotificationsManager } from '../../notifications/index';
import type ACL from '../../acl/ACL';
import type NodeManager from '../../nodes/NodeManager';
import type NodeConnectionManager from '../../nodes/NodeConnectionManager';
import type NodeGraph from '../../nodes/NodeGraph';
import type VaultManager from '../../vaults/VaultManager';
import type { FileSystem } from '../../types';
import { VaultsCloneHandler } from './vaultsClone';
import { VaultsCreateHandler } from './vaultsCreate';
import { VaultsDeleteHandler } from './vaultsDelete';
import { VaultsListHandler } from './vaultsList';
import { VaultsLogHandler } from './vaultsLog';
import { VaultsPermissionGetHandler } from './vaultsPermissionGet';
import { VaultsPermissionSetHandler } from './vaultsPermissionSet';
import { VaultsPermissionUnsetHandler } from './vaultsPermissionUnset';
import { NodesAddHandler } from './nodesAdd';
import { NodesClaimHandler } from './nodesClaim';
import { NodesFindHandler } from './nodesFind';
import { NodesGetAllHandler } from './nodesGetAll';
import { NodesListConnectionsHandler } from './nodesListConnections';
import { NodesPingHandler } from './nodesPing';
import { GestaltsActionsGetByIdentityHandler } from './gestaltsActionsGetByIdentity';
import { GestaltsActionsGetByNodeHandler } from './gestaltsActionsGetByNode';
import { GestaltsActionsSetByIdentityHandler } from './gestaltsActionsSetByIdentity';
import { GestaltsActionsSetByNodeHandler } from './gestaltsActionsSetByNode';
import { GestaltsActionsUnsetByIdentityHandler } from './gestaltsActionsUnsetByIdentity';
import { GestaltsActionsUnsetByNodeHandler } from './gestaltsActionsUnsetByNode';
import { GestaltsDiscoveryByIdentityHandler } from './gestaltsDiscoveryByIdentity';
import { GestaltsDiscoveryByNodeHandler } from './gestaltsDiscoveryByNode';
import { GestaltsGestaltGetByIdentityHandler } from './gestaltsGestaltGetByIdentity';
import { GestaltsGestaltGetByNodeHandler } from './gestaltsGestaltGetByNode';
import { GestaltsGestaltListHandler } from './gestaltsGestaltList';
import { GestaltsGestaltTrustByIdentityHandler } from './gestaltsGestaltTrustByIdentity';
import { GestaltsGestaltTrustByNodeHandler } from './gestaltsGestaltTrustByNode';
import { IdentitiesAuthenticateHandler } from './identitiesAuthenticate';
import { IdentitiesAuthenticatedGetHandler } from './identitiesAuthenticatedGet';
import { IdentitiesClaimHandler } from './identitiesClaim';
import { AgentStatusHandler } from './agentStatus';
import { AgentStopHandler } from './agentStop';
import { AgentUnlockHandler } from './agentUnlock';
import { AgentLockAllHandler } from './agentLockAll';
import { IdentitiesInfoGetHandler } from './identitiesInfoGet';
import { IdentitiesInfoConnectedGetHandler } from './identitiesInfoConnectedGet';
import { IdentitiesInviteHandler } from './identitiesInvite';
import { IdentitiesProvidersListHandler } from './identitiesProvidersList';
import { IdentitiesTokenDeleteHandler } from './identitiesTokenDelete';
import { IdentitiesTokenGetHandler } from './identitiesTokenGet';
import { IdentitiesTokenPutHandler } from './identitiesTokenPut';
import { KeysCertsChainGetHandler } from './keysCertsChainGet';
import { KeysCertsGetHandler } from './keysCertsGet';
import { KeysDecryptHandler } from './keysDecrypt';
import { KeysEncryptHandler } from './keysEncrypt';
import { KeysKeyPairHandler } from './keysKeyPair';
import { KeysKeyPairRenewHandler } from './keysKeyPairRenew';
import { KeysKeyPairResethandler } from './keysKeyPairReset';
import { KeysPasswordChangeHandler } from './keysPasswordChange';
import { KeysPublicKeyHandler } from './keysPublicKey';
import { NotificationsClearHandler } from './notificationsClear';
import { NotificationsReadHandler } from './notificationsRead';
import { NotificationsSendHandler } from './notificationsSend';
import { VaultsPullHandler } from './vaultsPull';
import { VaultsRenameHandler } from './vaultsRename';
import { VaultsScanHandler } from './vaultsScan';
import { VaultsSecretsDeleteHandler } from './vaultsSecretsDelete';
import { VaultsSecretsEditHandler } from './vaultsSecretsEdit';
import { VaultsSecretsGetHandler } from './vaultsSecretsGet';
import { VaultsSecretsListHandler } from './vaultsSecretsList';
import { VaultsSecretsMkdirHandler } from './vaultsSecretsMkdir';
import { VaultsSecretsNewHandler } from './vaultsSecretsNew';
import { VaultsSecretsNewDirHandler } from './vaultsSecretsNewDir';
import { VaultsSecretsRenameHandler } from './vaultsSecretsRename';
import { VaultsSecretsStatHandler } from './vaultsSecretsStat';
import { VaultsVersionHandler } from './vaultsVersion';
import { KeysVerifyHandler } from '../../client/handlers/keysVerify';
import { KeysSignHandler } from '../../client/handlers/keysSign';

/**
 * All the server handler definitions for the ClientServer RPC.
 * This will take the container of all the required dependencies and create the server handlers.
 *
 * Used by the RPCServer to register handlers and enforce types.
 */
const serverManifest = (container: {
  pkAgentProm: Promise<PolykeyAgent>;
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
    vaultsCreate: new VaultsCreateHandler(container),
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

export { serverManifest };
