import type { LinkInfoIdentity, LinkInfoNode } from '../links/types';
import type { GestaltKey } from '../gestalts/types';
import type { Opaque } from '../types';

type NodeId = Opaque<string, 'NodeId'>;

type NodeAddress = {
  ip: string;
  port: number;
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
  [key: string]: NodeAddress;
};

type NodeConnection = { placeholder: true };

export type {
  NodeId,
  NodeAddress,
  NodeInfo,
  NodeBucket,
  NodeConnection,
  NodeLinks,
};
