import type { DB } from '@matrixai/db';
import type Logger from '@matrixai/logger';
import type KeyRing from '../../../keys/KeyRing';
import type Sigchain from '../../../sigchain/Sigchain';
import type ACL from '../../../acl/ACL';
import type NodeGraph from '../../../nodes/NodeGraph';
import type NodeManager from '../../../nodes/NodeManager';
import type NodeConnectionManager from '../../../nodes/NodeConnectionManager';
import type NotificationsManager from '../../../notifications/NotificationsManager';
import type VaultManager from '../../../vaults/VaultManager';
import NodesClaimsGet from './NodesClaimsGet';
import NodesClosestLocalNodesGet from './NodesClosestLocalNodesGet';
import NodesCrossSignClaim from './NodesCrossSignClaim';
import NodesHolePunchMessageSend from './NodesHolePunchMessageSend';
import NotificationsSend from './NotificationsSend';
import VaultsGitInfoGet from './VaultsGitInfoGet';
import VaultsGitPackGet from './VaultsGitPackGet';
import VaultsScan from './VaultsScan';

/**
 * Server manifest factory.
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
    nodesClaimsGet: new NodesClaimsGet(container),
    nodesClosestLocalNodesGet: new NodesClosestLocalNodesGet(container),
    nodesCrossSignClaim: new NodesCrossSignClaim(container),
    nodesHolePunchMessageSend: new NodesHolePunchMessageSend(container),
    notificationsSend: new NotificationsSend(container),
    vaultsGitInfoGet: new VaultsGitInfoGet(container),
    vaultsGitPackGet: new VaultsGitPackGet(container),
    vaultsScan: new VaultsScan(container),
  };
};

export default manifestServer;

export {
  NodesClaimsGet,
  NodesClosestLocalNodesGet,
  NodesCrossSignClaim,
  NodesHolePunchMessageSend,
  NotificationsSend,
  VaultsGitInfoGet,
  VaultsGitPackGet,
  VaultsScan,
};
