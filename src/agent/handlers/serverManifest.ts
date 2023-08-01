import type { DB } from '@matrixai/db';
import type Sigchain from '../../sigchain/Sigchain';
import type NodeGraph from '../../nodes/NodeGraph';
import type ACL from '../../acl/ACL';
import type NodeManager from '../../nodes/NodeManager';
import type KeyRing from '../../keys/KeyRing';
import type NodeConnectionManager from '../../nodes/NodeConnectionManager';
import type Logger from '@matrixai/logger';
import type { NotificationsManager } from '../../notifications';
import type { VaultManager } from '../../vaults';
import { NodesClosestLocalNodesGetHandler } from './nodesClosestLocalNodesGet';
import { NodesHolePunchMessageSendHandler } from './nodesHolePunchMessageSend';
import { NodesCrossSignClaimHandler } from './nodesCrossSignClaim';
import { NotificationsSendHandler } from './notificationsSend';
import { NodesClaimsGetHandler } from './nodesClaimsGet';
import { VaultsScanHandler } from './vaultsScan';
import { VaultsGitInfoGetHandler } from './vaultsGitInfoGet';
import { VaultsGitPackGetHandler } from './vaultsGitPackGet';

/**
 * All the server handler definitions for the AgentServer RPC.
 * This will take the container of all the required dependencies and create the server handlers.
 *
 * Used by the RPCServer to register handlers and enforce types.
 */
const serverManifest = (container: {
  db: DB;
  sigchain: Sigchain;
  nodeGraph: NodeGraph;
  acl: ACL;
  nodeManager: NodeManager;
  nodeConnectionManager: NodeConnectionManager;
  keyRing: KeyRing;
  logger: Logger;
  notificationsManager: NotificationsManager;
  vaultManager: VaultManager;
}) => {
  return {
    nodesClaimsGet: new NodesClaimsGetHandler(container),
    nodesClosestLocalNodesGet: new NodesClosestLocalNodesGetHandler(container),
    nodesCrossSignClaim: new NodesCrossSignClaimHandler(container),
    nodesHolePunchMessageSend: new NodesHolePunchMessageSendHandler(container),
    notificationsSend: new NotificationsSendHandler(container),
    VaultsGitInfoGet: new VaultsGitInfoGetHandler(container),
    VaultsGitPackGet: new VaultsGitPackGetHandler(container),
    vaultsScan: new VaultsScanHandler(container),
  };
};

export { serverManifest };
