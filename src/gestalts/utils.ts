import type { GestaltLinkId, NodeId, ProviderIdentityId } from '../ids/types';
import type { TokenSignature } from '../tokens/types';
import type {
  GestaltId,
  GestaltKey,
  GestaltAction,
  GestaltNodeInfo,
  GestaltNodeInfoJSON,
  GestaltLink,
  GestaltLinkJSON,
} from './types';
import type { ClaimLinkNode, ClaimLinkIdentity } from '../claims/payloads';
import { IdInternal } from '@matrixai/id';
import { gestaltActions } from './types';
import * as ids from '../ids';

function toGestaltKey(gestaltId: GestaltId): GestaltKey {
  switch (gestaltId[0]) {
    case 'node':
      return toGestaltNodeKey(gestaltId);
    case 'identity':
      return toGestaltIdentityKey(gestaltId);
  }
}

function fromGestaltKey(gestaltKey: GestaltKey): GestaltId {
  const type = gestaltKey.slice(0, gestaltKey.indexOf('-'));
  if (type.equals(Buffer.from('node'))) {
    return fromGestaltNodeKey(gestaltKey);
  } else if (type.equals(Buffer.from('identity'))) {
    return fromGestaltIdentityKey(gestaltKey);
  } else {
    throw new TypeError(
      'Buffer is neither a GestaltNodeKey nor GestaltIdentityKey',
    );
  }
}

function toGestaltNodeKey(gestaltNodeId: ['node', NodeId]): GestaltKey {
  return Buffer.concat([
    Buffer.from(gestaltNodeId[0], 'utf-8'),
    Buffer.from('-'),
    gestaltNodeId[1].toBuffer(),
  ]) as GestaltKey;
}

function fromGestaltNodeKey(gestaltNodeKey: GestaltKey): ['node', NodeId] {
  const type = gestaltNodeKey.slice(0, gestaltNodeKey.indexOf('-'));
  if (!type.equals(Buffer.from('node'))) {
    throw new TypeError('Buffer is not a GestaltNodeKey');
  }
  const nodeIdBuffer = gestaltNodeKey.slice(gestaltNodeKey.indexOf('-') + 1);
  const nodeId = IdInternal.fromBuffer<NodeId>(nodeIdBuffer);
  if (nodeId.length !== 32) {
    throw new TypeError('Buffer is not a GestaltNodeKey');
  }
  return ['node', nodeId];
}

function toGestaltIdentityKey(
  gestaltIdentityId: ['identity', ProviderIdentityId],
): GestaltKey {
  return Buffer.concat([
    Buffer.from(gestaltIdentityId[0], 'utf-8'),
    Buffer.from('-'),
    Buffer.from(ids.encodeProviderIdentityId(gestaltIdentityId[1]), 'utf-8'),
  ]) as GestaltKey;
}

function fromGestaltIdentityKey(
  gestaltIdentityKey: GestaltKey,
): ['identity', ProviderIdentityId] {
  const type = gestaltIdentityKey.slice(0, gestaltIdentityKey.indexOf('-'));
  if (!type.equals(Buffer.from('identity'))) {
    throw new TypeError('Buffer is not a GestaltIdentityKey');
  }
  const providerIdentityIdEncoded = gestaltIdentityKey.slice(
    gestaltIdentityKey.indexOf('-') + 1,
  );
  const providerIdentityId = ids.decodeProviderIdentityId(
    providerIdentityIdEncoded.toString('utf-8'),
  );
  if (providerIdentityId == null) {
    throw new TypeError('Buffer is not a GestaltIdentityKey');
  }
  return ['identity', providerIdentityId];
}

function isGestaltAction(action: any): action is GestaltAction {
  if (typeof action !== 'string') return false;
  return (gestaltActions as Readonly<Array<string>>).includes(action);
}

function fromGestaltNodeInfoJSON(
  gestaltNodeInfoJSON: GestaltNodeInfoJSON,
): GestaltNodeInfo {
  return {
    ...gestaltNodeInfoJSON,
    nodeId: IdInternal.fromJSON<NodeId>(gestaltNodeInfoJSON.nodeId)!,
  };
}

function fromGestaltLinkJSON(gestaltLinkJSON: GestaltLinkJSON): GestaltLink {
  const [type, gestaltLinkJSONData] = gestaltLinkJSON;
  return [
    type,
    {
      ...gestaltLinkJSONData,
      id: IdInternal.fromJSON<GestaltLinkId>(gestaltLinkJSONData.id)!,
      claim: {
        ...gestaltLinkJSONData.claim,
        signatures: gestaltLinkJSONData.claim.signatures.map(
          (headerSignatureJSON) => ({
            ...headerSignatureJSON,
            signature: Buffer.from(
              headerSignatureJSON.signature,
            ) as TokenSignature,
          }),
        ),
      },
    },
  ] as GestaltLink;
}

/**
 * Checks if the link node has matching node IDs
 */
function checkLinkNodeMatches(
  nodeId1: NodeId,
  nodeId2: NodeId,
  claimPayload: ClaimLinkNode,
): boolean {
  const issNodeId = ids.decodeNodeId(claimPayload.iss)!;
  const subNodeId = ids.decodeNodeId(claimPayload.sub)!;
  if (issNodeId.equals(nodeId1)) {
    if (subNodeId.equals(nodeId2)) {
      return true;
    }
  } else if (issNodeId.equals(nodeId2)) {
    if (subNodeId.equals(nodeId1)) {
      return true;
    }
  }
  return false;
}

function checkLinkIdentityMatches(
  nodeId: NodeId,
  providerIdentityId: ProviderIdentityId,
  claimPayload: ClaimLinkIdentity,
) {
  const [providerId, identityId] = providerIdentityId;
  const issNodeId = ids.decodeNodeId(claimPayload.iss)!;
  const [subProviderId, subIdentityId] = ids.decodeProviderIdentityId(
    claimPayload.sub,
  )!;

  return (
    issNodeId.equals(nodeId) &&
    subProviderId === providerId &&
    subIdentityId === identityId
  );
}

export {
  toGestaltKey,
  fromGestaltKey,
  toGestaltNodeKey,
  fromGestaltNodeKey,
  toGestaltIdentityKey,
  fromGestaltIdentityKey,
  isGestaltAction,
  fromGestaltNodeInfoJSON,
  fromGestaltLinkJSON,
  checkLinkNodeMatches,
  checkLinkIdentityMatches,
};

export {
  encodeGestaltId,
  encodeGestaltNodeId,
  encodeGestaltIdentityId,
  decodeGestaltId,
  decodeGestaltNodeId,
  decodeGestaltIdentityId,
  createGestaltLinkIdGenerator,
} from '../ids';
