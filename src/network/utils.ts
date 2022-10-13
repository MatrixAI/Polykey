import type { Socket } from 'net';
import type { TLSSocket } from 'tls';
import type { Host, Hostname, Port, Address, NetworkMessage } from './types';
import type { Certificate, PublicKey } from '../keys/types';
import type { NodeId } from '../ids/types';
import { Buffer } from 'buffer';
import dns from 'dns';
import { IPv4, IPv6, Validator } from 'ip-num';
import * as networkErrors from './errors';
import * as keysUtils from '../keys/utils';
import * as nodesUtils from '../nodes/utils';
import { isEmptyObject, never, promisify } from '../utils';
import { CertificateASN1 } from '../keys/types';
import { keys } from '@matrixai/logger/dist/formatting';

const pingBuffer = serializeNetworkMessage({
  type: 'ping',
});

const pongBuffer = serializeNetworkMessage({
  type: 'pong',
});

/**
 * Validates that a provided host address is a valid IPv4 or IPv6 address.
 */
function isHost(host: any): host is Host {
  if (typeof host !== 'string') return false;
  const [isIPv4] = Validator.isValidIPv4String(host);
  const [isIPv6] = Validator.isValidIPv6String(host);
  return isIPv4 || isIPv6;
}

function isHostWildcard(host: Host): boolean {
  return host === '0.0.0.0' || host === '::';
}

/**
 * Validates hostname as per RFC 1123
 */
function isHostname(hostname: any): hostname is Hostname {
  if (typeof hostname !== 'string') return false;
  const regex =
    /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/;
  return regex.test(hostname);
}

/**
 * Ports must be numbers between 0 and 65535 inclusive
 * If connect is true, then port must be a number between 1 and 65535 inclusive
 */
function isPort(port: any, connect: boolean = false): port is Port {
  if (typeof port !== 'number') return false;
  if (port < 0 || port > 65535) return false;
  if (connect && port === 0) return false;
  return true;
}

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
 * Resolves a provided hostname to its respective IP address (type Host)
 */
async function resolveHost(host: Host | Hostname): Promise<Host> {
  // If already IPv4/IPv6 address, return it
  if (isHost(host)) {
    return host as Host;
  }
  const lookup = promisify(dns.lookup).bind(dns);
  let resolvedHost;
  try {
    // Resolve the hostname and get the IPv4 address
    resolvedHost = await lookup(host, 4);
  } catch (e) {
    throw new networkErrors.ErrorHostnameResolutionFailed(e.message, {
      cause: e,
    });
  }
  // Returns an array of [ resolved address, family (4 or 6) ]
  return resolvedHost[0] as Host;
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
    let cert: Certificate | undefined;
    try {
      cert = keysUtils.certFromASN1(cert_.raw as CertificateASN1);
      if (cert == null) never();
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
    // TODO: re-enable this and fix it.
    // const commonName = cert.subject.getField({ type: '2.5.4.3' });
    // if (commonName == null) {
    //   throw new networkErrors.ErrorCertChainNameInvalid(
    //     'Chain certificate common name attribute is missing',
    //     {
    //       data: {
    //         cert,
    //         certIndex,
    //       },
    //     },
    //   );
    // }
    // const certNodeId = keysUtils.publicKeyToNodeId(cert.publicKey as PublicKey);
    // if (commonName.value !== nodesUtils.encodeNodeId(certNodeId)) {
    //   throw new networkErrors.ErrorCertChainKeyInvalid(
    //     'Chain certificate public key does not generate its node id',
    //     {
    //       data: {
    //         cert,
    //         certIndex,
    //         nodeId: certNodeId,
    //         commonName: commonName.value,
    //       },
    //     },
    //   );
    // }
    if (!keysUtils.certNodeSigned(cert)) {
      throw new networkErrors.ErrorCertChainSignatureInvalid(
        'Chain certificate does not have a valid node-signature',
        {
          data: {
            cert,
            certIndex,
          },
        },
      );
    }
    if (nodeId.equals(keysUtils.certNodeId(cert)!)) {
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
        data: { nodeId },
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
        !keysUtils.certSignedBy(certParent, keysUtils.certPublicKey(certChild)!)
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
    // FIXME: re-enable and fix this
    // const commonName = cert.subject.getField({ type: '2.5.4.3' });
    // if (commonName == null) {
    //   throw new networkErrors.ErrorCertChainNameInvalid(
    //     'Chain certificate common name attribute is missing',
    //     {
    //       data: {
    //         cert,
    //         certIndex,
    //       },
    //     },
    //   );
    // }
    // const certNodeId = keysUtils.publicKeyToNodeId(cert.publicKey as PublicKey);
    // if (commonName.value !== nodesUtils.encodeNodeId(certNodeId)) {
    //   throw new networkErrors.ErrorCertChainKeyInvalid(
    //     'Chain certificate public key does not generate its node id',
    //     {
    //       data: {
    //         cert,
    //         certIndex,
    //         nodeId: certNodeId,
    //         commonName: commonName.value,
    //       },
    //     },
    //   );
    // }
    if (!keysUtils.certNodeSigned(cert)) {
      throw new networkErrors.ErrorCertChainSignatureInvalid(
        'Chain certificate does not have a valid node-signature',
        {
          data: {
            cert,
            certIndex,
          },
        },
      );
    }
    if (certNext != null) {
      if (
        !keysUtils.certIssuedBy(certNext, cert) ||
        !keysUtils.certSignedBy(certNext, keysUtils.certPublicKey(cert)!)
      ) {
        throw new networkErrors.ErrorCertChainSignatureInvalid(
          'Chain certificate is not signed by parent certificate',
          {
            data: {
              cert,
              certIndex,
              certParent: certNext,
            },
          },
        );
      }
    }
  }
}

export {
  pingBuffer,
  pongBuffer,
  isHost,
  isHostWildcard,
  isHostname,
  isPort,
  toAuthToken,
  buildAddress,
  parseAddress,
  resolveHost,
  resolvesZeroIP,
  serializeNetworkMessage,
  unserializeNetworkMessage,
  isTLSSocket,
  getCertificateChain,
  verifyServerCertificateChain,
  verifyClientCertificateChain,
};
