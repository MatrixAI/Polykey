import type { SessionToken } from './types';
import Token from '../tokens/Token';
import { TokenPayload } from '../tokens/types';
import { Key } from '../keys/types';

/**
 * Create session token
 * The token is expected to be used by the node's client
 * This uses the HMAC with SHA-256 JWT
 * It is signed with a symmetric key
 * It is deterministic
 * @param payload
 * @param key
 * @param expiry Seconds from now or infinite
 */
async function createSessionToken(
  payload: TokenPayload,
  key: Key,
  expiry?: number,
): Promise<SessionToken> {
  const expiry_ = expiry != null ? Date.now() / 1000 + expiry : undefined
  const token = Token.fromPayload({
    ...payload,
    exp: expiry_,
    iat: Date.now() / 1000,
  })
  token.signWithKey(key);
  return JSON.stringify(token.toJSON()) as SessionToken;
}

/**
 * Verifies session token
 * This verifies format, expiry and signature
 * @returns Payload if successful or undefined
 */
async function verifySessionToken(
  token: SessionToken,
  key: Key,
): Promise<TokenPayload | undefined> {
  try {
    const signedTokenEncoded = JSON.parse(token);
    const parsedToken = Token.fromEncoded(signedTokenEncoded);
    parsedToken.verifyWithKey(key);
    return parsedToken.payload;
  } catch {
    return;
  }
}

export { createSessionToken, verifySessionToken };
