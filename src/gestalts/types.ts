import type { Opaque } from '../types';
import type { NodeIdEncoded, NodeInfo } from '../nodes/types';
import type { IdentityId, ProviderId, IdentityInfo } from '../identities/types';

const gestaltActions = ['notify', 'scan'] as const;

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
type GestaltNodes = Record<GestaltNodeKey, NodeInfo>;
type GestaltIdentities = Record<GestaltIdentityKey, IdentityInfo>;
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
