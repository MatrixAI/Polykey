import type { Socket } from 'net';
import type { TLSSocket } from 'tls';
import type { Host, Port, Address, NetworkMessage } from './types';
import type { Certificate, PublicKey } from '../keys/types';
import type { NodeId } from '../nodes/types';

import { Buffer } from 'buffer';
import { IPv4, IPv6, Validator } from 'ip-num';
import * as networkErrors from './errors';
import { isEmptyObject } from '../utils';
import { utils as keysUtils } from '../keys';

const pingBuffer = serializeNetworkMessage({
  type: 'ping',
});

const pongBuffer = serializeNetworkMessage({
  type: 'pong',
});

/**
 * Given a bearer token, return a authentication token string.
 */
function toAuthToken(token: string) {
  return `Basic ${Buffer.from(token).toString('base64')}`;
}

/**
 * Given host and port, create an address string.
 */
function buildAddress(host: Host, port: Port = 0 as Port): Address {
  let address: string;
  const [isIPv4] = Validator.isValidIPv4String(host);
  const [isIPv6] = Validator.isValidIPv6String(host);
  if (isIPv4) {
    address = `${host}:${port}`;
  } else if (isIPv6) {
    address = `[${host}]:${port}`;
  } else {
    address = `${host}:${port}`;
  }
  return address as Address;
}

/**
 * Parse an address string into host and port
 */
function parseAddress(address: string): [Host, Port] {
  const url = new URL(`pk://${address}`);
  const dstHostMatch = url.hostname.match(/\[(.+)\]|(.+)/)!;
  const dstHost = dstHostMatch[1] ?? dstHostMatch[2];
  const dstPort = url.port === '' ? 80 : parseInt(url.port);
  return [dstHost as Host, dstPort as Port];
}

/**
 * Zero IPs should be resolved to localhost when used as the target
 * This is usually done automatically, but utp-native doesn't do this
 */
function resolvesZeroIP(ip: Host): Host {
  const [isIPv4] = Validator.isValidIPv4String(ip);
  const [isIPv6] = Validator.isValidIPv6String(ip);
  const zeroIPv4 = new IPv4('0.0.0.0');
  const zeroIPv6 = new IPv6('::');
  if (isIPv4 && new IPv4(ip).isEquals(zeroIPv4)) {
    return '127.0.0.1' as Host;
  } else if (isIPv6 && new IPv6(ip).isEquals(zeroIPv6)) {
    return '::1' as Host;
  } else {
    return ip;
  }
}

function serializeNetworkMessage(msg: NetworkMessage): Buffer {
  const buf = Buffer.allocUnsafe(4);
  if (msg.type === 'ping') {
    buf.writeUInt32BE(0);
  } else if (msg.type === 'pong') {
    buf.writeUInt32BE(1);
  }
  return buf;
}

function unserializeNetworkMessage(data: Buffer): NetworkMessage {
  const type = data.readUInt32BE();
  if (type === 0) {
    return { type: 'ping' };
  } else if (type === 1) {
    return { type: 'pong' };
  }
  throw new networkErrors.ErrorConnectionMessageParse();
}

function getCertificateChain(socket: TLSSocket): Array<Certificate> {
  // The order of certificates is always leaf to root
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
      // Found the certificate claiming the nodeId
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
  pingBuffer,
  pongBuffer,
  toAuthToken,
  buildAddress,
  parseAddress,
  resolvesZeroIP,
  serializeNetworkMessage,
  unserializeNetworkMessage,
  isTLSSocket,
  certNodeId,
  getCertificateChain,
  verifyServerCertificateChain,
  verifyClientCertificateChain,
};
