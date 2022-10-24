import type { NodeId, NodeIdString, NodeIdEncoded } from '../ids/types';
import type { Host, Hostname, Port } from '../network/types';
import type { Claim, ClaimId } from '../claims/types';
import type { ChainData } from '../sigchain/types';

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
  NodeGraphOp,
  NodeGraphSpace,
};
