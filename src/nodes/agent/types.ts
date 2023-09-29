import type { SignedTokenEncoded } from '../../tokens/types';
import type { ClaimIdEncoded, NodeIdEncoded, VaultIdEncoded } from '../../ids';
import type { VaultAction, VaultName } from '../../vaults/types';
import type { SignedNotification } from '../../notifications/types';
import type { JSONValue, ObjectEmpty } from '../../types';

// Prevent overwriting the metadata type with `Omit<>`
type AgentRPCRequestParams<T extends Record<string, JSONValue> = ObjectEmpty> =
  {
    metadata?: {
      [Key: string]: JSONValue;
    } & Partial<{
      authorization: string;
      timeout: number;
    }>;
  } & Omit<T, 'metadata'>;

// Prevent overwriting the metadata type with `Omit<>`
type AgentRPCResponseResult<T extends Record<string, JSONValue> = ObjectEmpty> =
  {
    metadata?: {
      [Key: string]: JSONValue;
    } & Partial<{
      authorization: string;
      timeout: number;
    }>;
  } & Omit<T, 'metadata'>;

export type ClaimIdMessage = {
  claimIdEncoded: ClaimIdEncoded;
};

export type AgentClaimMessage = Partial<ClaimIdMessage> & {
  signedTokenEncoded: SignedTokenEncoded;
};

export type NodeIdMessage = {
  nodeIdEncoded: NodeIdEncoded;
};

export type AddressMessage = {
  host: string;
  port: number;
};

export type NodeAddressMessage = NodeIdMessage & AddressMessage;

export type HolePunchRelayMessage = {
  srcIdEncoded: NodeIdEncoded;
  dstIdEncoded: NodeIdEncoded;
  address?: AddressMessage;
};

export type SignedNotificationEncoded = {
  signedNotificationEncoded: SignedNotification;
};

export type VaultInfo = {
  vaultIdEncoded: VaultIdEncoded;
  vaultName: VaultName;
};

export type VaultsScanMessage = VaultInfo & {
  vaultPermissions: Array<VaultAction>;
};

export type {
  AgentRPCRequestParams,
  AgentRPCResponseResult
};
