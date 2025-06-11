import type { Claim, SignedClaim } from '../types.js';
import type { NodeId, NodeIdEncoded } from '../../ids/types.js';
import type Token from '../../tokens/Token.js';
import * as ids from '../../ids/index.js';
import * as claimsUtils from '../utils.js';
import * as claimsErrors from '../errors.js';
import * as validationErrors from '../../validation/errors.js';
import * as utils from '../../utils/index.js';
import * as nodesUtils from '../../nodes/utils.js';
import * as keysUtils from '../../keys/utils/index.js';

/**
 * Asserts that a node has the authority of a network.
 * The issuing nodeId has to be the root keypair for the whole network.
 */

interface ClaimNetworkAuthority extends Claim {
  typ: 'ClaimNetworkAuthority';
  iss: NodeIdEncoded;
  sub: NodeIdEncoded;
  network: string;
  isPrivate: boolean;
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
  if (
    claimNetworkAuthority['network'] == null ||
    typeof claimNetworkAuthority['network'] !== 'string'
  ) {
    throw new validationErrors.ErrorParse(
      '`network` property must be a network name string',
    );
  }
  if (
    claimNetworkAuthority['isPrivate'] == null ||
    typeof claimNetworkAuthority['isPrivate'] !== 'boolean'
  ) {
    throw new validationErrors.ErrorParse(
      '`isPrivate` property must be a boolean',
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
  const signedClaim = claimsUtils.parseSignedClaim(
    signedClaimNetworkNodeEncoded,
  );
  assertClaimNetworkAuthority(signedClaim.payload);
  return signedClaim as SignedClaim<ClaimNetworkAuthority>;
}

function verifyClaimNetworkAuthority(
  networkNodeId: NodeId,
  targetNodeId: NodeId,
  network: string,
  token: Token<ClaimNetworkAuthority>,
): void {
  // Should be signed by the network authority as the issuer
  const nodeIdIss = token.payload.iss;
  const networkNodeIdEncoded = nodesUtils.encodeNodeId(networkNodeId);
  if (nodeIdIss !== networkNodeIdEncoded) {
    throw new claimsErrors.ErrorClaimsVerificationFailed(
      'Issuer NodeIdEncoded does not match the expected network id',
    );
  }
  const networkPublicKey = keysUtils.publicKeyFromNodeId(networkNodeId);
  if (!token.verifyWithPublicKey(networkPublicKey)) {
    throw new claimsErrors.ErrorClaimsVerificationFailed(
      'Token was not signed by the network authority',
    );
  }
  // Now we check if the claim applies to the target node
  const targetNodeIdEncoded = nodesUtils.encodeNodeId(targetNodeId);
  const nodeIdSub = token.payload.sub;
  if (nodeIdSub !== targetNodeIdEncoded) {
    throw new claimsErrors.ErrorClaimsVerificationFailed(
      'Subject NodeIdEncoded does not match the expected target Node',
    );
  }
  // Checking if the claim was signed by the subject
  const targetPublicKey = keysUtils.publicKeyFromNodeId(targetNodeId);
  if (!token.verifyWithPublicKey(targetPublicKey)) {
    throw new claimsErrors.ErrorClaimsVerificationFailed(
      'Token was not signed by the network authority',
    );
  }
  // Checking if the network name matches
  const networkName = token.payload.network;
  if (networkName !== network) {
    throw new claimsErrors.ErrorClaimsVerificationFailed(
      'Network name does not match the expected network',
    );
  }
}

export {
  assertClaimNetworkAuthority,
  parseClaimNetworkAuthority,
  parseSignedClaimNetworkAuthority,
  verifyClaimNetworkAuthority,
};

export type { ClaimNetworkAuthority };
