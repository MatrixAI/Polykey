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
import { NodesChainDataGetHandler } from './nodesChainDataGet';
import { EchoHandler } from './echo';
import { VaultsScanHandler } from './vaultsScan';
import { VaultsGitInfoGetHandler } from './vaultsGitInfoGet';
import { VaultsGitPackGetHandler } from './vaultsGitPackGet';

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
    echo: new EchoHandler(container),
    nodesChainDataGet: new NodesChainDataGetHandler(container),
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
