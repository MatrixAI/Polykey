import type { SessionToken } from '../sessions/types';
import type KeyRing from '../keys/KeyRing';
import type SessionManager from '../sessions/SessionManager';
import type { RPCRequestParams } from './types';
import type { JsonRpcRequest } from '../RPC/types';
import type { Certificate } from 'keys/types';
import type { DetailedPeerCertificate } from 'tls';
import type { NodeId } from 'ids/index';
import * as x509 from '@peculiar/x509';
import * as clientErrors from '../client/errors';
import * as networkErrors from '../network/errors';
import * as keysUtils from '../keys/utils/index';

async function authenticate(
  sessionManager: SessionManager,
  keyRing: KeyRing,
  message: JsonRpcRequest<RPCRequestParams>,
) {
  if (message.params == null) throw new clientErrors.ErrorClientAuthMissing();
  if (message.params.metadata == null) {
    throw new clientErrors.ErrorClientAuthMissing();
  }
  const auth = message.params.metadata.Authorization;
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

function decodeAuth(messageParams: RPCRequestParams) {
  const auth = messageParams.metadata?.Authorization;
  if (auth == null || !auth.startsWith('Bearer ')) {
    return;
  }
  return auth.substring(7) as SessionToken;
}

function encodeAuthFromPassword(password: string): string {
  const encoded = Buffer.from(`:${password}`).toString('base64');
  return `Basic ${encoded}`;
}

function detailedToCertChain(
  cert: DetailedPeerCertificate,
): Array<Certificate> {
  const certChain: Array<Certificate> = [];
  let currentCert = cert;
  while (true) {
    certChain.unshift(new x509.X509Certificate(currentCert.raw));
    if (currentCert === currentCert.issuerCertificate) break;
    currentCert = currentCert.issuerCertificate;
  }
  return certChain;
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
  certChain: Array<Certificate>,
): Promise<NodeId> {
  if (!certChain.length) {
    throw new networkErrors.ErrorCertChainEmpty(
      'No certificates available to verify',
    );
  }
  if (!nodeIds.length) {
    throw new networkErrors.ErrorConnectionNodesEmpty(
      'No nodes were provided to verify against',
    );
  }
  const now = new Date();
  let certClaim: Certificate | null = null;
  let certClaimIndex: number | null = null;
  let verifiedNodeId: NodeId | null = null;
  for (let certIndex = 0; certIndex < certChain.length; certIndex++) {
    const cert = certChain[certIndex];
    if (now < cert.notBefore || now > cert.notAfter) {
      throw new networkErrors.ErrorCertChainDateInvalid(
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
      throw new networkErrors.ErrorCertChainNameInvalid(
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
      throw new networkErrors.ErrorCertChainKeyInvalid(
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
      throw new networkErrors.ErrorCertChainSignatureInvalid(
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
    throw new networkErrors.ErrorCertChainUnclaimed(
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
        throw new networkErrors.ErrorCertChainBroken(
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
  detailedToCertChain,
  verifyServerCertificateChain,
};
