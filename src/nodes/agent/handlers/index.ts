import type { DB } from '@matrixai/db';
import type Logger from '@matrixai/logger';
import type KeyRing from '../../../keys/KeyRing.js';
import type Audit from '../../../audit/Audit.js';
import type Sigchain from '../../../sigchain/Sigchain.js';
import type ACL from '../../../acl/ACL.js';
import type NodeGraph from '../../../nodes/NodeGraph.js';
import type NodeManager from '../../../nodes/NodeManager.js';
import type NodeConnectionManager from '../../../nodes/NodeConnectionManager.js';
import type NotificationsManager from '../../../notifications/NotificationsManager.js';
import type VaultManager from '../../../vaults/VaultManager.js';
import NodesAuthenticateConnection from './NodesAuthenticateConnection.js';
import NodesAuditEventsGet from './NodesAuditEventsGet.js';
import NodesClaimsGet from './NodesClaimsGet.js';
import NodesClosestActiveConnectionsGet from './NodesClosestActiveConnectionsGet.js';
import NodesClosestLocalNodesGet from './NodesClosestLocalNodesGet.js';
import NodesConnectionSignalFinal from './NodesConnectionSignalFinal.js';
import NodesConnectionSignalInitial from './NodesConnectionSignalInitial.js';
import NodesCrossSignClaim from './NodesCrossSignClaim.js';
import NodesClaimNetworkSign from './NodesClaimNetworkSign.js';
import NotificationsSend from './NotificationsSend.js';
import VaultsGitInfoGet from './VaultsGitInfoGet.js';
import VaultsGitPackGet from './VaultsGitPackGet.js';
import VaultsScan from './VaultsScan.js';

/**
 * Server manifest factory.
 */
const manifestServer = (container: {
  audit: Audit;
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
    nodesAuthenticateConnection: new NodesAuthenticateConnection(container),
    nodesAuditEventsGet: new NodesAuditEventsGet(container),
    nodesClaimsGet: new NodesClaimsGet(container),
    nodesClosestActiveConnectionsGet: new NodesClosestActiveConnectionsGet(
      container,
    ),
    nodesClosestLocalNodesGet: new NodesClosestLocalNodesGet(container),
    nodesConnectionSignalFinal: new NodesConnectionSignalFinal(container),
    nodesConnectionSignalInitial: new NodesConnectionSignalInitial(container),
    nodesCrossSignClaim: new NodesCrossSignClaim(container),
    nodesClaimNetworkSign: new NodesClaimNetworkSign(container),
    notificationsSend: new NotificationsSend(container),
    vaultsGitInfoGet: new VaultsGitInfoGet(container),
    vaultsGitPackGet: new VaultsGitPackGet(container),
    vaultsScan: new VaultsScan(container),
  };
};

type AgentServerManifest = ReturnType<typeof manifestServer>;

export default manifestServer;

export {
  NodesAuthenticateConnection,
  NodesAuditEventsGet,
  NodesClaimsGet,
  NodesClosestActiveConnectionsGet,
  NodesClosestLocalNodesGet,
  NodesConnectionSignalFinal,
  NodesConnectionSignalInitial,
  NodesCrossSignClaim,
  NodesClaimNetworkSign,
  NotificationsSend,
  VaultsGitInfoGet,
  VaultsGitPackGet,
  VaultsScan,
};

export type { AgentServerManifest };
