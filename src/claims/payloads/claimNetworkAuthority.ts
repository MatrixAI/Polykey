import type { Claim, SignedClaim } from '../types.js';
import type { NodeIdEncoded } from '../../ids/types.js';
import * as ids from '../../ids/index.js';
import * as claimsUtils from '../utils.js';
import * as tokensUtils from '../../tokens/utils.js';
import * as validationErrors from '../../validation/errors.js';
import * as utils from '../../utils/index.js';

/**
 * Asserts that a node is apart of a network
 */
interface ClaimNetworkAuthority extends Claim {
  typ: 'ClaimNetworkAuthority';
  iss: NodeIdEncoded;
  sub: NodeIdEncoded;
}

function assertClaimNetworkAuthority(
  claimNetworkAuthority: unknown,
): asserts claimNetworkAuthority is ClaimNetworkAuthority {
  if (!utils.isObject(claimNetworkAuthority)) {
    throw new validationErrors.ErrorParse('must be POJO');
  }
  if (claimNetworkAuthority['typ'] !== 'ClaimNetworkAuthority') {
    throw new validationErrors.ErrorParse(
      '`typ` property must be `ClaimNetworkAuthority`',
    );
  }
  if (
    claimNetworkAuthority['iss'] == null ||
    ids.decodeNodeId(claimNetworkAuthority['iss']) == null
  ) {
    throw new validationErrors.ErrorParse(
      '`iss` property must be an encoded node ID',
    );
  }
  if (
    claimNetworkAuthority['sub'] == null ||
    ids.decodeNodeId(claimNetworkAuthority['sub']) == null
  ) {
    throw new validationErrors.ErrorParse(
      '`sub` property must be an encoded node ID',
    );
  }
}

function parseClaimNetworkAuthority(
  claimNetworkNodeEncoded: unknown,
): ClaimNetworkAuthority {
  const claimNetworkNode = claimsUtils.parseClaim(claimNetworkNodeEncoded);
  assertClaimNetworkAuthority(claimNetworkNode);
  return claimNetworkNode;
}

function parseSignedClaimNetworkAuthority(
  signedClaimNetworkNodeEncoded: unknown,
): SignedClaim<ClaimNetworkAuthority> {
  const signedClaim = tokensUtils.parseSignedToken(
    signedClaimNetworkNodeEncoded,
  );
  assertClaimNetworkAuthority(signedClaim.payload);
  return signedClaim as SignedClaim<ClaimNetworkAuthority>;
}

export {
  assertClaimNetworkAuthority,
  parseClaimNetworkAuthority,
  parseSignedClaimNetworkAuthority,
};

export type { ClaimNetworkAuthority };
