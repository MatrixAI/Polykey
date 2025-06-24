import type { ClientManifest } from '@matrixai/rpc';
import nodesAuthenticateConnection from './nodesAuthenticateConnection.js';
import nodesClaimNetworkAuthorityGet from './nodesClaimNetworkAuthorityGet.js';
import nodesClaimsGet from './nodesClaimsGet.js';
import nodesClosestActiveConnectionsGet from './nodesClosestActiveConnectionsGet.js';
import nodesClosestLocalNodesGet from './nodesClosestLocalNodesGet.js';
import nodesConnectionSignalFinal from './nodesConnectionSignalFinal.js';
import nodesConnectionSignalInitial from './nodesConnectionSignalInitial.js';
import nodesCrossSignClaim from './nodesCrossSignClaim.js';
import nodesClaimNetworkSign from './nodesClaimNetworkSign.js';
import notificationsSend from './notificationsSend.js';
import vaultsGitInfoGet from './vaultsGitInfoGet.js';
import vaultsGitPackGet from './vaultsGitPackGet.js';
import vaultsScan from './vaultsScan.js';

const manifestClientNodeConnectionManager = {
  nodesConnectionSignalFinal,
  nodesConnectionSignalInitial,
  nodesAuthenticateConnection,
} satisfies ClientManifest;

type AgentClientManifestNodeConnectionManager =
  typeof manifestClientNodeConnectionManager & ClientManifest;

const manifestClientNodeManager = {
  nodesClaimNetworkAuthorityGet,
  nodesClaimsGet,
  nodesClaimNetworkSign,
  nodesClosestActiveConnectionsGet,
  nodesClosestLocalNodesGet,
  nodesCrossSignClaim,
  ...manifestClientNodeConnectionManager,
} satisfies ClientManifest;

type AgentClientManifestNodeManager = typeof manifestClientNodeManager &
  ClientManifest;

/**
 * Client manifest
 */
const manifestClient = {
  ...manifestClientNodeConnectionManager,
  ...manifestClientNodeManager,
  notificationsSend,
  vaultsGitInfoGet,
  vaultsGitPackGet,
  vaultsScan,
} satisfies ClientManifest;

type AgentClientManifest = typeof manifestClient;

export default manifestClient;

export {
  manifestClientNodeConnectionManager,
  manifestClientNodeManager,
  nodesAuthenticateConnection,
  nodesClaimsGet,
  nodesClosestActiveConnectionsGet,
  nodesClosestLocalNodesGet,
  nodesConnectionSignalFinal,
  nodesConnectionSignalInitial,
  nodesCrossSignClaim,
  nodesClaimNetworkSign,
  notificationsSend,
  vaultsGitInfoGet,
  vaultsGitPackGet,
  vaultsScan,
};

export type {
  AgentClientManifestNodeConnectionManager,
  AgentClientManifestNodeManager,
  AgentClientManifest,
};
