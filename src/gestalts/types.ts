import type { Opaque } from '../types';
import type { NodeIdEncoded } from '../nodes/types';
import type { IdentityId, ProviderId } from '../identities/types';
import { ClaimId } from '@/ids';

const gestaltActions = ['notify', 'scan'] as const;

// CONSOLIDATING the `NodeInfo` and `IdentityInfo` types
// these are just to contain the relevant claim data
// identities contain `ProviderIdentityClaimId -> IdentitySignedClaim`
// nodes contain `ClaimId -> SignedClaim<ClaimLinkNode> | SignedClaim<ClaimLinkIdentity>`
// these parts will be need to be put together
// Change to using wrappers
// if there needs to be wrappers around the claims too? for nodes

/**
 * GestaltNodeInfo = {
 *   id: NodeIdEncoded,
 *   claims: Record<ClaimId, SignedClaim<ClaimLinkNode | ClaimLinkIdentity>>
 * }
 *
 * GestaltIdentityInfo = {
 *   identity: IdentityData,
 *   claims: Record<ProviderIdentityClaimId, IdentitySignedClaim>
 * }
 *
 * I don't like how the structures are NOT consistent.
 * It will make it difficult for them to compare.
 * The other question is what exactly the data we should keep here.
 * Since identity data we can just fetch live. We don't have to keep it in the gestalt
 *
 * So may we do this instead:
 *
 * GestaltNodeInfo = {
 *   id: NodeIdEncoded,
 *   claims: Record<ClaimId, SignedClaim<ClaimLinkNode | ClaimLinkIdentity>>
 * }
 *
 * GestaltIdentityInfo = {
 *   providerId: ProviderIdentityId;
 *   identityId: IdentityId;
 *   claims: Record<ClaimId, IdentitySignedClaim>
 * }
 *
 * Notice how the `IdentitySignedClaim` has additional info.
 * But the other claims doesn't. It doesn't require that additional metadata.
 *
 * But yea, this should be good to go...
 */

// We use these 2 new things
// They have to be encoded forms
// As these will be stored on DISK
// And we cannot store buffers yet
// So all the IDs must be "encoded"

type GestaltNodeInfo = {
  id: NodeIdEncoded;
  chain: Array<[ClaimIdEncoded, SignedClaim<ClaimLinkNode | ClaimLinkIdentity>]>;
};

type GestaltIdentityInfo = {
  providerId: ProviderId;
  identityId: IdentityId;
  claims: Array<[ClaimIdEncoded, IdentitySignedClaim]>;
};

// Why are we using `NodeIdEncoded`?
// Is it becasue it needs to be a string?
// I think so... that's the reason
// Well then we have an issue with `ClaimIdEncoded` too
// It cannto be `ClaimId`
// Since it's a record
// but at the same time, there's no ORDER to these claims
// so it also doesn't make sense
// Also another piece of the pie
// WHY do we store claims at all?
// I guess cause the gestalt is literally about
// Storing the links
// but if so, why store the signatures?
// I guess it's another way of validating it?
// The links are being stored with each one linking the other one
// The gestalt graph is not yet transactional


type GestaltAction = typeof gestaltActions[number];
type GestaltActions = Partial<Record<GestaltAction, null>>;

type GestaltId = GestaltNodeId | GestaltIdentityId;
type GestaltNodeId = {
  type: 'node';
  nodeId: NodeIdEncoded;
};
type GestaltIdentityId = {
  type: 'identity';
  identityId: IdentityId;
  providerId: ProviderId;
};

type GestaltKey = GestaltNodeKey | GestaltIdentityKey;
type GestaltNodeKey = Opaque<'GestaltNodeKey', string>;
type GestaltIdentityKey = Opaque<'GestaltIdentityKey', string>;

type GestaltKeySet = Record<GestaltKey, null>;
type GestaltMatrix = Record<GestaltKey, GestaltKeySet>;
type GestaltNodes = Record<GestaltNodeKey, GestaltNodeInfo>;
type GestaltIdentities = Record<GestaltIdentityKey, GestaltIdentityInfo>;
type Gestalt = {
  matrix: GestaltMatrix;
  nodes: GestaltNodes;
  identities: GestaltIdentities;
};

export { gestaltActions };

export type {
  GestaltAction,
  GestaltActions,
  GestaltId,
  GestaltNodeId,
  GestaltIdentityId,
  GestaltKey,
  GestaltNodeKey,
  GestaltIdentityKey,
  GestaltKeySet,
  GestaltMatrix,
  GestaltNodes,
  GestaltIdentities,
  Gestalt,
};
