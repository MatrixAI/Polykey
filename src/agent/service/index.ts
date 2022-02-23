import type { KeyManager } from '../../keys';
import type { VaultManager } from '../../vaults';
import type {
  NodeGraph,
  NodeManager,
  NodeConnectionManager,
} from '../../nodes';
import type { NotificationsManager } from '../../notifications';
import type { Sigchain } from '../../sigchain';
import type { ACL } from '../../acl';
import type { GestaltGraph } from '../../gestalts';
import type { IAgentServiceServer } from '../../proto/js/polykey/v1/agent_service_grpc_pb';
import type ReverseProxy from '../../network/ReverseProxy';
import echo from './echo';
import nodesChainDataGet from './nodesChainDataGet';
import nodesClaimsGet from './nodesClaimsGet';
import nodesClosestLocalNodesGet from './nodesClosestLocalNodesGet';
import nodesCrossSignClaim from './nodesCrossSignClaim';
import nodesHolePunchMessageSend from './nodesHolePunchMessageSend';
import notificationsSend from './notificationsSend';
import vaultsGitInfoGet from './vaultsGitInfoGet';
import vaultsGitPackGet from './vaultsGitPackGet';
import vaultsScan from './vaultsScan';
import { AgentServiceService } from '../../proto/js/polykey/v1/agent_service_grpc_pb';
import * as agentUtils from '../utils';

function createService(container: {
  keyManager: KeyManager;
  vaultManager: VaultManager;
  nodeConnectionManager: NodeConnectionManager;
  nodeManager: NodeManager;
  nodeGraph: NodeGraph;
  notificationsManager: NotificationsManager;
  sigchain: Sigchain;
  acl: ACL;
  gestaltGraph: GestaltGraph;
  revProxy: ReverseProxy;
}): IAgentServiceServer {
  const connectionInfoGet = agentUtils.connectionInfoGetter(container.revProxy);
  const container_ = {
    ...container,
    connectionInfoGet: connectionInfoGet,
  };
  const service: IAgentServiceServer = {
    echo: echo(container_),
    nodesChainDataGet: nodesChainDataGet(container_),
    nodesClaimsGet: nodesClaimsGet(container_),
    nodesClosestLocalNodesGet: nodesClosestLocalNodesGet(container_),
    nodesCrossSignClaim: nodesCrossSignClaim(container_),
    nodesHolePunchMessageSend: nodesHolePunchMessageSend(container_),
    notificationsSend: notificationsSend(container_),
    vaultsGitInfoGet: vaultsGitInfoGet(container_),
    vaultsGitPackGet: vaultsGitPackGet(container_),
    vaultsScan: vaultsScan(container_),
  };
  return service;
}

export default createService;

export { AgentServiceService };
