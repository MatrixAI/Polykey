import nodesClaimsGet from './nodesClaimsGet';
import nodesClosestLocalNodesGet from './nodesClosestLocalNodesGet';
import nodesCrossSignClaim from './nodesCrossSignClaim';
import nodesHolePunchMessageSend from './nodesHolePunchMessageSend';
import notificationsSend from './notificationsSend';
import vaultsGitInfoGet from './vaultsGitInfoGet';
import vaultsGitPackGet from './vaultsGitPackGet';
import vaultsScan from './vaultsScan';

/**
 * Client manifest
 */
const manifestClient = {
  nodesClaimsGet,
  nodesClosestLocalNodesGet,
  nodesCrossSignClaim,
  nodesHolePunchMessageSend,
  notificationsSend,
  vaultsGitInfoGet,
  vaultsGitPackGet,
  vaultsScan,
};

export default manifestClient;

export {
  nodesClaimsGet,
  nodesClosestLocalNodesGet,
  nodesCrossSignClaim,
  nodesHolePunchMessageSend,
  notificationsSend,
  vaultsGitInfoGet,
  vaultsGitPackGet,
  vaultsScan,
};
