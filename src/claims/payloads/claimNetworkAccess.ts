import type { Claim, SignedClaim } from '../types.js';
import type { NodeIdEncoded } from '../../ids/types.js';
import type { SignedTokenEncoded } from '../../tokens/types.js';
import * as tokensSchema from '../../tokens/schemas/index.js';
import * as ids from '../../ids/index.js';
import * as claimsUtils from '../utils.js';
import * as tokensUtils from '../../tokens/utils.js';
import * as validationErrors from '../../validation/errors.js';
import * as utils from '../../utils/index.js';

/**
 * Asserts that a node is apart of a network
 */
interface ClaimNetworkAccess extends Claim {
  typ: 'ClaimNetworkAccess';
  iss: NodeIdEncoded;
  sub: NodeIdEncoded;
  network: string;
  signedClaimNetworkAuthorityEncoded?: SignedTokenEncoded;
}

function assertClaimNetworkAccess(
  claimNetworkAccess: unknown,
): asserts claimNetworkAccess is ClaimNetworkAccess {
  if (!utils.isObject(claimNetworkAccess)) {
    throw new validationErrors.ErrorParse('must be POJO');
  }
  if (claimNetworkAccess['typ'] !== 'ClaimNetworkAccess') {
    throw new validationErrors.ErrorParse(
      '`typ` property must be `ClaimNetworkAccess`',
    );
  }
  if (
    claimNetworkAccess['iss'] == null ||
    ids.decodeNodeId(claimNetworkAccess['iss']) == null
  ) {
    throw new validationErrors.ErrorParse(
      '`iss` property must be an encoded node ID',
    );
  }
  if (
    claimNetworkAccess['sub'] == null ||
    ids.decodeNodeId(claimNetworkAccess['sub']) == null
  ) {
    throw new validationErrors.ErrorParse(
      '`sub` property must be an encoded node ID',
    );
  }
  if (
    claimNetworkAccess['network'] == null ||
    typeof claimNetworkAccess['network'] !== 'string'
  ) {
    throw new validationErrors.ErrorParse(
      '`network` property must be a string',
    );
  }
  if (
    claimNetworkAccess['signedClaimNetworkAuthorityEncoded'] != null &&
    !tokensSchema.validateSignedTokenEncoded(
      claimNetworkAccess['signedClaimNetworkAuthorityEncoded'],
    )
  ) {
    throw new validationErrors.ErrorParse(
      '`signedClaimNetworkAuthorityEncoded` property must be an encoded signed token',
    );
  }
}

function parseClaimNetworkAccess(
  claimNetworkAccessEncoded: unknown,
): ClaimNetworkAccess {
  const claimNetworkNode = claimsUtils.parseClaim(claimNetworkAccessEncoded);
  assertClaimNetworkAccess(claimNetworkNode);
  return claimNetworkNode;
}

function parseSignedClaimNetworkAccess(
  signedClaimNetworkAccessEncoded: unknown,
): SignedClaim<ClaimNetworkAccess> {
  const signedClaim = tokensUtils.parseSignedToken(
    signedClaimNetworkAccessEncoded,
  );
  assertClaimNetworkAccess(signedClaim.payload);
  return signedClaim as SignedClaim<ClaimNetworkAccess>;
}

export {
  assertClaimNetworkAccess,
  parseClaimNetworkAccess,
  parseSignedClaimNetworkAccess,
};

export type { ClaimNetworkAccess };
