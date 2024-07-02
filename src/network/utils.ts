import type { PromiseCancellable } from '@matrixai/async-cancellable';
import type { ContextTimed, ContextTimedInput } from '@matrixai/contexts';
import type { Address, Host, Hostname, Port } from './types';
import type { NodeAddress } from '../nodes/types';
import type { JSONValue } from '../types';
import dns from 'dns';
import { IPv4, IPv6, Validator } from 'ip-num';
import { timedCancellable } from '@matrixai/contexts/dist/functions';
import { AbstractError } from '@matrixai/errors';
import * as networkErrors from './errors';
import * as validationUtils from '../validation/utils';
import * as validationErrors from '../validation/errors';
import * as errors from '../errors';
import ErrorPolykey from '../ErrorPolykey';

/**
 * Is it an IPv4 address?
 */
function isIPv4(host: any): host is Host {
  if (typeof host !== 'string') return false;
  const [isIPv4] = Validator.isValidIPv4String(host);
  return isIPv4;
}

/**
 * Is it an IPv6 address?
 * This considers IPv4 mapped IPv6 addresses to also be IPv6 addresses.
 */
function isIPv6(host: any): host is Host {
  if (typeof host !== 'string') return false;
  const [isIPv6] = Validator.isValidIPv6String(host.replace(/%.+$/, ''));
  if (isIPv6) return true;
  // Test if the host is an IPv4 mapped IPv6 address.
  // In the future, `isValidIPv6String` should be able to handle this
  // and this code can be removed.
  return isIPv4MappedIPv6(host);
}

/**
 * There are 2 kinds of IPv4 mapped IPv6 addresses.
 * 1. ::ffff:127.0.0.1 - dotted decimal version
 * 2. ::ffff:7f00:1 - hex version
 * Both are accepted by Node's dgram module.
 */
function isIPv4MappedIPv6(host: any): host is Host {
  if (typeof host !== 'string') return false;
  if (host.startsWith('::ffff:')) {
    try {
      // The `ip-num` package understands `::ffff:7f00:1`
      IPv6.fromString(host);
      return true;
    } catch {
      // But it does not understand `::ffff:127.0.0.1`
      const ipv4 = host.slice('::ffff:'.length);
      if (isIPv4(ipv4)) {
        return true;
      }
    }
  }
  return false;
}

function isIPv4MappedIPv6Hex(host: any): host is Host {
  if (typeof host !== 'string') return false;
  if (host.startsWith('::ffff:')) {
    try {
      // The `ip-num` package understands `::ffff:7f00:1`
      IPv6.fromString(host);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

function isIPv4MappedIPv6Dec(host: any): host is Host {
  if (typeof host !== 'string') return false;
  if (host.startsWith('::ffff:')) {
    // But it does not understand `::ffff:127.0.0.1`
    const ipv4 = host.slice('::ffff:'.length);
    if (isIPv4(ipv4)) {
      return true;
    }
  }
  return false;
}

/**
 * Extracts the IPv4 portion out of the IPv4 mapped IPv6 address.
 * Can handle both the dotted decimal and hex variants.
 * 1. ::ffff:7f00:1
 * 2. ::ffff:127.0.0.1
 * Always returns the dotted decimal variant.
 */
function fromIPv4MappedIPv6(host: unknown): Host {
  if (typeof host !== 'string') {
    throw new TypeError('Invalid IPv4 mapped IPv6 address');
  }
  const ipv4 = host.slice('::ffff:'.length);
  if (isIPv4(ipv4)) {
    return ipv4 as Host;
  }
  const matches = ipv4.match(/^([0-9a-fA-F]{1,4}):([0-9a-fA-F]{1,4})$/);
  if (matches == null) {
    throw new TypeError('Invalid IPv4 mapped IPv6 address');
  }
  const ipv4Hex = matches[1].padStart(4, '0') + matches[2].padStart(4, '0');
  const ipv4Hexes = ipv4Hex.match(/.{1,2}/g)!;
  const ipv4Decs = ipv4Hexes.map((h) => parseInt(h, 16));
  return ipv4Decs.join('.') as Host;
}

/**
 * Validates that a provided host address is a valid IPv4 or IPv6 address.
 */
function isHost(host: any): host is Host {
  if (typeof host !== 'string') return false;
  return isIPv4(host) || isIPv6(host);
}

function isHostWildcard(host: any): boolean {
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

function parseHost(data: any): Host {
  if (!isHost(data)) {
    throw new validationErrors.ErrorParse(
      'Host must be an IPv4 or IPv6 address',
    );
  }
  return data;
}

function parseHostname(data: any): Hostname {
  if (!isHostname(data)) {
    throw new validationErrors.ErrorParse(
      'Hostname must follow RFC 1123 standard',
    );
  }
  return data;
}

function parseHostOrHostname(data: any): Host | Hostname {
  if (!isHost(data) && !isHostname(data)) {
    throw new validationErrors.ErrorParse(
      'Host must be IPv4 or IPv6 address or hostname',
    );
  }
  return data;
}

/**
 * Parses number into a Port
 * Data can be a string-number
 */
function parsePort(data: any, connect: boolean = false): Port {
  if (typeof data === 'string') {
    try {
      data = validationUtils.parseInteger(data);
    } catch (e) {
      if (e instanceof validationErrors.ErrorParse) {
        e.message = 'Port must be a number';
      }
      throw e;
    }
  }
  if (!isPort(data, connect)) {
    if (!connect) {
      throw new validationErrors.ErrorParse(
        'Port must be a number between 0 and 65535 inclusive',
      );
    } else {
      throw new validationErrors.ErrorParse(
        'Port must be a number between 1 and 65535 inclusive',
      );
    }
  }
  return data;
}

/**
 * Canonicalizes an IP address into a consistent format.
 * This will:
 * - Remove leading 0s from IPv4 addresses and IPv6 addresses
 * - Expand :: into 0s for IPv6 addresses
 * - Extract IPv4 decimal notation from IPv4 mapped IPv6 addresses
 * - Lowercase all hex characters in IPv6 addresses
 */
function toCanonicalHost(host: string): Host {
  let host_: string = host.trim();
  const scope = host_.match(/%.+$/);
  if (scope != null) {
    host_ = host_.replace(/%.+/, '');
  }
  if (isIPv4MappedIPv6(host_)) {
    host_ = fromIPv4MappedIPv6(host_);
  } else if (isIPv4(host_)) {
    host_ = IPv4.fromString(host_).toString();
    // Host_ = (new IPv4(host)).toString();
  } else if (isIPv6(host_)) {
    host_ = IPv6.fromString(host_).toString();
    // Host_ = (new IPv6(host)).toString();
  } else {
    throw new TypeError('Invalid IP address');
  }
  return (host_ + (scope != null ? scope[0] : '')) as Host;
}

function toCanonicalHostname(hostname: string): Hostname {
  let hostname_ = hostname.trim();
  hostname_ = hostname_.toLowerCase();
  if (hostname_.endsWith('.')) {
    hostname_ = hostname_.substring(0, hostname_.length - 1);
  }
  return hostname_ as Hostname;
}

/**
 * Given host and port, create an address string.
 */
function buildAddress(host: Host, port: Port = 0 as Port): Address {
  let address: string;
  const [isIPv4] = Validator.isValidIPv4String(host);
  const [isIPv6] = Validator.isValidIPv6String(host.replace(/%.*/, ''));
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
  ctx?: Partial<ContextTimedInput>,
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
 * Takes an array of host or hostnames and resolves them to the host addresses.
 * It will also filter out any duplicates.
 * @param addresses
 * @param existingAddresses
 * @param servers
 * @param ctx
 */
async function resolveHostnames(
  addresses: Array<NodeAddress>,
  existingAddresses: Set<string> = new Set(),
  servers?: Array<string>,
  ctx?: Partial<ContextTimedInput>,
): Promise<Array<[Host, Port]>> {
  const final: Array<[Host, Port]> = [];
  for (const [host, port] of addresses) {
    if (isHost(host)) {
      if (existingAddresses.has(`${host}|${port}`)) continue;
      final.push([host, port]);
      existingAddresses.add(`${host}|${port}`);
      continue;
    }
    const resolvedAddresses = await resolveHostname(host, servers, ctx);
    for (const resolvedHost of resolvedAddresses) {
      const newAddress: [Host, Port] = [resolvedHost, port];
      if (
        !Validator.isValidIPv4String(resolvedHost)[0] &&
        !Validator.isValidIPv6String(resolvedHost)[0]
      ) {
        continue;
      }
      if (existingAddresses.has(`${resolvedHost}|${port}`)) continue;
      final.push(newAddress);
      existingAddresses.add(`${resolvedHost}|${port}`);
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

const standardErrors: {
  [key: string]: typeof Error | typeof AggregateError | typeof AbstractError;
} = {
  Error,
  TypeError,
  SyntaxError,
  ReferenceError,
  EvalError,
  RangeError,
  URIError,
  AggregateError,
  AbstractError,
};

function toError(
  errorData: JSONValue,
  clientMetadata: Record<string, JSONValue>,
  top: boolean = true,
): any {
  if (
    errorData != null &&
    typeof errorData === 'object' &&
    'type' in errorData &&
    typeof errorData.type === 'string' &&
    'data' in errorData &&
    typeof errorData.data === 'object'
  ) {
    const eClassStandard = standardErrors[errorData.type];
    if (eClassStandard != null) {
      let e: Error;
      switch (eClassStandard) {
        case AbstractError:
          e = eClassStandard.fromJSON(errorData);
          break;
        case AggregateError:
          if (
            errorData.data == null ||
            !('errors' in errorData.data) ||
            !Array.isArray(errorData.data.errors) ||
            typeof errorData.message !== 'string' ||
            !('stack' in errorData.data) ||
            typeof errorData.data.stack !== 'string'
          ) {
            throw new TypeError(`cannot decode JSON to ${errorData.type}`);
          }
          e = new eClassStandard(
            errorData.data.errors.map((data) =>
              toError(data, clientMetadata, false),
            ),
            errorData.message,
          );
          e.stack = errorData.data.stack;
          break;
        default:
          if (
            errorData.data == null ||
            typeof errorData.message !== 'string' ||
            !('stack' in errorData.data) ||
            typeof errorData.data.stack !== 'string'
          ) {
            throw new TypeError(`Cannot decode JSON to ${errorData.type}`);
          }
          e = new (eClassStandard as typeof Error)(errorData.message);
          e.stack = errorData.data.stack;
          break;
      }
      if (errorData.data != null && 'cause' in errorData.data) {
        e.cause = toError(errorData.data.cause, clientMetadata, false);
      }
      if (top) {
        const remoteError = new networkErrors.ErrorPolykeyRemote(
          {
            localHost: clientMetadata.localHost,
            localPort: clientMetadata.localPort,
            remoteHost: clientMetadata.remoteHost,
            remotePort: clientMetadata.remotePort,
            command: clientMetadata.command,
          },
          undefined,
          {
            cause: e,
          },
        );
        if (remoteError.cause instanceof ErrorPolykey) {
          remoteError.exitCode = remoteError.cause.exitCode;
        }
        return remoteError;
      } else {
        return e;
      }
    }
    const eClass = errors[errorData.type];
    if (eClass != null) {
      const e = eClass.fromJSON(errorData);
      if (errorData.data != null && 'cause' in errorData.data) {
        e.cause = toError(errorData.data.cause, clientMetadata, false);
      }
      if (top) {
        const remoteError = new networkErrors.ErrorPolykeyRemote(
          {
            localHost: clientMetadata.localHost,
            localPort: clientMetadata.localPort,
            remoteHost: clientMetadata.remoteHost,
            remotePort: clientMetadata.remotePort,
            command: clientMetadata.command,
          },
          undefined,
          {
            cause: e,
          },
        );
        if (remoteError.cause instanceof ErrorPolykey) {
          remoteError.exitCode = remoteError.cause.exitCode;
        }
        return remoteError;
      } else {
        return e;
      }
    }
  }
  // Other values are returned as-is
  return errorData;
}

export {
  isIPv4,
  isIPv6,
  isIPv4MappedIPv6,
  isIPv4MappedIPv6Hex,
  isIPv4MappedIPv6Dec,
  fromIPv4MappedIPv6,
  isHost,
  isHostWildcard,
  isHostname,
  isPort,
  parseHost,
  parseHostname,
  parseHostOrHostname,
  parsePort,
  toCanonicalHost,
  toCanonicalHostname,
  buildAddress,
  parseAddress,
  isDNSError,
  resolveHostname,
  resolvesZeroIP,
  resolveHostnames,
  fromError,
  toError,
};
