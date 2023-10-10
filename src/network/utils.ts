import type { PromiseCancellable } from '@matrixai/async-cancellable';
import type { ContextTimed } from '@matrixai/contexts';
import type { Address, Host, Hostname, Port } from './types';
import type { Certificate, CertificatePEM } from '../keys/types';
import type { NodeId } from '../ids/types';
import type { NodeAddress } from '../nodes/types';
import type { JSONValue } from '../types';
import type { X509Certificate } from '@peculiar/x509';
import dns from 'dns';
import { IPv4, IPv6, Validator } from 'ip-num';
import { timedCancellable } from '@matrixai/contexts/dist/functions';
import { CryptoError } from '@matrixai/quic/dist/native';
import { utils as quicUtils } from '@matrixai/quic';
import { AbstractError } from '@matrixai/errors';
import * as networkErrors from './errors';
import * as keysUtils from '../keys/utils';
import * as errors from '../errors';

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
 * Checks if error is software error.
 * These error codes would mean there's something broken with DNS.
 */
function isDNSError(e: { code: string }): boolean {
  return (
    e.code === dns.EOF ||
    e.code === dns.FILE ||
    e.code === dns.NOMEM ||
    e.code === dns.DESTRUCTION ||
    e.code === dns.BADFLAGS ||
    e.code === dns.BADHINTS ||
    e.code === dns.NOTINITIALIZED ||
    e.code === dns.LOADIPHLPAPI ||
    e.code === dns.ADDRGETNETWORKPARAMS
  );
}

/**
 * Resolve a hostname to all IPv4 and IPv6 hosts.
 * It does an iterative BFS over any CNAME records.
 * This performs proper DNS lookup, it does not use the operating system's
 * resolver. However the default set of DNS servers is inherited from the
 * operating system configuration.
 * The default time limit is practically infinity.
 * This means if the DNS server doesn't respond, this function could take
 * a very long time.
 */
function resolveHostname(
  hostname: Hostname,
  servers?: Array<string>,
  ctx?: Partial<ContextTimed>,
): PromiseCancellable<Array<Host>> {
  const f = async (ctx: ContextTimed) => {
    const hosts: Array<Host> = [];
    if (ctx.signal.aborted) {
      return hosts;
    }
    // These settings here practically ensure an infinite resolver
    // The `timeout` is the timeout per DNS packet
    // The default of `-1` is an exponential backoff starting at 5s
    // It doubles from there
    // The maximum timeout is `Math.pow(2, 31) - 1`
    // The maximum number of tries is `Math.pow(2, 31) - 1`
    const resolver = new dns.promises.Resolver({
      timeout: -1,
      tries: Math.pow(2, 31) - 1,
    });
    // Even if you set a custom set of servers
    // it is possible for it retrieve cached results
    // Note that you should use `dns.getServers()` to get
    // the default set to be used
    // Servers will be tried in array-order
    if (servers != null) {
      resolver.setServers(servers);
    }
    // The default DNS servers are inherited from the OS
    ctx.signal.addEventListener('abort', () => {
      // This will trigger `dns.CANCELLED` error
      // This will result in just returning whatever is in the hosts
      resolver.cancel();
    });
    // Breadth first search through the CNAME records
    const queue = [hostname];
    while (queue.length > 0) {
      const target = queue.shift()!;
      let cnames: Array<Hostname>;
      try {
        cnames = (await resolver.resolveCname(target)) as Array<Hostname>;
      } catch (e) {
        if (e.code === dns.CANCELLED || e.code === dns.TIMEOUT) {
          return hosts;
        } else if (isDNSError(e)) {
          throw new networkErrors.ErrorDNSResolver(undefined, { cause: e });
        } else {
          cnames = [];
        }
      }
      if (cnames.length > 0) {
        // Usually only 1 CNAME is used
        // but here we can support multiple CNAMEs
        queue.push(...cnames);
      } else {
        let ipv4Hosts: Array<Host>;
        try {
          ipv4Hosts = (await resolver.resolve4(hostname)) as Array<Host>;
        } catch (e) {
          if (e.code === dns.CANCELLED || e.code === dns.TIMEOUT) {
            return hosts;
          } else if (isDNSError(e)) {
            throw new networkErrors.ErrorDNSResolver(undefined, { cause: e });
          } else {
            ipv4Hosts = [];
          }
        }
        let ipv6Hosts: Array<Host>;
        try {
          ipv6Hosts = (await resolver.resolve6(hostname)) as Array<Host>;
        } catch (e) {
          if (e.code === dns.CANCELLED || e.code === dns.TIMEOUT) {
            return hosts;
          } else if (isDNSError(e)) {
            throw new networkErrors.ErrorDNSResolver(undefined, { cause: e });
          } else {
            ipv6Hosts = [];
          }
        }
        hosts.push(...ipv4Hosts, ...ipv6Hosts);
      }
    }
    return hosts;
  };
  return timedCancellable(f, true)(ctx);
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
): Promise<
  | {
      result: 'success';
      nodeId: NodeId;
    }
  | {
      result: 'fail';
      value: CryptoError;
    }
> {
  const certPEMChain = certs.map((v) => quicUtils.derToPEM(v));
  if (certPEMChain.length === 0) {
    return {
      result: 'fail',
      value: CryptoError.CertificateRequired,
    };
  }
  if (nodeIds.length === 0) {
    throw new networkErrors.ErrorConnectionNodesEmpty();
  }
  const certChain: Array<Readonly<X509Certificate>> = [];
  for (const certPEM of certPEMChain) {
    const cert = keysUtils.certFromPEM(certPEM as CertificatePEM);
    if (cert == null) {
      return {
        result: 'fail',
        value: CryptoError.BadCertificate,
      };
    }
    certChain.push(cert);
  }
  const now = new Date();
  let certClaim: Certificate | null = null;
  let certClaimIndex: number | null = null;
  let verifiedNodeId: NodeId | null = null;
  for (let certIndex = 0; certIndex < certChain.length; certIndex++) {
    const cert = certChain[certIndex];
    if (now < cert.notBefore || now > cert.notAfter) {
      return {
        result: 'fail',
        value: CryptoError.CertificateExpired,
      };
    }
    const certNodeId = keysUtils.certNodeId(cert);
    if (certNodeId == null) {
      return {
        result: 'fail',
        value: CryptoError.BadCertificate,
      };
    }
    const certPublicKey = keysUtils.certPublicKey(cert);
    if (certPublicKey == null) {
      return {
        result: 'fail',
        value: CryptoError.BadCertificate,
      };
    }
    if (!(await keysUtils.certNodeSigned(cert))) {
      return {
        result: 'fail',
        value: CryptoError.BadCertificate,
      };
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
    return {
      result: 'fail',
      value: CryptoError.BadCertificate,
    };
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
        return {
          result: 'fail',
          value: CryptoError.BadCertificate,
        };
      }
    }
  }
  return {
    result: 'success',
    nodeId: verifiedNodeId,
  };
}

/**
 * Verify the client certificate chain when it connects to the server.
 * The server does have a target NodeId. This means we verify the entire chain.
 */
async function verifyClientCertificateChain(
  certs: Array<Uint8Array>,
): Promise<CryptoError | undefined> {
  const certPEMChain = certs.map((v) => quicUtils.derToPEM(v));
  if (certPEMChain.length === 0) {
    return CryptoError.CertificateRequired;
  }
  const certChain: Array<Readonly<X509Certificate>> = [];
  for (const certPEM of certPEMChain) {
    const cert = keysUtils.certFromPEM(certPEM as CertificatePEM);
    if (cert == null) return CryptoError.BadCertificate;
    certChain.push(cert);
  }
  const now = new Date();
  for (let certIndex = 0; certIndex < certChain.length; certIndex++) {
    const cert = certChain[certIndex];
    const certNext = certChain[certIndex + 1];
    if (now < cert.notBefore || now > cert.notAfter) {
      return CryptoError.CertificateExpired;
    }
    const certNodeId = keysUtils.certNodeId(cert);
    if (certNodeId == null) {
      return CryptoError.BadCertificate;
    }
    const certPublicKey = keysUtils.certPublicKey(cert);
    if (certPublicKey == null) {
      return CryptoError.BadCertificate;
    }
    if (!(await keysUtils.certNodeSigned(cert))) {
      return CryptoError.BadCertificate;
    }
    if (certNext != null) {
      if (
        !keysUtils.certIssuedBy(certNext, cert) ||
        !(await keysUtils.certSignedBy(
          certNext,
          keysUtils.certPublicKey(cert)!,
        ))
      ) {
        return CryptoError.BadCertificate;
      }
    }
  }
  // Undefined means success
  return undefined;
}

/**
 * Takes an array of host or hostnames and resolves them to the host addresses.
 * It will also filter out any duplicates or IPV6 addresses.
 * @param addresses
 * @param existingAddresses
 */
async function resolveHostnames(
  addresses: Array<NodeAddress>,
  existingAddresses: Set<string> = new Set(),
): Promise<Array<{ host: Host; port: Port }>> {
  const final: Array<{ host: Host; port: Port }> = [];
  for (const address of addresses) {
    if (isHost(address.host)) {
      if (existingAddresses.has(`${address.host}|${address.port}`)) continue;
      final.push({ host: address.host, port: address.port });
      existingAddresses.add(`${address.host}|${address.port}`);
      continue;
    }
    const resolvedAddresses = await resolveHostname(address.host);
    for (const resolvedHost of resolvedAddresses) {
      const newAddress = { host: resolvedHost, port: address.port };
      if (!Validator.isValidIPv4String(resolvedHost)[0]) continue;
      if (existingAddresses.has(`${resolvedHost}|${address.port}`)) continue;
      final.push(newAddress);
      existingAddresses.add(`${resolvedHost}|${address.port}`);
    }
  }
  return final;
}

// TODO: review and fix the `toError` and `fromError` code here.
//  Right now it's very basic and need fleshing out.

function fromError(error: any) {
  switch (typeof error) {
    case 'symbol':
    case 'bigint':
    case 'function':
      throw TypeError(`${error} cannot be serialized`);
  }

  if (error instanceof Error) {
    const cause = fromError(error.cause);
    const timestamp: string = ((error as any).timestamp ?? new Date()).toJSON();
    if (error instanceof AbstractError) {
      return error.toJSON();
    } else if (error instanceof AggregateError) {
      // AggregateError has an `errors` property
      return {
        type: error.constructor.name,
        message: error.message,
        data: {
          errors: error.errors.map(fromError),
          stack: error.stack,
          timestamp,
          cause,
        },
      };
    }

    // If it's some other type of error then only serialise the message and
    // stack (and the type of the error)
    return {
      type: error.name,
      message: error.message,
      data: {
        stack: error.stack,
        timestamp,
        cause,
      },
    };
  }
}

function toError(errorData: JSONValue): Error {
  if (
    errorData != null &&
    typeof errorData === 'object' &&
    'type' in errorData &&
    typeof errorData.type === 'string' &&
    'data' in errorData &&
    typeof errorData.data === 'object'
  ) {
    const eClass = errors[errorData.type];
    const err = eClass.fromJSON(errorData);
    if (eClass != null) return err;
  }
  return Error('TMP Some error, this needs to be fleshed out');
}

export {
  isHost,
  isHostWildcard,
  isHostname,
  isPort,
  buildAddress,
  parseAddress,
  isDNSError,
  resolveHostname,
  resolvesZeroIP,
  verifyServerCertificateChain,
  verifyClientCertificateChain,
  resolveHostnames,
  fromError,
  toError,
};
