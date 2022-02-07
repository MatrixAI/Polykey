import type { NodeId } from '../nodes/types';
import type {
  CertificatePemChain,
  PrivateKeyPem,
  Certificate,
} from '../keys/types';
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
  keyPrivatePem: PrivateKeyPem;
  certChainPem: CertificatePemChain;
};

type ProxyConfig = {
  host: Host;
  port: Port;
  authToken: string;
};

type ConnectionInfo = {
  nodeId: NodeId;
  certificates: Array<Certificate>;
  egressHost: Host;
  egressPort: Port;
  ingressHost: Host;
  ingressPort: Port;
};

type PingMessage = {
  type: 'ping';
};

type PongMessage = {
  type: 'pong';
};

type NetworkMessage = PingMessage | PongMessage;

export type {
  Host,
  Hostname,
  Port,
  Address,
  TLSConfig,
  ProxyConfig,
  ConnectionInfo,
  PingMessage,
  PongMessage,
  NetworkMessage,
};
