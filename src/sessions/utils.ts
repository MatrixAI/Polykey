import type { JWTPayload } from 'jose';
import type { SessionToken } from './types';

import { SignJWT, jwtVerify, errors as joseErrors } from 'jose';

/**
 * Create session token
 * The token is expected to be used by the node's client
 * This uses the HMAC with SHA-256 JWT
 * It is signed with a symmetric key
 * It is deterministic
 * @param expiry Seconds from now or infinite
 */
async function createSessionToken(
  payload: JWTPayload,
  key: Uint8Array,
  expiry?: number,
): Promise<SessionToken> {
  const jwt = new SignJWT(payload);
  jwt.setProtectedHeader({ alg: 'HS256' });
  jwt.setIssuedAt();
  if (expiry != null) {
    jwt.setExpirationTime(new Date().getTime() / 1000 + expiry);
  }
  const token = await jwt.sign(key);
  return token as SessionToken;
}

/**
 * Verifies session token
 * This verifies format, expiry and signature
 * @returns Payload if successful or undefined
 */
async function verifySessionToken(
  token: SessionToken,
  key: Uint8Array,
): Promise<JWTPayload | undefined> {
  try {
    const result = await jwtVerify(token, key);
    return result.payload;
  } catch (e) {
    if (e instanceof joseErrors.JOSEError) {
      return;
    }
    throw e;
  }
}

export { createSessionToken, verifySessionToken };
