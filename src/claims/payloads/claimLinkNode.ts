import type { Claim, SignedClaim } from '../types';
import type { NodeIdEncoded } from '../../ids/types';
import * as ids from '../../ids';
import * as claimsUtils from '../utils';
import * as tokensUtils from '../../tokens/utils';
import * as validationErrors from '../../validation/errors';
import * as utils from '../../utils';

/**
 * Linking 2 nodes together
 */
interface ClaimLinkNode extends Claim {
  typ: 'ClaimLinkNode';
  iss: NodeIdEncoded;
  sub: NodeIdEncoded;
}

function assertClaimLinkNode(
  claimLinkNode: unknown,
): asserts claimLinkNode is ClaimLinkNode {
  if (!utils.isObject(claimLinkNode)) {
    throw new validationErrors.ErrorParse('must be POJO');
  }
  if (claimLinkNode['typ'] !== 'ClaimLinkNode') {
    throw new validationErrors.ErrorParse(
      '`typ` property must be `ClaimLinkNode`',
    );
  }
  if (
    claimLinkNode['iss'] == null ||
    ids.decodeNodeId(claimLinkNode['iss']) == null
  ) {
    throw new validationErrors.ErrorParse(
      '`iss` property must be an encoded node ID',
    );
  }
  if (
    claimLinkNode['sub'] == null ||
    ids.decodeNodeId(claimLinkNode['sub']) == null
  ) {
    throw new validationErrors.ErrorParse(
      '`sub` property must be an encoded node ID',
    );
  }
}

function parseClaimLinkNode(claimLinkNodeEncoded: unknown): ClaimLinkNode {
  const claimLinkNode = claimsUtils.parseClaim(claimLinkNodeEncoded);
  assertClaimLinkNode(claimLinkNode);
  return claimLinkNode;
}

function parseSignedClaimLinkNode(
  signedClaimLinkNodeEncoded: unknown,
): SignedClaim<ClaimLinkNode> {
  const signedClaim = tokensUtils.parseSignedToken(signedClaimLinkNodeEncoded);
  assertClaimLinkNode(signedClaim.payload);
  return signedClaim as SignedClaim<ClaimLinkNode>;
}

export { assertClaimLinkNode, parseClaimLinkNode, parseSignedClaimLinkNode };

export type { ClaimLinkNode };
