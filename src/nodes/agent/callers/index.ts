import type { ClientManifest } from '@matrixai/rpc';
import nodesAuthenticateConnection from './nodesAuthenticateConnection.js';
import nodesAuditEventsGet from './nodesAuditEventsGet.js';
import nodesClaimsGet from './nodesClaimsGet.js';
import nodesClosestActiveConnectionsGet from './nodesClosestActiveConnectionsGet.js';
import nodesClosestLocalNodesGet from './nodesClosestLocalNodesGet.js';
import nodesConnectionSignalFinal from './nodesConnectionSignalFinal.js';
import nodesConnectionSignalInitial from './nodesConnectionSignalInitial.js';
import nodesCrossSignClaim from './nodesCrossSignClaim.js';
import nodesClaimNetworkSign from './nodesClaimNetworkSign.js';
import nodesClaimNetworkVerify from './nodesClaimNetworkVerify.js';
import notificationsSend from './notificationsSend.js';
import vaultsGitInfoGet from './vaultsGitInfoGet.js';
import vaultsGitPackGet from './vaultsGitPackGet.js';
import vaultsScan from './vaultsScan.js';

const manifestClientCore = {
  nodesConnectionSignalFinal,
  nodesConnectionSignalInitial,
  nodesAuthenticateConnection,
} satisfies ClientManifest;

type AgentClientManifestCore = typeof manifestClientCore & ClientManifest;

/**
 * Client manifest
 */
const manifestClient = {
  ...manifestClientCore,
  nodesAuditEventsGet,
  nodesClaimsGet,
  nodesClosestActiveConnectionsGet,
  nodesClosestLocalNodesGet,
  nodesCrossSignClaim,
  nodesClaimNetworkSign,
  nodesClaimNetworkVerify,
  notificationsSend,
  vaultsGitInfoGet,
  vaultsGitPackGet,
  vaultsScan,
} satisfies ClientManifest;

type AgentClientManifest = typeof manifestClient;

export default manifestClient;

export {
  manifestClientCore,
  nodesAuthenticateConnection,
  nodesAuditEventsGet,
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

export type { AgentClientManifestCore, AgentClientManifest };
