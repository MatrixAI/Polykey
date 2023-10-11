import type { JSONRPCRequest } from '@matrixai/rpc';
import type { ClientRPCRequestParams } from '../types';
import type SessionManager from '../../sessions/SessionManager';
import type { Certificate, CertificatePEM } from '../../keys/types';
import type KeyRing from '../../keys/KeyRing';
import type { SessionToken } from '../../sessions/types';
import type { NodeId } from '../../ids';
import { utils as wsUtils } from '@matrixai/ws';
import * as keysUtils from '../../keys/utils';
import * as clientErrors from '../errors';

async function authenticate(
  sessionManager: SessionManager,
  keyRing: KeyRing,
  message: JSONRPCRequest<ClientRPCRequestParams>,
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

/**
 * Verify the server certificate chain when connecting to it from a client
 * This is a custom verification intended to verify that the server owned
 * the relevant NodeId.
 * It is possible that the server has a new NodeId. In that case we will
 * verify that the new NodeId is the true descendant of the target NodeId.
 */
async function verifyServerCertificateChain(
  nodeIds: Array<NodeId>,
  certs: Array<Uint8Array>,
): Promise<NodeId> {
  if (certs.length === 0) {
    throw new clientErrors.ErrorClientVerificationFailed(
      'No certificates available to verify',
    );
  }
  if (nodeIds.length === 0) {
    throw new clientErrors.ErrorClientVerificationFailed(
      'No nodes were provided to verify against',
    );
  }
  const now = new Date();
  let certClaim: Certificate | null = null;
  let certClaimIndex: number | null = null;
  let verifiedNodeId: NodeId | null = null;
  const certChain = certs.map((v) => {
    const cert = keysUtils.certFromPEM(wsUtils.derToPEM(v) as CertificatePEM);
    if (cert == null) {
      throw new clientErrors.ErrorClientVerificationFailed(
        'Failed to parse certificate',
      );
    }
    return cert;
  });
  for (let certIndex = 0; certIndex < certChain.length; certIndex++) {
    const cert = certChain[certIndex];
    if (now < cert.notBefore || now > cert.notAfter) {
      throw new clientErrors.ErrorClientVerificationFailed(
        'Chain certificate date is invalid',
        {
          data: {
            cert,
            certIndex,
            notBefore: cert.notBefore,
            notAfter: cert.notAfter,
            now,
          },
        },
      );
    }
    const certNodeId = keysUtils.certNodeId(cert);
    if (certNodeId == null) {
      throw new clientErrors.ErrorClientVerificationFailed(
        'Chain certificate common name attribute is missing',
        {
          data: {
            cert,
            certIndex,
          },
        },
      );
    }
    const certPublicKey = keysUtils.certPublicKey(cert);
    if (certPublicKey == null) {
      throw new clientErrors.ErrorClientVerificationFailed(
        'Chain certificate public key is missing',
        {
          data: {
            cert,
            certIndex,
          },
        },
      );
    }
    if (!(await keysUtils.certNodeSigned(cert))) {
      throw new clientErrors.ErrorClientVerificationFailed(
        'Chain certificate does not have a valid node-signature',
        {
          data: {
            cert,
            certIndex,
            nodeId: keysUtils.publicKeyToNodeId(certPublicKey),
            commonName: certNodeId,
          },
        },
      );
    }
    for (const nodeId of nodeIds) {
      if (certNodeId.equals(nodeId)) {
        // Found the certificate claiming the nodeId
        certClaim = cert;
        certClaimIndex = certIndex;
        verifiedNodeId = nodeId;
      }
    }
    // If cert is found then break out of loop
    if (verifiedNodeId != null) break;
  }
  if (certClaimIndex == null || certClaim == null || verifiedNodeId == null) {
    throw new clientErrors.ErrorClientVerificationFailed(
      'Node IDs is not claimed by any certificate',
      {
        data: { nodeIds },
      },
    );
  }
  if (certClaimIndex > 0) {
    let certParent: Certificate;
    let certChild: Certificate;
    for (let certIndex = certClaimIndex; certIndex > 0; certIndex--) {
      certParent = certChain[certIndex];
      certChild = certChain[certIndex - 1];
      if (
        !keysUtils.certIssuedBy(certParent, certChild) ||
        !(await keysUtils.certSignedBy(
          certParent,
          keysUtils.certPublicKey(certChild)!,
        ))
      ) {
        throw new clientErrors.ErrorClientVerificationFailed(
          'Chain certificate is not signed by parent certificate',
          {
            data: {
              cert: certChild,
              certIndex: certIndex - 1,
              certParent,
            },
          },
        );
      }
    }
  }
  return verifiedNodeId;
}

export {
  authenticate,
  decodeAuth,
  encodeAuthFromPassword,
  encodeAuthFromSession,
  decodeAuthToSession,
  verifyServerCertificateChain,
};
