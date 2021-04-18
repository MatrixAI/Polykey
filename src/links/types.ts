import type { NodeId } from '../nodes/types';
import type { ProviderId, IdentityId } from '../identities/types';

/**
 * Link Id must uniquely identify the cryptolink on the identity provider.
 * If the LinkId is on a node , it uniquely identifies the cryptolink on the node
 * The provider may not support creating multiple links.
 * In some cases the link is also the same as the identity id.
 * if the identity also stores the cryptolink.
 * If the LinkId is unique on the node, then it is unique a root certificate.
 */
type LinkId = string;

type LinkClaimIdentity = {
  type: 'identity';
  node: NodeId;
  provider: ProviderId;
  identity: IdentityId;
  timestamp: number;
  signature: string;
};

type LinkClaimNode = {
  type: 'node';
  node1: NodeId;
  node2: NodeId;
  timestamp: number;
};

type LinkClaim = LinkClaimIdentity | LinkClaimNode;

type LinkInfoIdentity = LinkClaimIdentity & {
  id: LinkId;
  url?: string;
};

type LinkInfoNode = LinkClaimNode & {
  id: LinkId;
};

type LinkInfo = LinkInfoIdentity | LinkInfoNode;

export type {
  LinkId,
  LinkClaimIdentity,
  LinkClaimNode,
  LinkClaim,
  LinkInfoIdentity,
  LinkInfoNode,
  LinkInfo,
};
