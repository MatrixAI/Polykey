import type { SignedToken, TokenPayload } from '../types.js';
import type { NodeIdEncoded } from '../../ids/types.js';
import * as tokensUtils from '../utils.js';
import * as ids from '../../ids/index.js';
import * as validationErrors from '../../validation/errors.js';
import * as utils from '../../utils/index.js';

interface AuthSignedIdentity extends TokenPayload {
  typ: 'AuthSignedIdentity';
  iss: NodeIdEncoded;
  exp: number;
  jti: string;
}

function assertAuthSignedIdentity(
  authSignedIdentity: unknown,
): asserts authSignedIdentity is AuthSignedIdentity {
  if (!utils.isObject(authSignedIdentity)) {
    throw new validationErrors.ErrorParse('must be POJO');
  }
  if (authSignedIdentity['typ'] !== 'AuthSignedIdentity') {
    throw new validationErrors.ErrorParse(
      '`typ` property must be `AuthSignedToken`',
    );
  }
  if (
    authSignedIdentity['iss'] == null ||
    ids.decodeNodeId(authSignedIdentity['iss'] == null)
  ) {
    throw new validationErrors.ErrorParse(
      '`iss` property must be an encoded node ID',
    );
  }
  if (typeof authSignedIdentity['exp'] !== 'number') {
    throw new validationErrors.ErrorParse('`exp` property must be a number');
  }
  if (typeof authSignedIdentity['jti'] !== 'string') {
    throw new validationErrors.ErrorParse('`jti` property must be a string');
  }
}

function parseAuthSignedIdentity(
  authIdentityEncoded: unknown,
): SignedToken<AuthSignedIdentity> {
  const encodedToken =
    tokensUtils.parseSignedToken<AuthSignedIdentity>(authIdentityEncoded);
  const authIdentity =
    tokensUtils.parseTokenPayload<AuthSignedIdentity>(encodedToken);
  assertAuthSignedIdentity(authIdentity);
  return encodedToken;
}

export { assertAuthSignedIdentity, parseAuthSignedIdentity };

export type { AuthSignedIdentity };
