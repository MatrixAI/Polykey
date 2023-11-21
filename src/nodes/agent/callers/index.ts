import nodesClaimsGet from './nodesClaimsGet';
import nodesClosestActiveConnectionsGet from './nodesClosestActiveConnectionsGet';
import nodesClosestLocalNodesGet from './nodesClosestLocalNodesGet';
import nodesConnectionSignalFinal from './nodesConnectionSignalFinal';
import nodesConnectionSignalInitial from './nodesConnectionSignalInitial';
import nodesCrossSignClaim from './nodesCrossSignClaim';
import notificationsSend from './notificationsSend';
import vaultsGitInfoGet from './vaultsGitInfoGet';
import vaultsGitPackGet from './vaultsGitPackGet';
import vaultsScan from './vaultsScan';

/**
 * Client manifest
 */
const manifestClient = {
  nodesClaimsGet,
  nodesClosestActiveConnectionsGet,
  nodesClosestLocalNodesGet,
  nodesConnectionSignalFinal,
  nodesConnectionSignalInitial,
  nodesCrossSignClaim,
  notificationsSend,
  vaultsGitInfoGet,
  vaultsGitPackGet,
  vaultsScan,
};

type AgentClientManifest = typeof manifestClient;

export default manifestClient;

export {
  nodesClaimsGet,
  nodesClosestActiveConnectionsGet,
  nodesClosestLocalNodesGet,
  nodesConnectionSignalFinal,
  nodesConnectionSignalInitial,
  nodesCrossSignClaim,
  notificationsSend,
  vaultsGitInfoGet,
  vaultsGitPackGet,
  vaultsScan,
};

export type { AgentClientManifest };
