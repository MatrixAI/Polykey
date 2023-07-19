import type { NodeId } from '../ids/types';
import type { CertificatePEMChain, PrivateKeyPEM } from '../keys/types';
import type { Opaque } from '../types';

/**
 * Host is always an IP address
 */
type Host = Opaque<'Host', string>;

/**
 * Hostnames are resolved to IP addresses
 */
type Hostname = Opaque<'Hostname', string>;

/**
 * Ports are numbers from 0 to 65535
 */
type Port = Opaque<'Port', number>;

/**
 * Combination of `<HOST>:<PORT>`
 */
type Address = Opaque<'Address', string>;

type TLSConfig = {
  keyPrivatePem: PrivateKeyPEM;
  certChainPem: CertificatePEMChain;
};

/**
 * Used for the connection event when receiving a reverse connection.
 */
type ConnectionData = {
  remoteNodeId: NodeId;
  remoteHost: Host;
  remotePort: Port;
};

export type { Host, Hostname, Port, Address, TLSConfig, ConnectionData };
