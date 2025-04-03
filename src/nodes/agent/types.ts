import type {
  JSONObject,
  JSONRPCRequestParams,
  JSONRPCResponseResult,
} from '@matrixai/rpc';
import type { SignedTokenEncoded } from '../../tokens/types.js';
import type {
  AuditEventIdEncoded,
  ClaimIdEncoded,
  NodeIdEncoded,
  VaultIdEncoded,
} from '../../ids/index.js';
import type { VaultAction, VaultName } from '../../vaults/types.js';
import type { SignedNotification } from '../../notifications/types.js';
import type { Host, Hostname, Port } from '../../network/types.js';
import type { NetworkId, NodeContact } from '../../nodes/types.js';
import type { AuditEvent } from '../../audit/types.js';

type AgentRPCRequestParams<T extends JSONObject = JSONObject> =
  JSONRPCRequestParams<T>;

type AgentRPCResponseResult<T extends JSONObject = JSONObject> =
  JSONRPCResponseResult<T>;

type AuditIdMessage = {
  seek?: AuditEventIdEncoded | number;
  seekEnd?: AuditEventIdEncoded | number;
  order?: 'asc' | 'desc';
  limit?: number;
};

type AgentAuditMessage<T extends AuditEvent> = Omit<T, 'id'> & {
  id: AuditEventIdEncoded;
};

type NodesClaimsGetMessage = {
  seek?: ClaimIdEncoded | number;
  order?: 'asc' | 'desc';
  limit?: number;
};

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

type NodeContactMessage = NodeIdMessage & {
  nodeContact: NodeContact;
};

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

type SuccessMessage = {
  type: 'success';
  success: boolean;
};

type NodesAuthenticateConnectionMessage =
  | NodesAuthenticateConnectionMessageBasicPublic
  | NodesAuthenticateConnectionMessageNone;

type NodesAuthenticateConnectionMessageBasicPublic = {
  type: 'NodesAuthenticateConnectionMessageBasicPublic';
  networkId: NetworkId;
};
type NodesAuthenticateConnectionMessageNone = {
  type: 'NodesAuthenticateConnectionMessageNone';
};

export type {
  AgentRPCRequestParams,
  AgentRPCResponseResult,
  AuditIdMessage,
  AgentAuditMessage,
  NodesClaimsGetMessage,
  ClaimIdMessage,
  AgentClaimMessage,
  NodeIdMessage,
  AddressMessage,
  NodeContactMessage,
  ActiveConnectionDataMessage,
  HolePunchRequestMessage,
  HolePunchSignalMessage,
  SignedNotificationEncoded,
  VaultInfo,
  VaultsScanMessage,
  SuccessMessage,
  NodesAuthenticateConnectionMessage,
  NodesAuthenticateConnectionMessageBasicPublic,
  NodesAuthenticateConnectionMessageNone,
};
