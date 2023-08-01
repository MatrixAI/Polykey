import type { AgentRPCRequestParams, AgentRPCResponseResult } from '../types';
import type {
  AgentClaimMessage,
  ClaimIdMessage,
  GitPackMessage,
  HolePunchRelayMessage,
  NodeAddressMessage,
  NodeIdMessage,
  SignedNotificationEncoded,
  VaultInfo,
  VaultsGitInfoGetMessage,
  VaultsGitPackGetMessage,
  VaultsScanMessage,
} from './types';
import { DuplexCaller, ServerCaller, UnaryCaller } from '../../rpc/callers';

const nodesClaimsGet = new ServerCaller<
  AgentRPCRequestParams<ClaimIdMessage>,
  AgentRPCResponseResult<AgentClaimMessage>
>();

const nodesClosestLocalNodesGet = new ServerCaller<
  AgentRPCRequestParams<NodeIdMessage>,
  AgentRPCResponseResult<NodeAddressMessage>
>();

const nodesCrossSignClaim = new DuplexCaller<
  AgentRPCRequestParams<AgentClaimMessage>,
  AgentRPCResponseResult<AgentClaimMessage>
>();

const nodesHolePunchMessageSend = new UnaryCaller<
  AgentRPCRequestParams<HolePunchRelayMessage>,
  AgentRPCResponseResult
>();

const notificationsSend = new UnaryCaller<
  AgentRPCRequestParams<SignedNotificationEncoded>,
  AgentRPCResponseResult
>();

const vaultsGitInfoGet = new ServerCaller<
  AgentRPCRequestParams<VaultsGitInfoGetMessage>,
  AgentRPCResponseResult<VaultInfo | GitPackMessage>
>();

const vaultsGitPackGet = new ServerCaller<
  AgentRPCRequestParams<VaultsGitPackGetMessage>,
  AgentRPCResponseResult<GitPackMessage>
>();

const vaultsScan = new ServerCaller<
  AgentRPCRequestParams,
  AgentRPCResponseResult<VaultsScanMessage>
>();

/**
 * All the client caller definitions for the AgentClient RPC.
 * Used by the RPCClient to register callers and enforce types.
 *
 * No type used here, it will override type inference.
 */
const clientManifest = {
  nodesClaimsGet,
  nodesClosestLocalNodesGet,
  nodesCrossSignClaim,
  nodesHolePunchMessageSend,
  notificationsSend,
  vaultsGitInfoGet,
  vaultsGitPackGet,
  vaultsScan,
};

export {
  clientManifest,
  nodesClaimsGet,
  nodesClosestLocalNodesGet,
  nodesCrossSignClaim,
  nodesHolePunchMessageSend,
  notificationsSend,
  vaultsGitInfoGet,
  vaultsGitPackGet,
  vaultsScan,
};
