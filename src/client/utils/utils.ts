import type {
  NextCall,
  Interceptor,
  InterceptorOptions,
} from '@grpc/grpc-js/build/src/client-interceptors';
import type KeyManager from '../../keys/KeyManager';
import type Session from '../../sessions/Session';
import type SessionManager from '../../sessions/SessionManager';
import type { SessionToken } from '../../sessions/types';
import type { Authenticate } from '../types';
import * as base64 from 'multiformats/bases/base64';
import * as grpc from '@grpc/grpc-js';
import * as clientErrors from '../errors';

/**
 * Session interceptor middleware for authenticatio
 * Session token is read at the beginning of every call
 * Session token is written if the server returns a new token
 */
function sessionInterceptor(session: Session): Interceptor {
  const interceptor: Interceptor = (
    options: InterceptorOptions,
    nextCall: NextCall,
  ) => {
    const requester = {
      start: async (metadata: grpc.Metadata, _, next) => {
        // Outbound interception
        // This executes before the call is started
        // Set the session token only if the caller hasn't set a Basic token
        if (metadata.get('Authorization').length === 0) {
          const token = await session.readToken();
          if (token != null) {
            encodeAuthFromSession(token, metadata);
          }
        }
        next(metadata, {
          // Inbound interception
          onReceiveMetadata: async (metadata: grpc.Metadata, next) => {
            // This executes when the metadata is received from the server
            const token = decodeAuthToSession(metadata);
            if (token != null) {
              await session.writeToken(token);
            }
            next(metadata);
          },
        });
      },
    };
    return new grpc.InterceptingCall(nextCall(options), requester);
  };
  return interceptor;
}

function authenticator(
  sessionManager: SessionManager,
  keyManager: KeyManager,
): Authenticate {
  return async (
    metadataClient: grpc.Metadata,
    metadataServer: grpc.Metadata = new grpc.Metadata(),
  ) => {
    const auth = metadataClient.get('Authorization')[0] as string | undefined;
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
      const decoded = base64.base64pad.baseDecode(encoded);
      const decodedString = String.fromCharCode(...decoded);
      const match = decodedString.match(/:(.*)/);
      if (match == null) {
        throw new clientErrors.ErrorClientAuthFormat();
      }
      const password = match[1];
      if (!(await keyManager.checkPassword(password))) {
        throw new clientErrors.ErrorClientAuthDenied();
      }
    } else {
      throw new clientErrors.ErrorClientAuthMissing();
    }
    const token = await sessionManager.createToken();
    encodeAuthFromSession(token, metadataServer);
    return metadataServer;
  };
}

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

/**
 * Encodes an Authorization header from password
 * Uses base64 standard format with padding
 * Only use this on small data
 * Will mutate metadata if it is passed in
 */
function encodeAuthFromPassword(
  password: string,
  metadata: grpc.Metadata = new grpc.Metadata(),
): grpc.Metadata {
  const encoded = base64.base64pad.baseEncode(
    Uint8Array.from([...`:${password}`].map((c) => c.charCodeAt(0))),
  );
  metadata.set('Authorization', `Basic ${encoded}`);
  return metadata;
}

/**
 * Decodes an Authorization header to session token
 * The server is expected to only provide bearer tokens
 */
function decodeAuthToSession(
  metadata: grpc.Metadata,
): SessionToken | undefined {
  const auth = metadata.get('Authorization')[0] as string | undefined;
  if (auth == null || !auth.startsWith('Bearer ')) {
    return;
  }
  return auth.substring(7) as SessionToken;
}

export {
  sessionInterceptor,
  authenticator,
  encodeAuthFromPassword,
  encodeAuthFromSession,
  decodeAuthToSession,
};
