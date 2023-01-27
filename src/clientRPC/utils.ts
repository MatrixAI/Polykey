import type { SessionToken } from '../sessions/types';
import type KeyRing from '../keys/KeyRing';
import type SessionManager from '../sessions/SessionManager';
import type { Authenticate } from '../client/types';
import * as grpc from '@grpc/grpc-js';
import * as clientErrors from '../client/errors';

/**
 * Encodes an Authorization header from session token
 * Assumes token is already encoded
 * Will mutate metadata if it is passed in
 */
function encodeAuthFromSession(
  token: SessionToken,
  metadata: grpc.Metadata = new grpc.Metadata(),
): grpc.Metadata {
  metadata.set('Authorization', `Bearer ${token}`);
  return metadata;
}

function authenticator(
  sessionManager: SessionManager,
  keyRing: KeyRing,
): Authenticate {
  return async (
    forwardMetadata: grpc.Metadata,
    reverseMetadata: grpc.Metadata = new grpc.Metadata(),
  ) => {
    const auth = forwardMetadata.get('Authorization')[0] as string | undefined;
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
    encodeAuthFromSession(token, reverseMetadata);
    return reverseMetadata;
  };
}

export { authenticator };
