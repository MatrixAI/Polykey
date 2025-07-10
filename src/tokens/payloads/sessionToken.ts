import type { SignedToken, TokenPayload } from '../types.js';
import * as tokensUtils from '../utils.js';
import * as validationErrors from '../../validation/errors.js';
import * as utils from '../../utils/index.js';

interface SessionToken extends TokenPayload {
  iat: number;
}

function assertSessionToken(
  sessionToken: unknown,
): asserts sessionToken is SessionToken {
  if (!utils.isObject(sessionToken)) {
    throw new validationErrors.ErrorParse('must be POJO');
  }
  if (sessionToken['iat'] !== 'number') {
    throw new validationErrors.ErrorParse('`iat` property must be a number');
  }
}

function parseSessionToken(sessionToken: unknown): SignedToken<SessionToken> {
  if (typeof sessionToken !== 'string') {
    throw new validationErrors.ErrorParse('sessionToken must be a string');
  }
  let parsedToken: unknown;
  try {
    parsedToken = JSON.parse(sessionToken);
  } catch {
    throw new validationErrors.ErrorParse('sessionToken must be valid JSON');
  }
  const encodedToken = tokensUtils.parseSignedToken<SessionToken>(parsedToken);
  const sessionPayload =
    tokensUtils.parseTokenPayload<SessionToken>(encodedToken);
  assertSessionToken(sessionPayload);
  return encodedToken;
}

export { assertSessionToken, parseSessionToken };

export type { SessionToken };
