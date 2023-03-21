import type { ClientRPCRequestParams } from '../types';
import type SessionManager from 'sessions/SessionManager';
import type KeyRing from 'keys/KeyRing';
import type { JsonRpcRequest } from 'rpc/types';
import type { SessionToken } from 'sessions/types';
import * as clientErrors from '../errors';

async function authenticate(
  sessionManager: SessionManager,
  keyRing: KeyRing,
  message: JsonRpcRequest<ClientRPCRequestParams>,
) {
  if (message.params == null) throw new clientErrors.ErrorClientAuthMissing();
  if (message.params.metadata == null) {
    throw new clientErrors.ErrorClientAuthMissing();
  }
  const auth = message.params.metadata.authorization;
  if (auth == null) {
    throw new clientErrors.ErrorClientAuthMissing();
  }
  if (auth.startsWith('Bearer ')) {
    const token = auth.substring(7) as SessionToken;
    if (!(await sessionManager.verifyToken(token))) {
      throw new clientErrors.ErrorClientAuthDenied();
    }
  } else if (auth.startsWith('Basic ')) {
    const encoded = auth.substring(6);
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    const match = decoded.match(/:(.*)/);
    if (match == null) {
      throw new clientErrors.ErrorClientAuthFormat();
    }
    const password = match[1];
    if (!(await keyRing.checkPassword(password))) {
      throw new clientErrors.ErrorClientAuthDenied();
    }
  } else {
    throw new clientErrors.ErrorClientAuthMissing();
  }
  const token = await sessionManager.createToken();
  return `Bearer ${token}`;
}

function decodeAuth(messageParams: ClientRPCRequestParams) {
  const auth = messageParams.metadata?.authorization;
  if (auth == null || !auth.startsWith('Bearer ')) {
    return;
  }
  return auth.substring(7) as SessionToken;
}

function encodeAuthFromPassword(password: string): string {
  const encoded = Buffer.from(`:${password}`).toString('base64');
  return `Basic ${encoded}`;
}

/**
 * Encodes an Authorization header from session token
 * Assumes token is already encoded
 * Will mutate metadata if it is passed in
 */
function encodeAuthFromSession(token: SessionToken): string {
  return `Bearer ${token}`;
}

/**
 * Decodes an Authorization header to session token
 * The server is expected to only provide bearer tokens
 */
function decodeAuthToSession(
  messageParams: ClientRPCRequestParams,
): SessionToken | undefined {
  const auth = messageParams.metadata?.authorization;
  if (auth == null || !auth.startsWith('Bearer ')) {
    return;
  }
  return auth.substring(7) as SessionToken;
}

export {
  authenticate,
  decodeAuth,
  encodeAuthFromPassword,
  encodeAuthFromSession,
  decodeAuthToSession,
};
