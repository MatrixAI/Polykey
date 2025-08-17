import type { SignedToken, TokenPayload } from '../types.js';
import type { NodeIdEncoded } from '../../ids/types.js';
import * as tokensUtils from '../utils.js';
import * as ids from '../../ids/index.js';
import * as validationErrors from '../../validation/errors.js';
import * as utils from '../../utils/index.js';

interface AuthIdentityToken extends TokenPayload {
  iss: NodeIdEncoded;
  exp: number;
  jti: string;
}

function assertAuthSignedIdentity(
  authIdentityToken: unknown,
): asserts authIdentityToken is AuthIdentityToken {
  if (!utils.isObject(authIdentityToken)) {
    throw new validationErrors.ErrorParse('must be POJO');
  }
  if (
    authIdentityToken['iss'] == null ||
    ids.decodeNodeId(authIdentityToken['iss'] == null)
  ) {
    throw new validationErrors.ErrorParse(
      '`iss` property must be an encoded node ID',
    );
  }
  if (typeof authIdentityToken['exp'] !== 'number') {
    throw new validationErrors.ErrorParse('`exp` property must be a number');
  }
  if (typeof authIdentityToken['jti'] !== 'string') {
    throw new validationErrors.ErrorParse('`jti` property must be a string');
  }
}

function parseAuthSignedIdentity(
  authIdentityEncoded: unknown,
): SignedToken<AuthIdentityToken> {
  const encodedToken =
    tokensUtils.parseSignedToken<AuthIdentityToken>(authIdentityEncoded);
  const authIdentity =
    tokensUtils.parseTokenPayload<AuthIdentityToken>(encodedToken);
  assertAuthSignedIdentity(authIdentity);
  return encodedToken;
}

export { assertAuthSignedIdentity, parseAuthSignedIdentity };

export type { AuthIdentityToken };
