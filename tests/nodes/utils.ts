import type { NodeId } from '@/nodes/types';

import * as nodesUtils from '@/nodes/utils';

/**
 * Generates a node ID that, according to Kademlia, will be placed into 'nodeId's
 * bucket at 'bucketIndex'.
 * Recall that a bucket index is chosen based on:
 * 2^i <= distance (from current node) < 2^(i+1)
 * Therefore, generatedNodeId = 2^i XOR nodeId.
 */
function generateNodeIdForBucket(nodeId: NodeId, bucketIndex: number): NodeId {
  const lowerBoundDistance = BigInt(2) ** BigInt(bucketIndex);
  const bufferId = nodesUtils.nodeIdToU8(nodeId);
  const bufferDistance = bigIntToBuffer(lowerBoundDistance);
  // Console.log('Distance buffer:', bufferDistance);
  // console.log('Node ID buffer:', bufferId);

  const max = Math.max(bufferId.length, bufferDistance.length);
  // Reverse the buffers such that we XOR from right to left
  bufferId.reverse();
  bufferDistance.reverse();
  const newIdArray = new Uint8Array(max);

  // XOR the 'rightmost' bytes first
  for (let i = 0; i < bufferId.length && i < bufferDistance.length; i++) {
    newIdArray[i] = bufferId[i] ^ bufferDistance[i];
  }
  // If distance buffer is longer, append its bytes
  for (let i = bufferId.length; i < bufferDistance.length; i++) {
    newIdArray[i] = bufferDistance[i];
  }
  // If node ID buffer is longer, append its bytes
  for (let i = bufferDistance.length; i < bufferId.length; i++) {
    newIdArray[i] = bufferId[i];
  }

  // Reverse the XORed array back to normal
  newIdArray.reverse();
  // Convert to an ASCII string
  const decoder = new TextDecoder('ascii');
  return decoder.decode(newIdArray) as NodeId;
}

/**
 * Increases the passed node ID's last character code by 1.
 * If used in conjunction with calculateNodeIdForBucket, can produce multiple
 * node IDs that will appear in the same bucket.
 * NOTE: For node IDs appearing in lower-indexed buckets (i.e. bucket indexes
 * roughly around 0-4), this will occasionally cause the node ID to overflow
 * into the next bucket instead. For safety, ensure this function is used for
 * nodes appearing in larger-indexed buckets.
 */
function incrementNodeId(nodeId: NodeId): NodeId {
  const lastCharIndex = nodeId.length - 1;
  const newLastChar = String.fromCharCode(nodeId.charCodeAt(lastCharIndex) + 1);
  const constructedId = nodeId.substring(0, lastCharIndex) + newLastChar;
  return constructedId as NodeId;
}

/**
 * Converts a BigInt to a hex buffer.
 */
function bigIntToBuffer(number: BigInt) {
  let hex = number.toString(16);
  if (hex.length % 2) {
    hex = '0' + hex;
  }
  const len = hex.length / 2;
  const u8 = new Uint8Array(len);
  let i = 0;
  let j = 0;
  while (i < len) {
    u8[i] = parseInt(hex.slice(j, j + 2), 16);
    i += 1;
    j += 2;
  }
  return u8;
}

export { generateNodeIdForBucket, incrementNodeId };
