import type { IdentityKey, ProviderKey, PeerId } from '../types';

/**
 * Link key must uniquely identify the cryptolink on the identity provider.
 * The provider may not support creating multiple links.
 * In some cases the link is also the same as the identity key
 * if the identity also stores the cryptolink.
 */
type LinkKey = string;

type LinkClaimIdentity = {
  type: "identity";
  node: string;
  identity: IdentityKey;
  provider: ProviderKey;
  dateIssued: string;
  signature: string;
};

type LinkClaimNode = {
  type: "node";
  node1: PeerId;
  node2: PeerId;
  dateIssued: string;
  signature: string;
};

type LinkClaim = LinkClaimIdentity | LinkClaimNode;

type LinkInfoIdentity = LinkClaimIdentity & {
  key: LinkKey;
  url?: string;
};

type LinkInfoNode = LinkClaimNode & {
  key: LinkKey;
  url?: string;
};

type LinkInfo = LinkInfoIdentity | LinkInfoNode;

export {
  LinkKey,
  LinkClaimIdentity,
  LinkClaimNode,
  LinkClaim,
  LinkInfoIdentity,
  LinkInfoNode,
  LinkInfo
};
