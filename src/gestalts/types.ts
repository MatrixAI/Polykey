import type { JSONValue, Opaque } from '../types';
import type {
  IdentityId,
  ProviderId,
  GestaltIdEncoded,
  ProviderIdentityClaimId,
  NodeId,
  GestaltLinkId,
} from '../ids/types';
import type { SignedClaim, SignedClaimJSON } from '../claims/types';
import type { ClaimLinkIdentity, ClaimLinkNode } from '../claims/payloads';

const gestaltActions = ['notify', 'scan', 'claim'] as const;

type GestaltKey = Opaque<'GestaltKey', Buffer>;

type GestaltInfo =
  | ['node', GestaltNodeInfo]
  | ['identity', GestaltIdentityInfo];

type GestaltNodeInfo = {
  nodeId: NodeId;
  // The `undefined` is a hack to include the optional reserved properties
  [key: string]: JSONValue | undefined;
};

/**
 * Storing `GestaltNodeInfo` into `GestaltGraph` requries JSON serialisation.
 * The `nodeId` is a `IdInternal`, which will be converted to JSON and back.
 */
interface GestaltNodeInfoJSON extends Omit<GestaltNodeInfo, 'nodeId'> {
  nodeId: {
    type: 'IdInternal';
    data: Array<number>;
  };
}

type GestaltIdentityInfo = {
  providerId: ProviderId;
  identityId: IdentityId;
  name?: string;
  email?: string;
  url?: string;
  // The `undefined` is a hack to include the optional reserved properties
  [key: string]: JSONValue | undefined;
};

/**
 * Links are edges between node and identity vertexes.
 * The data within these links would be acquired by discovery.
 */
type GestaltLink =
  | ['node', GestaltLinkNode]
  | ['identity', GestaltLinkIdentity];

type GestaltLinkJSON =
  | ['node', GestaltLinkNodeJSON]
  | ['identity', GestaltLinkIdentityJSON];

/**
 * Linking node to node.
 * The only data required is the `SignedClaim<ClaimLinkNode>`
 */
type GestaltLinkNode = {
  id: GestaltLinkId;
  claim: SignedClaim<ClaimLinkNode>;
  meta: {
    // The `undefined` is a hack to include the optional reserved properties
    [key: string]: JSONValue | undefined;
  };
};

type GestaltLinkNodeJSON = Omit<GestaltLinkNode, 'id' | 'claim'> & {
  id: {
    type: 'IdInternal';
    data: Array<number>;
  };
  claim: SignedClaimJSON<ClaimLinkNode>;
};

/**
 * Link node to identity.
 * The `SignedClaim<ClaimLinkIdentity>` is wrapped in `IdentitySignedClaim`.
 * This provides additional metadata outside of the the `SignedClaim`.
 */
type GestaltLinkIdentity = {
  id: GestaltLinkId;
  claim: SignedClaim<ClaimLinkIdentity>;
  meta: {
    providerIdentityClaimId: ProviderIdentityClaimId;
    url?: string;
    // The `undefined` is a hack to include the optional reserved properties
    [key: string]: JSONValue | undefined;
  };
};

type GestaltLinkIdentityJSON = Omit<GestaltLinkNode, 'id' | 'claim'> & {
  id: {
    type: 'IdInternal';
    data: Array<number>;
  };
  claim: SignedClaimJSON<ClaimLinkIdentity>;
};

type GestaltLinks = Record<GestaltIdEncoded, GestaltLink>;

type GestaltMatrix = Record<GestaltIdEncoded, GestaltLinks>;

type GestaltNodes = Record<GestaltIdEncoded, GestaltNodeInfo>;

type GestaltIdentities = Record<GestaltIdEncoded, GestaltIdentityInfo>;

type Gestalt = {
  matrix: GestaltMatrix;
  nodes: GestaltNodes;
  identities: GestaltIdentities;
};

type GestaltAction = (typeof gestaltActions)[number];
type GestaltActions = Partial<Record<GestaltAction, null>>;

export { gestaltActions };

export type {
  GestaltKey,
  GestaltInfo,
  GestaltNodeInfo,
  GestaltNodeInfoJSON,
  GestaltIdentityInfo,
  GestaltLink,
  GestaltLinkJSON,
  GestaltLinkNode,
  GestaltLinkNodeJSON,
  GestaltLinkIdentity,
  GestaltLinkIdentityJSON,
  GestaltLinks,
  GestaltMatrix,
  GestaltNodes,
  GestaltIdentities,
  Gestalt,
  GestaltAction,
  GestaltActions,
};

export type {
  GestaltId,
  GestaltIdEncoded,
  GestaltLinkId,
  GestaltLinkIdString,
} from '../ids/types';
