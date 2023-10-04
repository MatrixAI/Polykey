import type { NodeId, NodeIdString, NodeIdEncoded } from '../ids/types';
import type { Host, Hostname, Port } from '../network/types';

/**
 * Key indicating which space the NodeGraph is in
 */
type NodeGraphSpace = '0' | '1';

type NodeAddress = {
  host: Host | Hostname;
  port: Port;
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

type NodesOptions = {
  connectionIdleTimeoutTime: number;
  connectionFindConcurrencyLimit: number;
  connectionConnectTimeoutTime: number;
  connectionKeepAliveTimeoutTime: number;
  connectionKeepAliveIntervalTime: number;
  connectionHolePunchIntervalTime: number;
  rpcParserBufferSize: number;
  rpcCallTimeoutTime: number;
};

export type {
  NodeId,
  NodeIdString,
  NodeIdEncoded,
  NodeAddress,
  SeedNodes,
  NodeBucketIndex,
  NodeBucketMeta,
  NodeBucket,
  NodeData,
  NodeGraphSpace,
  NodesOptions,
};
