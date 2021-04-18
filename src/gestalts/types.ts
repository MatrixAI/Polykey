import type { Opaque } from '../types';
import type { NodeId, NodeInfo } from '../nodes/types';
import type { IdentityId, ProviderId, IdentityInfo } from '../identities/types';

type GestaltGraphKey = Opaque<string, 'GestaltGraphKey'>;
type GestaltGraphValue = GestaltKeySet | NodeInfo | IdentityInfo;
type GestaltGraphDomain = 'matrix' | 'nodes' | 'identities';

// the GestaltId is the actual underlying data
// when we want to differentiate the GestaltKey
type GestaltId =
  | {
      type: 'node';
      nodeId: NodeId;
    }
  | {
      type: 'identity';
      identityId: IdentityId;
      providerId: ProviderId;
    };
type GestaltKey = Opaque<string, 'GestaltKey'>;

type GestaltKeySet = Record<GestaltKey, null>;
type GestaltMatrix = Record<GestaltKey, GestaltKeySet>;
type GestaltNodes = Record<GestaltKey, NodeInfo>;
type GestaltIdentities = Record<GestaltKey, IdentityInfo>;
type Gestalt = {
  matrix: GestaltMatrix;
  nodes: GestaltNodes;
  identities: GestaltIdentities;
};

// the GESTALT GRAPH should only store verified entities
// it should not be storing non verified entities
// the verification process has to use the `identities`
// domain, or the nodes domain
// it doesn't actually have to be synced by the DHT
// the DHT doesn't really matter all that much

type GestaltGraphOp_ =
  | {
      domain: 'matrix';
      key: GestaltKey;
      value: GestaltKeySet;
    }
  | {
      domain: 'nodes';
      key: GestaltKey;
      value: NodeInfo;
    }
  | {
      domain: 'identities';
      key: GestaltKey;
      value: IdentityInfo;
    };

type GestaltGraphOp =
  | ({
      type: 'put';
    } & GestaltGraphOp_)
  | ({
      type: 'del';
    } & Omit<GestaltGraphOp_, 'value'>);

export {
  GestaltKey,
  GestaltKeySet,
  GestaltId,
  GestaltMatrix,
  GestaltNodes,
  GestaltIdentities,
  Gestalt,
  GestaltGraphKey,
  GestaltGraphValue,
  GestaltGraphDomain,
  GestaltGraphOp,
};
