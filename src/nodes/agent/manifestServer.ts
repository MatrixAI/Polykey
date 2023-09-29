import type { DB } from '@matrixai/db';
import type Logger from '@matrixai/logger';
import type KeyRing from '../../keys/KeyRing';
import type Sigchain from '../../sigchain/Sigchain';
import type ACL from '../../acl/ACL';
import type NodeGraph from '../../nodes/NodeGraph';
import type NodeManager from '../../nodes/NodeManager';
import type NodeConnectionManager from '../../nodes/NodeConnectionManager';
import type { NotificationsManager } from '../../notifications';
import type { VaultManager } from '../../vaults';
import * as handlers from './handlers';

/**
 * All the server handler definitions for the AgentServer RPC.
 * This will take the container of all the required dependencies and create the server handlers.
 *
 * Used by the RPCServer to register handlers and enforce types.
 */
const manifestServer = (container: {
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
    nodesClaimsGet: new handlers.NodesClaimsGet(container),
    nodesClosestLocalNodesGet: new handlers.NodesClosestLocalNodesGet(container),
    nodesCrossSignClaim: new handlers.NodesCrossSignClaim(container),
    nodesHolePunchMessageSend: new handlers.NodesHolePunchMessageSend(container),
    notificationsSend: new handlers.NotificationsSend(container),
    vaultsGitInfoGet: new handlers.VaultsGitInfoGet(container),
    vaultsGitPackGet: new handlers.VaultsGitPackGet(container),
    vaultsScan: new handlers.VaultsScan(container),
  };
};

export { manifestServer };
