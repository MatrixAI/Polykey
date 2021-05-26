import type { NodeId, NodeBucket } from './types';
import type { Host, Port } from '../network/types';
import type { PublicKeyFingerprint } from '../keys/types';

import { utils as keysUtils } from '../keys';
import * as nodeErrors from './errors';

function nodeId(id: PublicKeyFingerprint): NodeId {
  return id as NodeId;
}

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
 * Node ID to an array of 8-bit unsigned ints
 */
function nodeIdToU8(id: string) {
  const b = Buffer.from(id);
  return new Uint8Array(
    b.buffer,
    b.byteOffset,
    b.byteLength / Uint8Array.BYTES_PER_ELEMENT,
  );
}

function serializeGraphValue(graphDbKey: Buffer, value: NodeBucket): Buffer {
  return keysUtils.encryptWithKey(
    graphDbKey,
    Buffer.from(JSON.stringify(value), 'utf-8'),
  );
}

function unserializeGraphValue(graphDbKey: Buffer, data: Buffer): NodeBucket {
  const value_ = keysUtils.decryptWithKey(graphDbKey, data);
  if (!value_) {
    throw new nodeErrors.ErrorNodeGraphValueDecrypt();
  }
  let value: NodeBucket;
  try {
    value = JSON.parse(value_.toString('utf-8'));
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new nodeErrors.ErrorNodeGraphValueParse();
    }
    throw e;
  }
  // Cast the non-primitive types correctly (ensures type safety when using them)
  for (const nodeId of Object.keys(value)) {
    value[nodeId].address.ip = value[nodeId].address.ip as Host;
    value[nodeId].address.port = value[nodeId].address.port as Port;
    value[nodeId].lastUpdated = new Date(value[nodeId].lastUpdated);
  }
  return value;
}

export {
  nodeId,
  calculateDistance,
  serializeGraphValue,
  unserializeGraphValue,
};
