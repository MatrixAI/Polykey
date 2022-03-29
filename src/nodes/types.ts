import type { Id } from '@matrixai/id';
import type { Opaque } from '../types';
import type { Host, Hostname, Port } from '../network/types';
import type { Claim, ClaimId } from '../claims/types';
import type { ChainData } from '../sigchain/types';

// This should be a string
// actually cause it is a domain
type NodeGraphSpace = '0' | '1';

type NodeId = Opaque<'NodeId', Id>;
type NodeIdString = Opaque<'NodeIdString', string>;
type NodeIdEncoded = Opaque<'NodeIdEncoded', string>;

type NodeAddress = {
  host: Host | Hostname;
  port: Port;
};

type NodeBucketIndex = number;
// Type NodeBucket = Record<NodeIdString, NodeData>;

// TODO:
// No longer need to use NodeIdString
// It's an array, if you want to lookup
// It's ordered by the last updated date
// On the other hand, does this matter
// Not really?
// USE THIS TYPE INSTEAD
type NodeBucket = Array<[NodeId, NodeData]>;

type NodeBucketMeta = {
  count: number;
};

// Type NodeBucketMetaProps = NonFunctionProperties<NodeBucketMeta>;

// Just make the bucket entries also
// bucketIndex anot as a key
// but as the domain
// !!NodeGraph!!meta!!ff!!count

type NodeData = {
  address: NodeAddress;
  lastUpdated: number;
};

// Type NodeBucketEntry = {
//   address: NodeAddress;
//   lastUpdated: Date;
// };

type SeedNodes = Record<NodeIdEncoded, NodeAddress>;

// FIXME: should have a proper name
type NodeEntry = {
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
  id: NodeIdEncoded;
  chain: ChainData;
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
  NodeIdString,
  NodeIdEncoded,
  NodeAddress,
  SeedNodes,
  NodeClaim,
  NodeInfo,
  NodeBucketIndex,
  NodeBucketMeta,
  NodeBucket,
  NodeData,
  NodeEntry,
  // NodeBucketEntry,

  NodeGraphOp,
  NodeGraphSpace,
};
