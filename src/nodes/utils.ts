import type { NodeBucket, NodeBucketIndex, NodeId } from './types';
import type { KeyPath } from '@matrixai/db';
import { utils as dbUtils } from '@matrixai/db';
import { IdInternal } from '@matrixai/id';
import lexi from 'lexicographic-integer';
import * as nodesErrors from './errors';
import * as keysUtils from '../keys/utils';
import { encodeNodeId, decodeNodeId } from '../ids';
import { bytes2BigInt } from '../utils';

const sepBuffer = dbUtils.sep;

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
    sepBuffer,
    Buffer.from(bucketKey(bucketIndex)),
    sepBuffer,
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
    sepBuffer,
    Buffer.from(bucketKey(bucketIndex)),
    sepBuffer,
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

function lastUpdatedKey(lastUpdated: number): Buffer {
  return Buffer.from(lexi.pack(lastUpdated, 'hex'));
}

/**
 * Parse the NodeGraph buckets sublevel key
 * The keys look like `!<lexi<NodeBucketIndex, 'hex')>!<NodeId>`
 * It is assumed that the `!` is the sublevel prefix.
 */
function parseBucketsDbKey(keyPath: KeyPath): {
  bucketIndex: NodeBucketIndex;
  bucketKey: string;
  nodeId: NodeId;
} {
  const [bucketKeyPath, nodeIdKey] = keyPath;
  if (bucketKeyPath == null || nodeIdKey == null) {
    throw new TypeError('Buffer is not an NodeGraph buckets key');
  }
  const bucketKey = bucketKeyPath.toString();
  const bucketIndex = lexi.unpack(bucketKey);
  const nodeId = IdInternal.fromBuffer<NodeId>(Buffer.from(nodeIdKey));
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
  return IdInternal.fromBuffer<NodeId>(keyBuffer);
}

/**
 * Parse the NodeGraph index sublevel key
 * The keys look like `!<lexi<NodeBucketIndex, 'hex')>!<lexi(lastUpdated, 'hex')>-<NodeIdString>`
 * It is assumed that the `!` is the sublevel prefix.
 */
function parseLastUpdatedBucketsDbKey(keyPath: KeyPath): {
  bucketIndex: NodeBucketIndex;
  bucketKey: string;
  lastUpdated: number;
  nodeId: NodeId;
} {
  const [bucketLevel, ...lastUpdatedKeyPath] = keyPath;
  if (bucketLevel == null || lastUpdatedKeyPath == null) {
    throw new TypeError('Buffer is not an NodeGraph index key');
  }
  const bucketKey = bucketLevel.toString();
  const bucketIndex = lexi.unpack(bucketKey);
  if (bucketIndex == null) {
    throw new TypeError('Buffer is not an NodeGraph index key');
  }
  const { lastUpdated, nodeId } =
    parseLastUpdatedBucketDbKey(lastUpdatedKeyPath);
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
function parseLastUpdatedBucketDbKey(keyPath: KeyPath): {
  lastUpdated: number;
  nodeId: NodeId;
} {
  const [lastUpdatedLevel, nodeIdKey] = keyPath;
  if (lastUpdatedLevel == null || nodeIdKey == null) {
    throw new TypeError('Buffer is not an NodeGraph index bucket key');
  }
  const lastUpdated = lexi.unpack(lastUpdatedLevel.toString());
  if (lastUpdated == null) {
    throw new TypeError('Buffer is not an NodeGraph index bucket key');
  }
  const nodeId = IdInternal.fromBuffer<NodeId>(Buffer.from(nodeIdKey));
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

function generateRandomDistanceForBucket(bucketIndex: NodeBucketIndex): NodeId {
  const buffer = keysUtils.getRandomBytes(32);
  // Calculate the most significant byte for bucket
  const base = bucketIndex / 8;
  const mSigByte = Math.floor(base);
  const mSigBit = (base - mSigByte) * 8 + 1;
  const mSigByteIndex = buffer.length - mSigByte - 1;
  // Creating masks
  // AND mask should look like 0b00011111
  // OR mask should look like  0b00010000
  const shift = 8 - mSigBit;
  const andMask = 0b11111111 >>> shift;
  const orMask = 0b10000000 >>> shift;
  let byte = buffer[mSigByteIndex];
  byte = byte & andMask; // Forces 0 for bits above bucket bit
  byte = byte | orMask; // Forces 1 in the desired bucket bit
  buffer[mSigByteIndex] = byte;
  // Zero out byte 'above' mSigByte
  for (let byteIndex = 0; byteIndex < mSigByteIndex; byteIndex++) {
    buffer[byteIndex] = 0;
  }
  return IdInternal.fromBuffer<NodeId>(buffer);
}

function xOrNodeId(node1: NodeId, node2: NodeId): NodeId {
  const xOrNodeArray = node1.map((byte, i) => byte ^ node2[i]);
  const xOrNodeBuffer = Buffer.from(xOrNodeArray);
  return IdInternal.fromBuffer<NodeId>(xOrNodeBuffer);
}

function generateRandomNodeIdForBucket(
  nodeId: NodeId,
  bucket: NodeBucketIndex,
): NodeId {
  const randomDistanceForBucket = generateRandomDistanceForBucket(bucket);
  return xOrNodeId(nodeId, randomDistanceForBucket);
}

/**
 * This is used to check if the given error is the result of a connection failure.
 * Connection failures can happen due to the following.
 * Failure to establish a connection,
 * an existing connection fails,
 * the RPC client has been destroyed,
 * or the NodeConnection has been destroyed.
 * This is generally used to check the connection has failed
 * before cleaning it up.
 */
function isConnectionError(e): boolean {
  return (
    e instanceof nodesErrors.ErrorNodeConnectionDestroyed ||
    e instanceof nodesErrors.ErrorNodeConnectionTimeout ||
    e instanceof nodesErrors.ErrorNodeConnectionMultiConnectionFailed
  );
}

/**
 * This generates a random delay based on the given delay and jitter multiplier.
 * For example, a delay of 100 and multiplier of 0.5 would result in a delay
 * randomly between 50 and 150.
 * @param delay - base delay to 'jitter' around
 * @param jitterMultiplier - jitter amount as a multiple of the delay
 */
function refreshBucketsDelayJitter(
  delay: number,
  jitterMultiplier: number,
): number {
  return (Math.random() - 0.5) * delay * jitterMultiplier;
}

export {
  sepBuffer,
  encodeNodeId,
  decodeNodeId,
  bucketIndex,
  bucketKey,
  bucketsDbKey,
  bucketDbKey,
  lastUpdatedBucketsDbKey,
  lastUpdatedBucketDbKey,
  lastUpdatedKey,
  parseBucketsDbKey,
  parseBucketDbKey,
  parseLastUpdatedBucketsDbKey,
  parseLastUpdatedBucketDbKey,
  nodeDistance,
  bucketSortByDistance,
  generateRandomDistanceForBucket,
  xOrNodeId,
  generateRandomNodeIdForBucket,
  isConnectionError,
  refreshBucketsDelayJitter,
};
