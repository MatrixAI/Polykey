import nodesAuthenticateConnection from './nodesAuthenticateConnection';
import nodesClaimsGet from './nodesClaimsGet';
import nodesClosestActiveConnectionsGet from './nodesClosestActiveConnectionsGet';
import nodesClosestLocalNodesGet from './nodesClosestLocalNodesGet';
import nodesConnectionSignalFinal from './nodesConnectionSignalFinal';
import nodesConnectionSignalInitial from './nodesConnectionSignalInitial';
import nodesCrossSignClaim from './nodesCrossSignClaim';
import nodesClaimNetworkSign from './nodesClaimNetworkSign';
import nodesClaimNetworkVerify from './nodesClaimNetworkVerify';
import notificationsSend from './notificationsSend';
import vaultsGitInfoGet from './vaultsGitInfoGet';
import vaultsGitPackGet from './vaultsGitPackGet';
import vaultsScan from './vaultsScan';

/**
 * Client manifest
 */
const manifestClient = {
  nodesAuthenticateConnection,
  nodesClaimsGet,
  nodesClosestActiveConnectionsGet,
  nodesClosestLocalNodesGet,
  nodesConnectionSignalFinal,
  nodesConnectionSignalInitial,
  nodesCrossSignClaim,
  nodesClaimNetworkSign,
  nodesClaimNetworkVerify,
  notificationsSend,
  vaultsGitInfoGet,
  vaultsGitPackGet,
  vaultsScan,
};

type AgentClientManifest = typeof manifestClient;

export default manifestClient;

export {
  nodesAuthenticateConnection,
  nodesClaimsGet,
  nodesClosestActiveConnectionsGet,
  nodesClosestLocalNodesGet,
  nodesConnectionSignalFinal,
  nodesConnectionSignalInitial,
  nodesCrossSignClaim,
  nodesClaimNetworkSign,
  nodesClaimNetworkVerify,
  notificationsSend,
  vaultsGitInfoGet,
  vaultsGitPackGet,
  vaultsScan,
};

export type { AgentClientManifest };
