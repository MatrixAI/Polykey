import type {
  JSONObject,
  JSONRPCRequestParams,
  JSONRPCResponseResult,
} from '@matrixai/rpc';
import type { SignedTokenEncoded } from '../../tokens/types';
import type { ClaimIdEncoded, NodeIdEncoded, VaultIdEncoded } from '../../ids';
import type { VaultAction, VaultName } from '../../vaults/types';
import type { SignedNotification } from '../../notifications/types';
import type { Host, Hostname, Port } from '@/network/types';

type AgentRPCRequestParams<T extends JSONObject = JSONObject> =
  JSONRPCRequestParams<T>;

type AgentRPCResponseResult<T extends JSONObject = JSONObject> =
  JSONRPCResponseResult<T>;

type ClaimIdMessage = {
  claimIdEncoded: ClaimIdEncoded;
};

type AgentClaimMessage = Partial<ClaimIdMessage> & {
  signedTokenEncoded: SignedTokenEncoded;
};

type NodeIdMessage = {
  nodeIdEncoded: NodeIdEncoded;
};

type AddressMessage = {
  host: string;
  port: number;
};

type NodeAddressMessage = NodeIdMessage & AddressMessage;

type ActiveConnectionDataMessage = {
  nodeId: NodeIdEncoded;
  connections: Record<
    string,
    {
      host: Host;
      hostName: Hostname | undefined;
      port: Port;
      timeout: number | undefined;
      primary: boolean;
    }
  >;
};

type HolePunchRequestMessage = {
  sourceNodeIdEncoded: NodeIdEncoded;
  targetNodeIdEncoded: NodeIdEncoded;
  address: AddressMessage;
  requestSignature: string;
  relaySignature: string;
};

type HolePunchSignalMessage = {
  targetNodeIdEncoded: NodeIdEncoded;
  signature: string;
};

type SignedNotificationEncoded = {
  signedNotificationEncoded: SignedNotification;
};

type VaultInfo = {
  vaultIdEncoded: VaultIdEncoded;
  vaultName: VaultName;
};

type VaultsScanMessage = VaultInfo & {
  vaultPermissions: Array<VaultAction>;
};

export type {
  AgentRPCRequestParams,
  AgentRPCResponseResult,
  ClaimIdMessage,
  AgentClaimMessage,
  NodeIdMessage,
  AddressMessage,
  NodeAddressMessage,
  ActiveConnectionDataMessage,
  HolePunchRequestMessage,
  HolePunchSignalMessage,
  SignedNotificationEncoded,
  VaultInfo,
  VaultsScanMessage,
};
