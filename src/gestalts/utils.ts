import type {
  GestaltGraphDomain,
  GestaltGraphKey,
  GestaltKey,
  GestaltId,
  GestaltGraphValue,
} from './types';
import type { NodeId } from '../nodes/types';
import type { IdentityId, ProviderId } from '../identities/types';

import canonicalize from 'canonicalize';
import * as gestaltsErrors from './errors';
import { utils as keysUtils } from '../keys';

/**
 * Construct GestaltKey from GestaltId
 */
function gestaltKey(gestaltId: GestaltId): GestaltKey {
  return canonicalize(gestaltId) as GestaltKey;
}

/**
 * Deconstruct GestaltKey to GestaltId
 */
function ungestaltKey(gestaltKey: GestaltKey): GestaltId {
  return JSON.parse(gestaltKey);
}

/**
 * Construct GestaltKey from NodeId
 */
function keyFromNode(nodeId: NodeId): GestaltKey {
  return gestaltKey({ type: 'node', nodeId });
}

/**
 * Construct GestaltKey from IdentityId and ProviderId
 */
function keyFromIdentity(
  providerId: ProviderId,
  identityId: IdentityId,
): GestaltKey {
  return gestaltKey({ type: 'identity', providerId, identityId });
}

/**
 * Deconstruct GestaltKey to NodeId
 * This is a partial function.
 */
function nodeFromKey(nodeKey: GestaltKey): NodeId {
  const node = ungestaltKey(nodeKey);
  if (node.type !== 'node') {
    throw new TypeError();
  }
  return node.nodeId;
}

/**
 * Deconstruct GestaltKey to IdentityId and ProviderId
 * This is a partial function.
 */
function identityFromKey(identityKey: GestaltKey): [ProviderId, IdentityId] {
  const identity = ungestaltKey(identityKey);
  if (identity.type !== 'identity') {
    throw new TypeError();
  }
  return [identity.providerId, identity.identityId];
}

/**
 * Constructs GestaltGraphKey from GestaltKey in particular domain.
 */
function gestaltGraphKey(
  d: GestaltGraphDomain,
  gk: GestaltKey,
): GestaltGraphKey {
  return `${d}.${gk}` as GestaltGraphKey;
}

/**
 * Deconstructs GestaltGraphKey to GestaltGraphDomain and GestaltKey
 */
function ungestaltGraphKey(
  ggK: GestaltGraphKey,
): [GestaltGraphDomain, GestaltKey] {
  const [d, gk] = ggK.split(/\.(.+)/);
  return [d as GestaltGraphDomain, gk as GestaltKey];
}

function serializeGraphValue(
  graphDbKey: Buffer,
  value: GestaltGraphValue,
): Buffer {
  return keysUtils.encryptWithKey(
    graphDbKey,
    Buffer.from(JSON.stringify(value), 'utf-8'),
  );
}

function unserializeGraphValue(
  graphDbKey: Buffer,
  data: Buffer,
): GestaltGraphValue {
  const value_ = keysUtils.decryptWithKey(graphDbKey, data);
  if (!value_) {
    throw new gestaltsErrors.ErrorGestaltsGraphValueDecrypt();
  }
  let value;
  try {
    value = JSON.parse(value_.toString('utf-8'));
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new gestaltsErrors.ErrorGestaltsGraphValueParse();
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
  gestaltGraphKey,
  ungestaltGraphKey,
  serializeGraphValue,
  unserializeGraphValue,
};
