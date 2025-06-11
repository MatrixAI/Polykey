import type { Claim, SignedClaim } from '../types.js';
import type { NodeId, NodeIdEncoded } from '../../ids/types.js';
import type { SignedTokenEncoded } from '../../tokens/types.js';
import * as claimNetworkAuthorityUtils from './claimNetworkAuthority.js';
import Token from '../../tokens/Token.js';
import * as tokensSchema from '../../tokens/schemas/index.js';
import * as ids from '../../ids/index.js';
import * as claimsUtils from '../utils.js';
import * as claimsErrors from '../errors.js';
import * as tokensUtils from '../../tokens/utils.js';
import * as validationErrors from '../../validation/errors.js';
import * as utils from '../../utils/index.js';
import * as nodesUtils from '../../nodes/utils.js';
import * as keysUtils from '../../keys/utils/index.js';

/**
 * Asserts that a node is a part of a network
 */
interface ClaimNetworkAccess extends Claim {
  typ: 'ClaimNetworkAccess';
  iss: NodeIdEncoded;
  sub: NodeIdEncoded;
  network: string;
  signedClaimNetworkAuthorityEncoded: SignedTokenEncoded;
  isPrivate: boolean;
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
  if (
    claimNetworkAccess['isPrivate'] == null ||
    typeof claimNetworkAccess['isPrivate'] !== 'boolean'
  ) {
    throw new validationErrors.ErrorParse(
      '`isPrivate` property must be a boolean',
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

function verifyClaimNetworkAccess(
  networkNodeId: NodeId,
  subjectNodeId: NodeId,
  network: string,
  tokenClaimNetworkAccess: Token<ClaimNetworkAccess>,
): void {
  const signedClaim =
    claimNetworkAuthorityUtils.parseSignedClaimNetworkAuthority(
      tokenClaimNetworkAccess.payload.signedClaimNetworkAuthorityEncoded,
    );
  const claimNetworkAuthority = Token.fromSigned(signedClaim);
  const issuerNodeId = nodesUtils.decodeNodeId(
    tokenClaimNetworkAccess.payload.iss,
  );
  if (issuerNodeId == null) {
    throw new claimsErrors.ErrorClaimsVerificationFailed(
      'failed to decode issuer nodeId',
    );
  }
  claimNetworkAuthorityUtils.verifyClaimNetworkAuthority(
    networkNodeId,
    issuerNodeId,
    network,
    claimNetworkAuthority,
  );
  //  For the access claim
  //  1. issuer is current node
  //  2. subject is target node
  //  3. is signed by both the target and issuer

  // Issuer should be the subject of the ClaimNetworkAuthority and signed by it
  const claimNetworkAuthoritySub = claimNetworkAuthority.payload.sub;
  const nodeIdIss = tokenClaimNetworkAccess.payload.iss;
  if (nodeIdIss !== claimNetworkAuthoritySub) {
    throw new claimsErrors.ErrorClaimsVerificationFailed(
      'Issuer NodeIdEncoded does not match the expected network id',
    );
  }
  const networkPublicKey = keysUtils.publicKeyFromNodeId(issuerNodeId);
  if (!tokenClaimNetworkAccess.verifyWithPublicKey(networkPublicKey)) {
    throw new claimsErrors.ErrorClaimsVerificationFailed(
      'Token was not signed by the issuer node',
    );
  }

  // Subject should be the target node and signed by it
  const targetNodeIdEncoded = nodesUtils.encodeNodeId(subjectNodeId);
  const nodeIdSub = tokenClaimNetworkAccess.payload.sub;
  if (nodeIdSub !== targetNodeIdEncoded) {
    throw new claimsErrors.ErrorClaimsVerificationFailed(
      'Subject NodeIdEncoded does not match the expected subject node',
    );
  }
  const targetPublicKey = keysUtils.publicKeyFromNodeId(subjectNodeId);

  if (!tokenClaimNetworkAccess.verifyWithPublicKey(targetPublicKey)) {
    throw new claimsErrors.ErrorClaimsVerificationFailed(
      'Token was not signed by the subject node',
    );
  }

  // Checking if the network name matches
  const networkName = tokenClaimNetworkAccess.payload.network;
  if (networkName !== network) {
    throw new claimsErrors.ErrorClaimsVerificationFailed(
      'Network name does not match the expected network',
    );
  }
}

export {
  assertClaimNetworkAccess,
  parseClaimNetworkAccess,
  parseSignedClaimNetworkAccess,
  verifyClaimNetworkAccess,
};

export type { ClaimNetworkAccess };
