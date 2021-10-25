import type { Opaque } from '../types';
import type { NodeId, NodeInfo } from '../nodes/types';
import type { IdentityId, ProviderId, IdentityInfo } from '../identities/types';

type GestaltAction = 'notify' | 'scan';
type GestaltActions = Partial<Record<GestaltAction, null>>;

type GestaltId = GestaltNodeId | GestaltIdentityId;
type GestaltNodeId = {
  type: 'node';
  nodeId: NodeId;
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
