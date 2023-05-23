import type { AgentRPCRequestParams, AgentRPCResponseResult } from '../types';
import type { EchoMessage } from './types';
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

const echo = new UnaryCaller<
  AgentRPCRequestParams<EchoMessage>,
  AgentRPCResponseResult<EchoMessage>
>();

const nodeChainDataGet = new ServerCaller<
  AgentRPCRequestParams<ClaimIdMessage>,
  AgentRPCResponseResult<AgentClaimMessage>
>();

// Const nodesClaimsGet = new UnaryCaller<
//   AgentRPCRequestParams,
//   AgentRPCResponseResult
// >();

const nodesClosestLocalNodesGet = new ServerCaller<
  AgentRPCRequestParams<NodeIdMessage>,
  AgentRPCResponseResult<NodeAddressMessage>
>();

// TODO: still to be completed
const nodesCrossSignClaim = new DuplexCaller<
  AgentRPCRequestParams<EchoMessage>,
  AgentRPCResponseResult<EchoMessage>
>();

// TODO: still to be completed
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

// No type used here, it will override type inference
const clientManifest = {
  echo,
  nodeChainDataGet,
  // NodeClaimsGet,
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
  echo,
  nodeChainDataGet,
  // NodeClaimsGet,
  nodesClosestLocalNodesGet,
  nodesCrossSignClaim,
  nodesHolePunchMessageSend,
  notificationsSend,
  vaultsGitInfoGet,
  vaultsGitPackGet,
  vaultsScan,
};
