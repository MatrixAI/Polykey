import type { NodeId, NodeIdString, NodeIdEncoded } from '../ids/types';
import type { Host, Hostname, Port } from '../network/types';

/**
 * Key indicating which space the NodeGraph is in
 */
type NodeGraphSpace = '0' | '1';

type NodeAddressScope = 'local' | 'external';

type NodeAddress = {
  host: Host | Hostname;
  port: Port;
  scopes: Array<NodeAddressScope>;
};

type NodeBucketIndex = number;

type NodeBucket = Array<[NodeId, NodeData]>;

type NodeBucketMeta = {
  count: number;
};

type NodeData = {
  address: NodeAddress;
  lastUpdated: number;
};

type SeedNodes = Record<NodeIdEncoded, NodeAddress>;

export type {
  NodeId,
  NodeIdString,
  NodeIdEncoded,
  NodeAddressScope,
  NodeAddress,
  SeedNodes,
  NodeBucketIndex,
  NodeBucketMeta,
  NodeBucket,
  NodeData,
  NodeGraphSpace,
};
