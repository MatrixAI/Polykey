import type NodeConnection from './NodeConnection';
import type { MutexInterface } from 'async-mutex';
import type { Opaque } from '../types';
import type { Host, Port } from '../network/types';
import type { Claim, ClaimId } from '../claims/types';
import type { ChainData } from '../sigchain/types';

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

/**
 * A claim made on a node. That is, can be either:
 *   - a claim from a node -> node
 *   - a claim from a node -> identity
 * Contains the leveldb key of the claim on the sigchain (this is the
 * lexicographic-integer representation of the claim's sequence number).
 */
type NodeClaim = Claim & {
  id: ClaimId;
};

/**
 * Data structure containing the sigchain data of some node.
 * chain: maps ClaimId (lexicographic integer of sequence number) -> Claim
 */
type NodeInfo = {
  id: NodeId;
  chain: ChainData;
};

type NodeBucketIndex = number;

// The data type to be stored in each leveldb entry for the node table
type NodeBucket = {
  [key: string]: {
    address: NodeAddress;
    lastUpdated: Date;
  };
};

/**
 * Data structure to store all NodeConnections. If a connection to a node n does
 * not exist, no entry for n will exist in the map. Alternatively, if a 
 * connection is currently being instantiated by some thread, an entry will 
 * exist in the map, but only with the lock (no connection object). Once a 
 * connection is instantiated, the entry in the map is updated to include the 
 * connection object.
 */
type NodeConnectionMap = Map<NodeId, {
  connection?: NodeConnection;
  lock: MutexInterface;
}>;

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
  NodeClaim,
  NodeInfo,
  NodeBucketIndex,
  NodeBucket,
  NodeConnectionMap,
  NodeGraphOp,
};
