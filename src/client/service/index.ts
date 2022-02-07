import type PolykeyAgent from '../../PolykeyAgent';
import type { KeyManager } from '../../keys';
import type { VaultManager } from '../../vaults';
import type {
  NodeManager,
  NodeConnectionManager,
  NodeGraph,
} from '../../nodes';
import type { IdentitiesManager } from '../../identities';
import type { GestaltGraph } from '../../gestalts';
import type { SessionManager } from '../../sessions';
import type { NotificationsManager } from '../../notifications';
import type { Discovery } from '../../discovery';
import type { Sigchain } from '../../sigchain';
import type { GRPCServer } from '../../grpc';
import type ForwardProxy from '../../network/ForwardProxy';
import type ReverseProxy from '../../network/ReverseProxy';
import type { IClientServiceServer } from '../../proto/js/polykey/v1/client_service_grpc_pb';
import type { FileSystem } from '../../types';
import Logger from '@matrixai/logger';
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
import identitiesInfoGet from './identitiesInfoGet';
import identitiesInfoConnectedGet from './identitiesInfoConnectedGet';
import identitiesProvidersList from './identitiesProvidersList';
import identitiesTokenDelete from './identitiesTokenDelete';
import identitiesTokenGet from './identitiesTokenGet';
import identitiesTokenPut from './identitiesTokenPut';
import keysCertsChainGet from './keysCertsChainGet';
import keysCertsGet from './keysCertsGet';
import keysDecrypt from './keysDecrypt';
import keysEncrypt from './keysEncrypt';
import keysKeyPairRenew from './keysKeyPairRenew';
import keysKeyPairReset from './keysKeyPairReset';
import keysKeyPairRoot from './keysKeyPairRoot';
import keysPasswordChange from './keysPasswordChange';
import keysSign from './keysSign';
import keysVerify from './keysVerify';
import nodesAdd from './nodesAdd';
import nodesClaim from './nodesClaim';
import nodesFind from './nodesFind';
import nodesPing from './nodesPing';
import notificationsClear from './notificationsClear';
import notificationsRead from './notificationsRead';
import notificationsSend from './notificationsSend';
import vaultsClone from './vaultsClone';
import vaultsCreate from './vaultsCreate';
import vaultsDelete from './vaultsDelete';
import vaultsList from './vaultsList';
import vaultsLog from './vaultsLog';
import vaultsPermissionsGet from './vaultsPermissionsGet';
import vaultsPull from './vaultsPull';
import vaultsRename from './vaultsRename';
import vaultsScan from './vaultsScan';
import vaultsShare from './vaultsShare';
import vaultsUnshare from './vaultsUnshare';
import vaultsVersion from './vaultsVersion';
import vaultsSecretsDelete from './vaultsSecretsDelete';
import vaultsSecretsEdit from './vaultsSecretsEdit';
import vaultsSecretsGet from './vaultsSecretsGet';
import vaultsSecretsList from './vaultsSecretsList';
import vaultsSecretsMkdir from './vaultsSecretsMkdir';
import vaultsSecretsNew from './vaultsSecretsNew';
import vaultsSecretsNewDir from './vaultsSecretsNewDir';
import vaultsSecretsRename from './vaultsSecretsRename';
import vaultsSecretsStat from './vaultsSecretsStat';
import * as clientUtils from '../utils';
import { ClientServiceService } from '../../proto/js/polykey/v1/client_service_grpc_pb';

function createService({
  keyManager,
  sessionManager,
  logger = new Logger(createService.name),
  fs = require('fs'),
  ...containerRest
}: {
  pkAgent: PolykeyAgent;
  keyManager: KeyManager;
  vaultManager: VaultManager;
  nodeGraph: NodeGraph;
  nodeConnectionManager: NodeConnectionManager;
  nodeManager: NodeManager;
  identitiesManager: IdentitiesManager;
  gestaltGraph: GestaltGraph;
  sessionManager: SessionManager;
  notificationsManager: NotificationsManager;
  discovery: Discovery;
  sigchain: Sigchain;
  grpcServerClient: GRPCServer;
  grpcServerAgent: GRPCServer;
  fwdProxy: ForwardProxy;
  revProxy: ReverseProxy;
  logger?: Logger;
  fs?: FileSystem;
}) {
  const authenticate = clientUtils.authenticator(sessionManager, keyManager);
  const container = {
    ...containerRest,
    keyManager,
    sessionManager,
    logger,
    fs,
    authenticate,
  };
  const service: IClientServiceServer = {
    agentLockAll: agentLockAll(container),
    agentStatus: agentStatus(container),
    agentStop: agentStop(container),
    agentUnlock: agentUnlock(container),
    gestaltsActionsGetByIdentity: gestaltsActionsGetByIdentity(container),
    gestaltsActionsGetByNode: gestaltsActionsGetByNode(container),
    gestaltsActionsSetByIdentity: gestaltsActionsSetByIdentity(container),
    gestaltsActionsSetByNode: gestaltsActionsSetByNode(container),
    gestaltsActionsUnsetByIdentity: gestaltsActionsUnsetByIdentity(container),
    gestaltsActionsUnsetByNode: gestaltsActionsUnsetByNode(container),
    gestaltsDiscoveryByIdentity: gestaltsDiscoveryByIdentity(container),
    gestaltsDiscoveryByNode: gestaltsDiscoveryByNode(container),
    gestaltsGestaltGetByIdentity: gestaltsGestaltGetByIdentity(container),
    gestaltsGestaltGetByNode: gestaltsGestaltGetByNode(container),
    gestaltsGestaltList: gestaltsGestaltList(container),
    gestaltsGestaltTrustByIdentity: gestaltsGestaltTrustByIdentity(container),
    gestaltsGestaltTrustByNode: gestaltsGestaltTrustByNode(container),
    identitiesAuthenticate: identitiesAuthenticate(container),
    identitiesAuthenticatedGet: identitiesAuthenticatedGet(container),
    identitiesClaim: identitiesClaim(container),
    identitiesInfoGet: identitiesInfoGet(container),
    identitiesInfoConnectedGet: identitiesInfoConnectedGet(container),
    identitiesProvidersList: identitiesProvidersList(container),
    identitiesTokenDelete: identitiesTokenDelete(container),
    identitiesTokenGet: identitiesTokenGet(container),
    identitiesTokenPut: identitiesTokenPut(container),
    keysCertsChainGet: keysCertsChainGet(container),
    keysCertsGet: keysCertsGet(container),
    keysDecrypt: keysDecrypt(container),
    keysEncrypt: keysEncrypt(container),
    keysKeyPairRenew: keysKeyPairRenew(container),
    keysKeyPairReset: keysKeyPairReset(container),
    keysKeyPairRoot: keysKeyPairRoot(container),
    keysPasswordChange: keysPasswordChange(container),
    keysSign: keysSign(container),
    keysVerify: keysVerify(container),
    nodesAdd: nodesAdd(container),
    nodesClaim: nodesClaim(container),
    nodesFind: nodesFind(container),
    nodesPing: nodesPing(container),
    notificationsClear: notificationsClear(container),
    notificationsRead: notificationsRead(container),
    notificationsSend: notificationsSend(container),
    vaultsClone: vaultsClone(container),
    vaultsCreate: vaultsCreate(container),
    vaultsDelete: vaultsDelete(container),
    vaultsList: vaultsList(container),
    vaultsLog: vaultsLog(container),
    vaultsPermissionsGet: vaultsPermissionsGet(container),
    vaultsPull: vaultsPull(container),
    vaultsRename: vaultsRename(container),
    vaultsScan: vaultsScan(container),
    vaultsShare: vaultsShare(container),
    vaultsUnshare: vaultsUnshare(container),
    vaultsVersion: vaultsVersion(container),
    vaultsSecretsDelete: vaultsSecretsDelete(container),
    vaultsSecretsEdit: vaultsSecretsEdit(container),
    vaultsSecretsGet: vaultsSecretsGet(container),
    vaultsSecretsList: vaultsSecretsList(container),
    vaultsSecretsMkdir: vaultsSecretsMkdir(container),
    vaultsSecretsNew: vaultsSecretsNew(container),
    vaultsSecretsNewDir: vaultsSecretsNewDir(container),
    vaultsSecretsRename: vaultsSecretsRename(container),
    vaultsSecretsStat: vaultsSecretsStat(container),
  };
  return service;
}

export default createService;

export { ClientServiceService };
