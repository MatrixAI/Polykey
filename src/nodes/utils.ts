import type {
  NodeId,
  NodeIdEncoded,
  NodeBucket,
  NodeBucketIndex,
} from './types';
import { IdInternal } from '@matrixai/id';
import lexi from 'lexicographic-integer';
import { bytes2BigInt, bufferSplit } from '../utils';

// FIXME:
const prefixBuffer = Buffer.from([33]);
// Const prefixBuffer = Buffer.from(dbUtils.prefix);

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

/**
 * Calculate the bucket index that the target node should be located in
 * A node's k-buckets are organised such that for the ith k-bucket where
 * 0 <= i < nodeIdBits, the contacts in this ith bucket are known to adhere to
 * the following inequality:
 * 2^i <= distance (from current node) < 2^(i+1)
 * This means lower buckets will have less nodes then the upper buckets.
 * The highest bucket will contain half of all possible nodes.
 * The lowest bucket will only contain 1 node.
 *
 * NOTE: because XOR is a commutative operation (i.e. a XOR b = b XOR a), the
 * order of the passed parameters is actually irrelevant. These variables are
 * purely named for communicating function purpose.
 *
 * NOTE: Kademlia literature generally talks about buckets with 1-based indexing
 * and that the buckets are ordered from largest to smallest. This means the first
 * 1th-bucket is far & large bucket, and the last 255th-bucket is the close bucket.
 * This is reversed in our `NodeBucketIndex` encoding. This is so that lexicographic
 * sort orders our buckets from closest bucket to farthest bucket.
 *
 * To convert from `NodeBucketIndex` to nth-bucket in Kademlia literature:
 *
 *   | NodeBucketIndex | Nth-Bucket |
 *   | --------------- | ---------- |
 *   | 255             | 1          |  farthest & largest
 *   | 254             | 2          |
 *   | ...             | ...        |
 *   | 1               | 254        |
 *   | 0               | 256        |  closest & smallest
 */
function bucketIndex(sourceNode: NodeId, targetNode: NodeId): NodeBucketIndex {
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
 * Encodes bucket index to bucket sublevel key
 */
function bucketKey(bucketIndex: NodeBucketIndex): string {
  return lexi.pack(bucketIndex, 'hex');
}

/**
 * Creates key for buckets sublevel
 */
function bucketsDbKey(bucketIndex: NodeBucketIndex, nodeId: NodeId): Buffer {
  return Buffer.concat([
    prefixBuffer,
    Buffer.from(bucketKey(bucketIndex)),
    prefixBuffer,
    bucketDbKey(nodeId),
  ]);
}

/**
 * Creates key for single bucket sublevel
 */
function bucketDbKey(nodeId: NodeId): Buffer {
  return nodeId.toBuffer();
}

/**
 * Creates key for buckets indexed by lastUpdated sublevel
 */
function lastUpdatedBucketsDbKey(
  bucketIndex: NodeBucketIndex,
  lastUpdated: number,
  nodeId: NodeId,
): Buffer {
  return Buffer.concat([
    prefixBuffer,
    Buffer.from(bucketKey(bucketIndex)),
    prefixBuffer,
    lastUpdatedBucketDbKey(lastUpdated, nodeId),
  ]);
}

/**
 * Creates key for single bucket indexed by lastUpdated sublevel
 */
function lastUpdatedBucketDbKey(lastUpdated: number, nodeId: NodeId): Buffer {
  return Buffer.concat([
    Buffer.from(lexi.pack(lastUpdated, 'hex')),
    Buffer.from('-'),
    nodeId.toBuffer(),
  ]);
}

/**
 * Parse the NodeGraph buckets sublevel key
 * The keys look like `!<lexi<NodeBucketIndex, 'hex')>!<NodeId>`
 * It is assumed that the `!` is the sublevel prefix.
 */
function parseBucketsDbKey(keyBuffer: Buffer): {
  bucketIndex: NodeBucketIndex;
  bucketKey: string;
  nodeId: NodeId;
} {
  const [, bucketKeyBuffer, nodeIdBuffer] = bufferSplit(
    keyBuffer,
    prefixBuffer,
    3,
    true,
  );
  if (bucketKeyBuffer == null || nodeIdBuffer == null) {
    throw new TypeError('Buffer is not an NodeGraph buckets key');
  }
  const bucketKey = bucketKeyBuffer.toString();
  const bucketIndex = lexi.unpack(bucketKey);
  const nodeId = IdInternal.fromBuffer<NodeId>(nodeIdBuffer);
  return {
    bucketIndex,
    bucketKey,
    nodeId,
  };
}

/**
 * Parse the NodeGraph bucket key
 * The keys look like `<NodeId>`
 */
function parseBucketDbKey(keyBuffer: Buffer): NodeId {
  const nodeId = IdInternal.fromBuffer<NodeId>(keyBuffer);
  return nodeId;
}

/**
 * Parse the NodeGraph index sublevel key
 * The keys look like `!<lexi<NodeBucketIndex, 'hex')>!<lexi(lastUpdated, 'hex')>-<NodeIdString>`
 * It is assumed that the `!` is the sublevel prefix.
 */
function parseLastUpdatedBucketsDbKey(keyBuffer: Buffer): {
  bucketIndex: NodeBucketIndex;
  bucketKey: string;
  lastUpdated: number;
  nodeId: NodeId;
} {
  const [, bucketKeyBuffer, lastUpdatedBuffer] = bufferSplit(
    keyBuffer,
    prefixBuffer,
    3,
    true,
  );
  if (bucketKeyBuffer == null || lastUpdatedBuffer == null) {
    throw new TypeError('Buffer is not an NodeGraph index key');
  }
  const bucketKey = bucketKeyBuffer.toString();
  const bucketIndex = lexi.unpack(bucketKey);
  if (bucketIndex == null) {
    throw new TypeError('Buffer is not an NodeGraph index key');
  }
  const { lastUpdated, nodeId } =
    parseLastUpdatedBucketDbKey(lastUpdatedBuffer);
  return {
    bucketIndex,
    bucketKey,
    lastUpdated,
    nodeId,
  };
}

/**
 * Parse the NodeGraph index bucket sublevel key
 * The keys look like `<lexi(lastUpdated, 'hex')>-<NodeIdString>`
 * It is assumed that the `!` is the sublevel prefix.
 */
function parseLastUpdatedBucketDbKey(keyBuffer: Buffer): {
  lastUpdated: number;
  nodeId: NodeId;
} {
  const [lastUpdatedBuffer, nodeIdBuffer] = bufferSplit(
    keyBuffer,
    Buffer.from('-'),
    2,
    true,
  );
  if (lastUpdatedBuffer == null || nodeIdBuffer == null) {
    throw new TypeError('Buffer is not an NodeGraph index bucket key');
  }
  const lastUpdated = lexi.unpack(lastUpdatedBuffer.toString());
  if (lastUpdated == null) {
    throw new TypeError('Buffer is not an NodeGraph index bucket key');
  }
  const nodeId = IdInternal.fromBuffer<NodeId>(nodeIdBuffer);
  return {
    lastUpdated,
    nodeId,
  };
}

/**
 * Compute the distance between two nodes.
 * distance = nodeId1 ^ nodeId2
 * where ^ = bitwise XOR operator
 */
function nodeDistance(nodeId1: NodeId, nodeId2: NodeId): bigint {
  const distance = nodeId1.map((byte, i) => byte ^ nodeId2[i]);
  return bytes2BigInt(distance);
}

function bucketSortByDistance(
  bucket: NodeBucket,
  nodeId: NodeId,
  order: 'asc' | 'desc' = 'asc',
): void {
  const distances = {};
  if (order === 'asc') {
    bucket.sort(([nodeId1], [nodeId2]) => {
      const d1 = (distances[nodeId1] =
        distances[nodeId1] ?? nodeDistance(nodeId, nodeId1));
      const d2 = (distances[nodeId2] =
        distances[nodeId2] ?? nodeDistance(nodeId, nodeId2));
      if (d1 < d2) {
        return -1;
      } else if (d1 > d2) {
        return 1;
      } else {
        return 0;
      }
    });
  } else {
    bucket.sort(([nodeId1], [nodeId2]) => {
      const d1 = (distances[nodeId1] =
        distances[nodeId1] ?? nodeDistance(nodeId, nodeId1));
      const d2 = (distances[nodeId2] =
        distances[nodeId2] ?? nodeDistance(nodeId, nodeId2));
      if (d1 > d2) {
        return -1;
      } else if (d1 < d2) {
        return 1;
      } else {
        return 0;
      }
    });
  }
}

export {
  prefixBuffer,
  encodeNodeId,
  decodeNodeId,
  bucketIndex,
  bucketKey,
  bucketsDbKey,
  bucketDbKey,
  lastUpdatedBucketsDbKey,
  lastUpdatedBucketDbKey,
  parseBucketsDbKey,
  parseBucketDbKey,
  parseLastUpdatedBucketsDbKey,
  parseLastUpdatedBucketDbKey,
  nodeDistance,
  bucketSortByDistance,
};
