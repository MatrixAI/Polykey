import type KeyManager from '../../keys/KeyManager';
import type VaultManager from '../../vaults/VaultManager';
import type NodeGraph from '../../nodes/NodeGraph';
import type NodeManager from '../../nodes/NodeManager';
import type NodeConnectionManager from '../../nodes/NodeConnectionManager';
import type NotificationsManager from '../../notifications/NotificationsManager';
import type Sigchain from '../../sigchain/Sigchain';
import type ACL from '../../acl/ACL';
import type GestaltGraph from '../../gestalts/GestaltGraph';
import type { IAgentServiceServer } from '../../proto/js/polykey/v1/agent_service_grpc_pb';
import type Proxy from '../../network/Proxy';
import Logger from '@matrixai/logger';
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

function createService({
  proxy,
  logger = new Logger(createService.name),
  ...containerRest
}: {
  keyManager: KeyManager;
  vaultManager: VaultManager;
  nodeConnectionManager: NodeConnectionManager;
  nodeManager: NodeManager;
  nodeGraph: NodeGraph;
  notificationsManager: NotificationsManager;
  sigchain: Sigchain;
  acl: ACL;
  gestaltGraph: GestaltGraph;
  proxy: Proxy;
  logger?: Logger;
}): IAgentServiceServer {
  const connectionInfoGet = agentUtils.connectionInfoGetter(proxy);
  const container = {
    ...containerRest,
    logger,
    connectionInfoGet: connectionInfoGet,
  };
  const service: IAgentServiceServer = {
    echo: echo(container),
    nodesChainDataGet: nodesChainDataGet(container),
    nodesClaimsGet: nodesClaimsGet(container),
    nodesClosestLocalNodesGet: nodesClosestLocalNodesGet(container),
    nodesCrossSignClaim: nodesCrossSignClaim(container),
    nodesHolePunchMessageSend: nodesHolePunchMessageSend(container),
    notificationsSend: notificationsSend(container),
    vaultsGitInfoGet: vaultsGitInfoGet(container),
    vaultsGitPackGet: vaultsGitPackGet(container),
    vaultsScan: vaultsScan(container),
  };
  return service;
}

export default createService;

export { AgentServiceService };
