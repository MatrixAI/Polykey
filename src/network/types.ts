import type { NodeId } from '../ids/types';
import type {
  CertificatePEMChain,
  PrivateKeyPEM,
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
  keyPrivatePem: PrivateKeyPEM;
  certChainPem: CertificatePEMChain;
};

type ProxyConfig = {
  host: Host;
  port: Port;
  authToken: string;
};

/**
 * Proxy connection information
 * @property remoteNodeId - NodeId of the remote connecting node
 * @property remoteCertificates - Certificate chain of the remote connecting node
 * @property localHost - Proxy host of the local connecting node
 * @property localPort - Proxy port of the local connecting node
 * @property remoteHost - Proxy host of the remote connecting node
 * @property remotePort - Proxy port of the remote connecting node
 */
type ConnectionInfo = {
  remoteNodeId: NodeId;
  remoteCertificates: Array<Certificate>;
  localHost: Host;
  localPort: Port;
  remoteHost: Host;
  remotePort: Port;
};

type ConnectionData = {
  remoteNodeId: NodeId;
  remoteHost: Host;
  remotePort: Port;
  type: 'forward' | 'reverse';
};

type ConnectionEstablishedCallback = (data: ConnectionData) => any;

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
  ConnectionData,
  ConnectionEstablishedCallback,
  PingMessage,
  PongMessage,
  NetworkMessage,
};
