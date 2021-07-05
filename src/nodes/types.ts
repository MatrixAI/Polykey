import type { Opaque } from '../types';
import type { Address, Host, Port } from '../network/types';
import type { Claim, ClaimId } from '../claims/types';
import type { ChainData } from '../sigchain/types';
import type { PublicKeyPem } from '../keys/types';

type NodeId = Opaque<'NodeId', string>;

type NodeDetails = {
  id: NodeId;
  publicKey: PublicKeyPem;
  address: Address;
};

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
  NodeDetails,
  NodeAddress,
  NodeData,
  NodeClaim,
  NodeInfo,
  NodeBucketIndex,
  NodeBucket,
  NodeConnection,
  NodeGraphOp,
};
