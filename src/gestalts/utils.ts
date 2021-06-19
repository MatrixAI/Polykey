import type {
  GestaltKey,
  GestaltNodeKey,
  GestaltIdentityKey,
  GestaltId,
  GestaltNodeId,
  GestaltIdentityId,
} from './types';
import type { NodeId } from '../nodes/types';
import type { IdentityId, ProviderId } from '../identities/types';

import canonicalize from 'canonicalize';
import * as gestaltsErrors from './errors';
import { utils as keysUtils } from '../keys';

/**
 * Construct GestaltKey from GestaltId
 */
function gestaltKey(gestaltId: GestaltNodeId): GestaltNodeKey;
function gestaltKey(gestaltId: GestaltIdentityId): GestaltIdentityKey;
function gestaltKey(gestaltId: GestaltId): GestaltKey;
function gestaltKey(gestaltId: GestaltId): GestaltKey {
  return canonicalize(gestaltId) as GestaltKey;
}

/**
 * Deconstruct GestaltKey to GestaltId
 */
function ungestaltKey(gestaltKey: GestaltNodeKey): GestaltNodeId;
function ungestaltKey(gestaltKey: GestaltIdentityKey): GestaltIdentityId;
function ungestaltKey(gestaltKey: GestaltKey): GestaltId;
function ungestaltKey(gestaltKey: GestaltKey): GestaltId {
  return JSON.parse(gestaltKey);
}

/**
 * Construct GestaltKey from NodeId
 */
function keyFromNode(nodeId: NodeId): GestaltNodeKey {
  return gestaltKey({ type: 'node', nodeId }) as GestaltNodeKey;
}

/**
 * Construct GestaltKey from IdentityId and ProviderId
 */
function keyFromIdentity(
  providerId: ProviderId,
  identityId: IdentityId,
): GestaltIdentityKey {
  return gestaltKey({
    type: 'identity',
    providerId,
    identityId,
  }) as GestaltIdentityKey;
}

/**
 * Deconstruct GestaltKey to NodeId
 * This is a partial function.
 */
function nodeFromKey(nodeKey: GestaltNodeKey): NodeId {
  const node = ungestaltKey(nodeKey) as GestaltNodeId;
  return node.nodeId;
}

/**
 * Deconstruct GestaltKey to IdentityId and ProviderId
 * This is a partial function.
 */
function identityFromKey(
  identityKey: GestaltIdentityKey,
): [ProviderId, IdentityId] {
  const identity = ungestaltKey(identityKey) as GestaltIdentityId;
  return [identity.providerId, identity.identityId];
}

function serializeEncrypt<T>(graphDbKey: Buffer, value: T): Buffer {
  return keysUtils.encryptWithKey(
    graphDbKey,
    Buffer.from(JSON.stringify(value), 'utf-8'),
  );
}

function unserializeDecrypt<T>(graphDbKey: Buffer, data: Buffer): T {
  const value_ = keysUtils.decryptWithKey(graphDbKey, data);
  if (!value_) {
    throw new gestaltsErrors.ErrorGestaltsDecrypt();
  }
  let value;
  try {
    value = JSON.parse(value_.toString('utf-8'));
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new gestaltsErrors.ErrorGestaltsParse();
    }
    throw e;
  }
  return value;
}

export {
  gestaltKey,
  ungestaltKey,
  keyFromNode,
  keyFromIdentity,
  nodeFromKey,
  identityFromKey,
  serializeEncrypt,
  unserializeDecrypt,
};
