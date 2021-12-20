import type { NodeData, NodeId } from './types';

import { ErrorInvalidNodeId } from './errors';
import { fromMultibase, isIdString, makeIdString } from '../GenericIdTypes';

/**
 * Compute the distance between two nodes.
 * distance = nodeId1 ^ nodeId2
 * where ^ = bitwise XOR operator
 */
function calculateDistance(nodeId1: NodeId, nodeId2: NodeId): BigInt {
  const bufferId1 = nodeIdToU8(nodeId1);
  const bufferId2 = nodeIdToU8(nodeId2);
  let distance = BigInt(0);
  let i = 0;
  const min = Math.min(bufferId1.length, bufferId2.length);
  const max = Math.max(bufferId1.length, bufferId2.length);
  for (; i < min; ++i) {
    distance = distance * BigInt(256) + BigInt(bufferId1[i] ^ bufferId2[i]);
  }
  for (; i < max; ++i) distance = BigInt(distance) * BigInt(256) + BigInt(255);
  return distance;
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
function calculateBucketIndex(
  sourceNode: NodeId,
  targetNode: NodeId,
  nodeIdBits: number = 256,
) {
  const distance = calculateDistance(sourceNode, targetNode);
  // Start at the last bucket: most likely to be here based on relation of
  // bucket index to distance
  let bucketIndex = nodeIdBits - 1;
  for (; bucketIndex >= 0; bucketIndex--) {
    const lowerBound = BigInt(2) ** BigInt(bucketIndex);
    const upperBound = BigInt(2) ** BigInt(bucketIndex + 1);
    // If 2^i <= distance (from current node) < 2^(i+1),
    // then break and return current index
    if (lowerBound <= distance && distance < upperBound) {
      break;
    }
  }
  return bucketIndex;
}

/**
 * Validates that a provided node ID string is a valid node ID.
 */
function isNodeId(nodeId: string): nodeId is NodeId {
  return isIdString<NodeId>(nodeId, 32);
}

function makeNodeId(arg: any): NodeId {
  return makeIdString<NodeId>(arg, 32, 'base32hex');
}

/**
 * Node ID to an array of 8-bit unsigned ints
 */
function nodeIdToU8(id: string): Uint8Array {
  // Converting from the multibase string to a buffer of hopefully 32 bytes.
  const byteArray = fromMultibase(id);
  if (byteArray == null) throw new ErrorInvalidNodeId();
  return byteArray;
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

export {
  calculateDistance,
  calculateBucketIndex,
  isNodeId,
  makeNodeId,
  nodeIdToU8,
  sortByDistance,
};
