import type { NodeId } from '../nodes/types';
import type {
  CertificatePemChain,
  PrivateKeyPem,
  Certificate,
} from '../keys/types';
import type { Opaque } from '../types';

type Host = Opaque<'Host', string>;
type Port = Opaque<'Port', number>;
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
  Port,
  Address,
  TLSConfig,
  ProxyConfig,
  ConnectionInfo,
  PingMessage,
  PongMessage,
  NetworkMessage,
};
