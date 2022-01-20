import type { NodeData, NodeId, NodeIdEncoded } from './types';

import { IdInternal, utils as idUtils } from '@matrixai/id';
import * as nodesErrors from './errors';

/**
 * Compute the distance between two nodes.
 * distance = nodeId1 ^ nodeId2
 * where ^ = bitwise XOR operator
 */
function calculateDistance(nodeId1: NodeId, nodeId2: NodeId): BigInt {
  const bufferId1: Buffer = nodeId1.toBuffer();
  const bufferId2: Buffer = nodeId2.toBuffer();
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

function encodeNodeId(nodeId: NodeId): NodeIdEncoded {
  return idUtils.toMultibase(nodeId, 'base32hex') as NodeIdEncoded;
}

function decodeNodeId(nodeIdEncoded: NodeIdEncoded | string): NodeId {
  const nodeId = IdInternal.fromMultibase<NodeId>(nodeIdEncoded);
  if (nodeId == null)
    throw new nodesErrors.ErrorInvalidNodeId(
      `Was not a valid multibase: ${nodeIdEncoded}`,
    );
  if (nodeId.length !== 32)
    throw new nodesErrors.ErrorInvalidNodeId(
      `Was not 32 bytes long: ${nodeIdEncoded}`,
    );
  return nodeId;
}

export {
  calculateDistance,
  calculateBucketIndex,
  sortByDistance,
  encodeNodeId,
  decodeNodeId,
};
