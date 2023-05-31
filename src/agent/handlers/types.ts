import type { SignedTokenEncoded } from '../../tokens/types';
import type { ClaimIdEncoded, NodeIdEncoded, VaultIdEncoded } from '../../ids';
import type { VaultAction, VaultName } from '../../vaults/types';
import type { SignedNotification } from '../../notifications/types';

export type EchoMessage = {
  message: string;
};

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

export type VaultsGitInfoGetMessage = {
  vaultNameOrId: VaultIdEncoded | VaultName;
  action: VaultAction;
};

export type GitPackMessage = {
  /**
   * Chunk of data in binary form;
   */
  chunk: string;
};

export type VaultsGitPackGetMessage = {
  body: string;
};
