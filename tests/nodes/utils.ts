import type { NodeId } from '@/nodes/types';
import type PolykeyAgent from '@/PolykeyAgent';
import { webcrypto } from 'crypto';
import { IdInternal } from '@matrixai/id';
import * as fc from 'fast-check';
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
    const random = keysUtils.getRandomBytes(16).toString('hex');
    return IdInternal.fromString<NodeId>(random);
  } else {
    const random = keysUtils.getRandomBytes(32);
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
  await localNode.nodeManager.setNode(remoteNode.keyRing.getNodeId(), {
    host: remoteNode.agentServiceHost,
    port: remoteNode.agentServicePort,
    scopes: ['external'],
  });
  // Add local node's details to remote node
  await remoteNode.nodeManager.setNode(localNode.keyRing.getNodeId(), {
    host: localNode.agentServiceHost,
    port: localNode.agentServicePort,
    scopes: ['external'],
  });
}

const nodeIdArb = fc
  .int8Array({ minLength: 32, maxLength: 32 })
  .map((value) => IdInternal.fromBuffer<NodeId>(Buffer.from(value)));

const nodeIdArrayArb = (length: number) =>
  fc.array(nodeIdArb, { maxLength: length, minLength: length }).noShrink();

const uniqueNodeIdArb = (length: number) =>
  fc
    .array(nodeIdArb, { maxLength: length, minLength: length })
    .noShrink()
    .filter((values) => {
      for (let i = 0; i < values.length; i++) {
        for (let j = i; j < values.length; j++) {
          if (values[i].equals(values[j])) return true;
        }
      }
      return false;
    });

/**
 * Signs using the 256-bit HMAC key
 * Web Crypto has to use the `CryptoKey` type.
 * But to be fully generic, we use the `ArrayBuffer` type.
 * In production, prefer to use libsodium as it would be faster.
 */
async function sign(key: ArrayBuffer, data: ArrayBuffer) {
  const cryptoKey = await webcrypto.subtle.importKey(
    'raw',
    key,
    {
      name: 'HMAC',
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  );
  return webcrypto.subtle.sign('HMAC', cryptoKey, data);
}

/**
 * Verifies using 256-bit HMAC key
 * Web Crypto prefers using the `CryptoKey` type.
 * But to be fully generic, we use the `ArrayBuffer` type.
 * In production, prefer to use libsodium as it would be faster.
 */
async function verify(key: ArrayBuffer, data: ArrayBuffer, sig: ArrayBuffer) {
  const cryptoKey = await webcrypto.subtle.importKey(
    'raw',
    key,
    {
      name: 'HMAC',
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  );
  return webcrypto.subtle.verify('HMAC', cryptoKey, sig, data);
}

/**
 * This will create a `reasonToCode` and `codeToReason` functions that will
 * allow errors to "jump" the network boundary. It does this by mapping the
 * errors to an incrementing code and returning them on the other end of the
 * connection.
 *
 * Note: this should ONLY be used for testing as it requires the client and
 * server to share the same instance of `reasonToCode` and `codeToReason`.
 */
function createReasonConverters() {
  const reasonMap = new Map<number, any>();
  let code = 0;

  const reasonToCode = (_type, reason) => {
    code++;
    reasonMap.set(code, reason);
    return code;
  };

  const codeToReason = (_type, code) => {
    return reasonMap.get(code) ?? new Error('Reason not found');
  };

  return {
    reasonToCode,
    codeToReason,
  };
}

export {
  generateRandomNodeId,
  generateNodeIdForBucket,
  nodesConnect,
  nodeIdArb,
  nodeIdArrayArb,
  uniqueNodeIdArb,
  sign,
  verify,
  createReasonConverters,
};
