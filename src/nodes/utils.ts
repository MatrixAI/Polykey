import type { NodeData, NodeId, NodeIdEncoded } from './types';
import { IdInternal } from '@matrixai/id';
import { bytes2BigInt } from '../utils';

/**
 * Compute the distance between two nodes.
 * distance = nodeId1 ^ nodeId2
 * where ^ = bitwise XOR operator
 */
function calculateDistance(nodeId1: NodeId, nodeId2: NodeId): bigint {
  const distance = nodeId1.map((byte, i) => byte ^ nodeId2[i]);
  return bytes2BigInt(distance);
}

/**
 * Find the correct index of the k-bucket to add a new node to.
 * A node's k-buckets are organised such that for the ith k-bucket where
 * 0 <= i < nodeIdBits, the contacts in this ith bucket are known to adhere to
 * the following inequality:
 * 2^i <= distance (from current node) < 2^(i+1)
 *
 * NOTE: because XOR is a commutative operation (i.e. a XOR b = b XOR a), the
 * order of the passed parameters is actually irrelevant. These variables are
 * purely named for communicating function purpose.
 */
function calculateBucketIndex(sourceNode: NodeId, targetNode: NodeId): number {
  const distance = sourceNode.map((byte, i) => byte ^ targetNode[i]);
  const MSByteIndex = distance.findIndex((byte) => byte !== 0);
  if (MSByteIndex === -1) {
    throw new RangeError('NodeIds cannot be the same');
  }
  const MSByte = distance[MSByteIndex];
  const MSBitIndex = Math.trunc(Math.log2(MSByte));
  const bytesLeft = distance.byteLength - MSByteIndex - 1;
  const bucketIndex = MSBitIndex + bytesLeft * 8;
  return bucketIndex;
}

/**
 * A sorting compareFn to sort an array of NodeData by increasing distance.
 */
function sortByDistance(a: NodeData, b: NodeData) {
  if (a.distance > b.distance) {
    return 1;
  } else if (a.distance < b.distance) {
    return -1;
  } else {
    return 0;
  }
}

/**
 * Encodes the NodeId as a `base32hex` string
 */
function encodeNodeId(nodeId: NodeId): NodeIdEncoded {
  return nodeId.toMultibase('base32hex') as NodeIdEncoded;
}

/**
 * Decodes an encoded NodeId string into a NodeId
 */
function decodeNodeId(nodeIdEncoded: any): NodeId | undefined {
  if (typeof nodeIdEncoded !== 'string') {
    return;
  }
  const nodeId = IdInternal.fromMultibase<NodeId>(nodeIdEncoded);
  if (nodeId == null) {
    return;
  }
  // All NodeIds are 32 bytes long
  // The NodeGraph requires a fixed size for Node Ids
  if (nodeId.length !== 32) {
    return;
  }
  return nodeId;
}

export {
  calculateDistance,
  calculateBucketIndex,
  sortByDistance,
  encodeNodeId,
  decodeNodeId,
};
