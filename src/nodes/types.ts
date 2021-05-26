import type { LinkInfoIdentity, LinkInfoNode } from '../links/types';
import type { GestaltKey } from '../gestalts/types';
import type { Opaque } from '../types';
import type { Host, Port } from '../network/types';

type NodeId = Opaque<'NodeId', string>;

type NodeAddress = {
  ip: Host;
  port: Port;
};

type NodeData = {
  id: NodeId;
  address: NodeAddress;
  distance: BigInt;
};

type NodeLinks = {
  nodes: Record<GestaltKey, LinkInfoNode>;
  identities: Record<GestaltKey, LinkInfoIdentity>;
};

type NodeInfo = {
  id: NodeId;
  links: NodeLinks;
};

// The data type to be stored in each leveldb entry for the node table
type NodeBucket = {
  [key: string]: {
    address: NodeAddress;
    lastUpdated: Date;
  };
};

type NodeConnection = {
  placeholder: true;
};

// Only 1 domain, so don't need a 'domain' value (like /gestalts/types.ts)
type NodeGraphOp_ = {
  // Bucket index
  key: number;
  value: NodeBucket;
};

type NodeGraphOp =
  | ({
      type: 'put';
    } & NodeGraphOp_)
  | ({
      type: 'del';
    } & Omit<NodeGraphOp_, 'value'>);

export type {
  NodeId,
  NodeAddress,
  NodeData,
  NodeInfo,
  NodeBucket,
  NodeConnection,
  NodeLinks,
  NodeGraphOp,
};
