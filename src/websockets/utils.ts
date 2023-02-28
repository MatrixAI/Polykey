import type { Certificate } from 'keys/types';
import type { DetailedPeerCertificate } from 'tls';
import type { NodeId } from 'ids/index';
import * as x509 from '@peculiar/x509';
import * as webSocketErrors from './errors';
import * as keysUtils from '../keys/utils/index';

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
    throw new webSocketErrors.ErrorCertChainEmpty(
      'No certificates available to verify',
    );
  }
  if (!nodeIds.length) {
    throw new webSocketErrors.ErrorConnectionNodesEmpty(
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
      throw new webSocketErrors.ErrorCertChainDateInvalid(
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
      throw new webSocketErrors.ErrorCertChainNameInvalid(
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
      throw new webSocketErrors.ErrorCertChainKeyInvalid(
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
      throw new webSocketErrors.ErrorCertChainSignatureInvalid(
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
    throw new webSocketErrors.ErrorCertChainUnclaimed(
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
        throw new webSocketErrors.ErrorCertChainBroken(
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

export { detailedToCertChain, verifyServerCertificateChain };
