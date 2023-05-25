import type { NodeId, NodeIdString, NodeIdEncoded } from '../ids/types';
import type { Host, Hostname, Port } from '../network/types';
import type { Crypto } from '@matrixai/quic';
import type { Host as QUICHost, Port as QUICPort } from '@matrixai/quic';
import type { QUICConfig } from '@matrixai/quic/dist/config';

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

type QUICClientConfig = {
  crypto: {
    key: ArrayBuffer;
    ops: Crypto;
  };
  localHost?: QUICHost;
  localPort?: QUICPort;
  config?: QUICConfig;
  keepaliveIntervalTime?: number;
  maxReadableStreamBytes?: number;
  maxWritableStreamBytes?: number;
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
  QUICClientConfig,
};
