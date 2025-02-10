import type {
  JSONObject,
  JSONRPCRequestParams,
  JSONRPCResponseResult,
} from '@matrixai/rpc';
import type { SignedTokenEncoded } from '../../tokens/types';
import type {
  AuditEventId,
  AuditEventIdEncoded,
  ClaimIdEncoded,
  NodeIdEncoded,
  VaultIdEncoded,
} from '../../ids';
import type { VaultAction, VaultName } from '../../vaults/types';
import type { SignedNotification } from '../../notifications/types';
import type { Host, Hostname, Port } from '../../network/types';
import type { NetworkId, NodeContact } from '../../nodes/types';

type AgentRPCRequestParams<T extends JSONObject = JSONObject> =
  JSONRPCRequestParams<T>;

type AgentRPCResponseResult<T extends JSONObject = JSONObject> =
  JSONRPCResponseResult<T>;

type AuditIdMessage = {
  auditIdEncoded: AuditEventIdEncoded;
  seek?: AuditEventId | number;
  seekEnd?: AuditEventId | number;
  order?: 'asc' | 'desc';
  limit?: number;
};

type AgentAuditMessage = Partial<AuditIdMessage> & {};

type NodesClaimsGetMessage = {
  seek?: ClaimIdEncoded | number;
  order?: 'asc' | 'desc';
  limit?: number;    
}

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
