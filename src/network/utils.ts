import type { Socket } from 'net';
import type { TLSSocket } from 'tls';
import type { Certificate, PublicKey } from '../keys/types';
import type { NodeId } from '../nodes/types';

import net from 'net';
import { Buffer } from 'buffer';
import * as networkErrors from './errors';
import { sleep, isEmptyObject } from '../utils';
import { utils as keysUtils } from '../keys';

/**
 * Given Host and Port, create an address string.
 * @param host
 * @param port
 */
function buildAddress(host: string, port: number = 0): string {
  let address: string;
  if (net.isIPv4(host)) {
    address = `${host}:${port}`;
  } else if (net.isIPv6(host)) {
    address = `[${host}]:${port}`;
  } else {
    address = `${host}:${port}`;
  }
  return address;
}

function getPort(address: string): number {
  const [, dstPort] = address.split(':', 2);
  return parseInt(dstPort);
}

/**
 * IPv4 ONLY, may not work for IPv6.
 * @param address
 */
function getHost(address: string): string {
  const [dstHost] = address.split(':', 2);
  return dstHost.replace(/^\[+|\]+$/g, '');
}

/**
 * Payload Templates.
 */
function httpPayloadAuthenticationRequired(): string {
  return (
    'HTTP/1.1 407 Proxy Authentication Required\r\n' +
    'Proxy-Authenticate: Basic\r\n' +
    '\r\n'
  );
}

function httpPayloadConnectionEstablished(): string {
  return 'HTTP/1.1 200 Connection Established\r\n' + '\r\n';
}

/**
 * Given a bearer token, return a authentication token string.
 * @param token
 */
function toAuthToken(token: string) {
  return `Basic ${Buffer.from(token).toString('base64')}`;
}

/**
 * Hole Punch for traversing NAT.
 *
 * @param socket is a utp-native socket. I think other UDP socket implementation are also fine.
 * @param attempts is the number of attempts to hole punch.
 * @param port
 * @param host
 */
async function holePunch(
  socket: any,
  attempts: number = 50,
  port: number,
  host: string,
): Promise<boolean> {
  let punchCount: number = 0;
  let ackSent: boolean = false;
  let ackReceived: boolean = false;
  const done: boolean = false;
  let result: boolean = false;
  const synBuffer: Buffer = Buffer.from('GROUND_CONTROL');
  const synBufferSize: number = 14;
  const ackBuffer: Buffer = Buffer.from('MAJOR_TOM');
  const ackBufferSize: number = 9;

  // Monitoring hole punch state.
  const onMessage = (data: Buffer, rinfo) => {
    if (rinfo.address !== host || rinfo.port !== port) {
      return;
    }

    if (data.equals(synBuffer)) {
      socket.send(ackBuffer, 0, ackBufferSize, port, host, () => {
        ackSent = true;
        socket.send(ackBuffer, 0, ackBufferSize, port, host);
      });
    } else if (data.equals(ackBuffer)) {
      ackReceived = true;
    }
  };

  socket.on('message', onMessage);

  // Sending hole punch packets.
  while (punchCount <= attempts) {
    if (done) {
      result = true;
      break;
    }
    if (ackSent && ackReceived) {
      socket.removeListener('message', onMessage);
      result = true;
      break;
    }
    await new Promise<void>((resolve) => {
      socket.send(synBuffer, 0, synBufferSize, port, host, () => {
        resolve();
      });
    });
    punchCount += 1;
    await sleep(500);
  }

  if (punchCount > attempts) {
    socket.removeListener('message', onMessage);
    result = false;
  }

  return result;
}

function getCertificateChain(socket: TLSSocket): Array<Certificate> {
  // the order of certificates is always leaf to root
  const certs: Array<Certificate> = [];
  let cert_ = socket.getPeerCertificate(true);
  if (isEmptyObject(cert_)) {
    return certs;
  }
  while (true) {
    let cert: Certificate;
    try {
      cert = keysUtils.certFromDer(cert_.raw.toString('binary'));
    } catch (e) {
      break;
    }
    certs.push(cert);
    if (cert_.issuerCertificate !== cert_) {
      cert_ = cert_.issuerCertificate;
    } else {
      break;
    }
  }
  return certs;
}

/**
 * Checks whether a socket is the TLSSocket
 */
function isTLSSocket(socket: Socket | TLSSocket): socket is TLSSocket {
  return (socket as TLSSocket).encrypted;
}

/**
 * Acquires the NodeId from a certificate
 */
function certNodeId(cert: Certificate): NodeId {
  const commonName = cert.subject.getField({ type: '2.5.4.3' });
  return commonName.value as NodeId;
}

/**
 * Verify the server certificate chain when connecting to it from a client
 * This is a custom verification intended to verify that the server owned
 * the relevant NodeId.
 * It is possible that the server has a new NodeId. In that case we will
 * verify that the new NodeId is the true descendant of the target NodeId.
 */
function verifyServerCertificateChain(
  nodeId: NodeId,
  certChain: Array<Certificate>,
): void {
  if (!certChain.length) {
    throw new networkErrors.ErrorCertChainEmpty(
      'No certificates available to verify',
    );
  }
  const now = new Date();
  let certClaim: Certificate | undefined;
  let certClaimIndex: number | undefined;
  for (let certIndex = 0; certIndex < certChain.length; certIndex++) {
    const cert = certChain[certIndex];
    if (now < cert.validity.notBefore || now > cert.validity.notAfter) {
      throw new networkErrors.ErrorCertChainDateInvalid(
        'Chain certificate date is invalid',
        {
          cert,
          certIndex,
          notBefore: cert.validity.notBefore,
          notAfter: cert.validity.notAfter,
          now,
        },
      );
    }
    const commonName = cert.subject.getField({ type: '2.5.4.3' });
    if (commonName == null) {
      throw new networkErrors.ErrorCertChainNameInvalid(
        'Chain certificate common name attribute is missing',
        {
          cert,
          certIndex,
        },
      );
    }
    const certNodeId = keysUtils.publicKeyToFingerprint(
      cert.publicKey as PublicKey,
    );
    if (commonName.value !== certNodeId) {
      throw new networkErrors.ErrorCertChainKeyInvalid(
        'Chain certificate public key does not generate its node id',
        {
          cert,
          certIndex,
          nodeId: certNodeId,
          commonName: commonName.value,
        },
      );
    }
    if (!keysUtils.certVerifiedNode(cert)) {
      throw new networkErrors.ErrorCertChainSignatureInvalid(
        'Chain certificate does not have a valid node-signature',
        {
          cert,
          certIndex,
        },
      );
    }
    if (commonName.value === nodeId) {
      // found the certificate claiming the nodeId
      certClaim = cert;
      certClaimIndex = certIndex;
      break;
    }
  }
  if (certClaimIndex == null || certClaim == null) {
    throw new networkErrors.ErrorCertChainUnclaimed(
      'Node ID is not claimed by any certificate',
      {
        nodeId,
      },
    );
  }
  if (certClaimIndex > 0) {
    let certParent;
    let certChild;
    for (let certIndex = certClaimIndex; certIndex > 0; certIndex--) {
      certParent = certChain[certIndex];
      certChild = certChain[certIndex - 1];
      if (
        !keysUtils.certIssued(certParent, certChild) ||
        !keysUtils.certVerified(certParent, certChild)
      ) {
        throw new networkErrors.ErrorCertChainBroken(
          'Chain certificate is not signed by parent certificate',
          {
            cert: certChild,
            certIndex: certIndex - 1,
            certParent,
          },
        );
      }
    }
  }
}

/**
 * Verify the client certificate chain when it connects to the server.
 * The server does have a target NodeId. This means we verify the entire chain.
 */
function verifyClientCertificateChain(certChain: Array<Certificate>): void {
  if (!certChain.length) {
    throw new networkErrors.ErrorCertChainEmpty(
      'No certificates available to verify',
    );
  }
  const now = new Date();
  for (let certIndex = 0; certIndex < certChain.length; certIndex++) {
    const cert = certChain[certIndex];
    const certNext = certChain[certIndex + 1];
    if (now < cert.validity.notBefore || now > cert.validity.notAfter) {
      throw new networkErrors.ErrorCertChainDateInvalid(
        'Chain certificate date is invalid',
        {
          cert,
          certIndex,
          notBefore: cert.validity.notBefore,
          notAfter: cert.validity.notAfter,
          now,
        },
      );
    }
    const commonName = cert.subject.getField({ type: '2.5.4.3' });
    if (commonName == null) {
      throw new networkErrors.ErrorCertChainNameInvalid(
        'Chain certificate common name attribute is missing',
        {
          cert,
          certIndex,
        },
      );
    }
    const certNodeId = keysUtils.publicKeyToFingerprint(
      cert.publicKey as PublicKey,
    );
    if (commonName.value !== certNodeId) {
      throw new networkErrors.ErrorCertChainKeyInvalid(
        'Chain certificate public key does not generate its node id',
        {
          cert,
          certIndex,
          nodeId: certNodeId,
          commonName: commonName.value,
        },
      );
    }
    if (!keysUtils.certVerifiedNode(cert)) {
      throw new networkErrors.ErrorCertChainSignatureInvalid(
        'Chain certificate does not have a valid node-signature',
        {
          cert,
          certIndex,
        },
      );
    }
    if (certNext != null) {
      if (
        !keysUtils.certIssued(certNext, cert) ||
        !keysUtils.certVerified(certNext, cert)
      ) {
        throw new networkErrors.ErrorCertChainSignatureInvalid(
          'Chain certificate is not signed by parent certificate',
          {
            cert,
            certIndex,
            certParent: certNext,
          },
        );
      }
    }
  }
}

export {
  buildAddress,
  httpPayloadAuthenticationRequired,
  httpPayloadConnectionEstablished,
  toAuthToken,
  holePunch,
  getPort,
  getHost,
  isTLSSocket,
  certNodeId,
  getCertificateChain,
  verifyServerCertificateChain,
  verifyClientCertificateChain,
};
