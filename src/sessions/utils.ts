import type { SessionToken } from './types';
import type { TokenPayload } from '../tokens/types';
import type { Key } from '../keys/types';
import Token from '../tokens/Token';

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
  const expiry_ =
    expiry != null ? Math.round(Date.now() / 1000) + expiry : undefined;
  const token = Token.fromPayload({
    ...payload,
    exp: expiry_,
    iat: Date.now() / 1000,
  });
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
    if (!parsedToken.verifyWithKey(key)) return;
    const expiry = parsedToken.payload.exp;
    if (expiry != null && expiry < Math.round(Date.now() / 1000)) return;
    return parsedToken.payload;
  } catch (e) {
    return;
  }
}

export { createSessionToken, verifySessionToken };
