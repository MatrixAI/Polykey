import type { NodeId, NodeAddress } from '@/nodes/types';
import type PolykeyAgent from '@/PolykeyAgent';
import { IdInternal } from '@matrixai/id';
import * as keysUtils from '@/keys/utils';
import { bigInt2Bytes } from '@/utils';

/**
 * Generate random `NodeId`
 * If `readable` is `true`, then it will generate a `NodeId` where
 * its binary string form will only contain hex characters
 * However the `NodeId` will not be uniformly random as it will not cover
 * the full space of possible node IDs
 * Prefer to keep `readable` `false` if possible to ensure tests are robust
 */
function generateRandomNodeId(readable: boolean = false): NodeId {
  if (readable) {
    const random = keysUtils.getRandomBytesSync(16).toString('hex');
    return IdInternal.fromString<NodeId>(random);
  } else {
    const random = keysUtils.getRandomBytesSync(32);
    return IdInternal.fromBuffer<NodeId>(random);
  }
}

/**
 * Generate a deterministic NodeId for a specific bucket given an existing NodeId
 * This requires solving the bucket index (`i`) and distance equation:
 * `2^i <= distance < 2^(i+1)`
 * Where `distance` is: `New NodeId XOR Given NodeId`
 * The XOR operation `a XOR b = c` means `a XOR c = b` and `b XOR c = a`
 * The new NodeId that starts with a bucket offset of 0 would be:
 * `New NodeId = 2^i XOR Given NodeId`
 * To get the next NodeId within the same bucket, increment the `bucketOffset`
 * The `bucketOffset` is limited by the size of each bucket `2^(i+1) - 2^i`
 * @param nodeId NodeId that distance is measured from
 * @param bucketIndex Desired bucket index for new NodeId
 * @param bucketOffset Offset position for new NodeId from the bucket index
 */
function generateNodeIdForBucket(
  nodeId: NodeId,
  bucketIndex: number,
  bucketOffset: number = 0,
): NodeId {
  const lowerBoundDistance = BigInt(2) ** BigInt(bucketIndex);
  const upperBoundDistance = BigInt(2) ** BigInt(bucketIndex + 1);
  if (bucketOffset >= upperBoundDistance - lowerBoundDistance) {
    throw new RangeError('bucketOffset is beyond bucket size');
  }
  // Offset position within the bucket
  const distance = bigInt2Bytes(
    lowerBoundDistance + BigInt(bucketOffset),
    nodeId.byteLength,
  );
  // XOR the nodeIdBuffer with distance
  const nodeIdBufferNew = nodeId.map((byte, i) => {
    return byte ^ distance[i];
  });
  // Zero-copy the new NodeId
  return IdInternal.create<NodeId>(
    nodeIdBufferNew,
    nodeIdBufferNew.byteOffset,
    nodeIdBufferNew.byteLength,
  );
}

/**
 * Adds each node's details to the other
 */
async function nodesConnect(localNode: PolykeyAgent, remoteNode: PolykeyAgent) {
  // Add remote node's details to local node
  await localNode.nodeManager.setNode(remoteNode.keyManager.getNodeId(), {
    host: remoteNode.proxy.getProxyHost(),
    port: remoteNode.proxy.getProxyPort(),
  } as NodeAddress);
  // Add local node's details to remote node
  await remoteNode.nodeManager.setNode(localNode.keyManager.getNodeId(), {
    host: localNode.proxy.getProxyHost(),
    port: localNode.proxy.getProxyPort(),
  } as NodeAddress);
}

export { generateRandomNodeId, generateNodeIdForBucket, nodesConnect };
