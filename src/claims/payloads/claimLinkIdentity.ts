import type { Claim, SignedClaim } from '../types';
import type { NodeIdEncoded, ProviderIdentityIdEncoded } from '../../ids/types';
import * as ids from '../../ids';
import * as claimsUtils from '../utils';
import * as tokensUtils from '../../tokens/utils';
import * as validationErrors from '../../validation/errors';
import * as utils from '../../utils';

/**
 * Linking node and digital identity together
 */
interface ClaimLinkIdentity extends Claim {
  typ: 'ClaimLinkIdentity';
  iss: NodeIdEncoded;
  sub: ProviderIdentityIdEncoded;
}

function assertClaimLinkIdentity(
  claimLinkIdentity: unknown,
): asserts claimLinkIdentity is ClaimLinkIdentity {
  if (!utils.isObject(claimLinkIdentity)) {
    throw new validationErrors.ErrorParse('must be POJO');
  }
  if (claimLinkIdentity['typ'] !== 'ClaimLinkIdentity') {
    throw new validationErrors.ErrorParse(
      '`typ` property must be `ClaimLinkIdentity`',
    );
  }
  if (
    claimLinkIdentity['iss'] == null ||
    ids.decodeNodeId(claimLinkIdentity['iss']) == null
  ) {
    throw new validationErrors.ErrorParse(
      '`iss` property must be an encoded node ID',
    );
  }
  if (typeof claimLinkIdentity['sub'] !== 'string') {
    throw new validationErrors.ErrorParse('`sub` property must be a string');
  }
}

function parseClaimLinkIdentity(
  claimLinkIdentityEncoded: unknown,
): ClaimLinkIdentity {
  const claimLinkIdentity = claimsUtils.parseClaim(claimLinkIdentityEncoded);
  assertClaimLinkIdentity(claimLinkIdentity);
  return claimLinkIdentity;
}

function parseSignedClaimLinkIdentity(
  signedClaimLinkIdentityEncoded: unknown,
): SignedClaim<ClaimLinkIdentity> {
  const signedClaim = tokensUtils.parseSignedToken(
    signedClaimLinkIdentityEncoded,
  );
  assertClaimLinkIdentity(signedClaim.payload);
  return signedClaim as SignedClaim<ClaimLinkIdentity>;
}

export {
  assertClaimLinkIdentity,
  parseClaimLinkIdentity,
  parseSignedClaimLinkIdentity,
};

export type { ClaimLinkIdentity };
