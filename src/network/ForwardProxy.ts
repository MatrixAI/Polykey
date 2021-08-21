import type { AddressInfo, Socket } from 'net';
import type { Host, Port, Address, ConnectionInfo, TLSConfig } from './types';
import type { ConnectionsForward } from './ConnectionForward';
import type { NodeId } from '../nodes/types';
import type { Timer } from '../types';

import http from 'http';
import UTP from 'utp-native';
import { Mutex } from 'async-mutex';
import Logger from '@matrixai/logger';
import ConnectionForward from './ConnectionForward';
import * as networkUtils from './utils';
import * as networkErrors from './errors';
import { promisify, sleep, timerStart, timerStop } from '../utils';

class ForwardProxy {
  public readonly authToken: string;
  public readonly connConnectTime: number;
  public readonly connTimeoutTime: number;
  public readonly connPingIntervalTime: number;

  protected logger: Logger;
  protected proxyHost: Host;
  protected proxyPort: Port;
  protected egressHost: Host;
  protected egressPort: Port;
  protected server: http.Server;
  protected utpSocket: UTP;
  protected tlsConfig: TLSConfig;
  protected connectionLocks: Map<Address, Mutex> = new Map();
  protected connections: ConnectionsForward = {
    ingress: new Map(),
    client: new Map(),
  };
  protected _started: boolean = false;

  constructor({
    authToken,
    connConnectTime = 20000,
    connTimeoutTime = 20000,
    connPingIntervalTime = 1000,
    logger,
  }: {
    authToken: string;
    connConnectTime?: number;
    connTimeoutTime?: number;
    connPingIntervalTime?: number;
    logger?: Logger;
  }) {
    this.logger = logger ?? new Logger('ForwardProxy');
    this.authToken = authToken;
    this.connConnectTime = connConnectTime;
    this.connTimeoutTime = connTimeoutTime;
    this.connPingIntervalTime = connPingIntervalTime;
    this.server = http.createServer();
    this.server.on('request', this.handleRequest);
    this.server.on('connect', this.handleConnect);
  }

  get started(): boolean {
    return this._started;
  }

  /**
   * UTP only supports IPv4
   */
  public async start({
    proxyHost = '::' as Host,
    proxyPort = 0 as Port,
    egressHost = '0.0.0.0' as Host,
    egressPort = 0 as Port,
    tlsConfig,
  }: {
    proxyHost?: Host;
    proxyPort?: Port;
    egressHost?: Host;
    egressPort?: Port;
    tlsConfig: TLSConfig;
  }): Promise<void> {
    if (this._started) {
      return;
    }
    let proxyAddress = networkUtils.buildAddress(proxyHost, proxyPort);
    let egressAddress = networkUtils.buildAddress(egressHost, egressPort);
    this.logger.info(
      `Starting Forward Proxy from ${proxyAddress} to ${egressAddress}`,
    );
    const utpSocket = UTP({ allowHalfOpen: false });
    const utpSocketBind = promisify(utpSocket.bind).bind(utpSocket);
    await utpSocketBind(egressPort, egressHost);
    egressPort = utpSocket.address().port;
    const serverListen = promisify(this.server.listen).bind(this.server);
    await serverListen(proxyPort, proxyHost);
    proxyPort = (this.server.address() as AddressInfo).port as Port;
    proxyAddress = networkUtils.buildAddress(proxyHost, proxyPort);
    egressAddress = networkUtils.buildAddress(egressHost, egressPort);
    this.proxyHost = proxyHost;
    this.proxyPort = proxyPort;
    this.egressHost = egressHost;
    this.egressPort = egressPort;
    this.utpSocket = utpSocket;
    this.tlsConfig = tlsConfig;
    this._started = true;
    this.logger.info(
      `Started Forward Proxy from ${proxyAddress} to ${egressAddress}`,
    );
  }

  public async stop(): Promise<void> {
    if (!this._started) {
      return;
    }
    this.logger.info('Stopping Forward Proxy Server');
    this._started = false;
    const serverClose = promisify(this.server.close).bind(this.server);
    await serverClose();
    // ensure no new connections are created while this is iterating
    await Promise.all(
      Array.from(this.connections.ingress, ([, conn]) => conn.stop()),
    );
    // delay socket close by about 1 second
    // this gives some time for the end/FIN packets to be sent
    await sleep(1000);
    // even when all connections are destroyed
    // the utp socket sometimes hangs in closing
    // here we asynchronously close and unreference it
    // in order to speed up the closing
    this.utpSocket.close();
    this.utpSocket.unref();
    this.logger.info('Stopped Forward Proxy Server');
  }

  public getProxyHost(): Host {
    if (!this._started) {
      throw new networkErrors.ErrorForwardProxyNotStarted();
    }
    return this.proxyHost;
  }

  public getProxyPort(): Port {
    if (!this._started) {
      throw new networkErrors.ErrorForwardProxyNotStarted();
    }
    return this.proxyPort;
  }

  public getEgressHost(): Host {
    if (!this._started) {
      throw new networkErrors.ErrorForwardProxyNotStarted();
    }
    return this.egressHost;
  }

  public getEgressPort(): Port {
    if (!this._started) {
      throw new networkErrors.ErrorForwardProxyNotStarted();
    }
    return this.egressPort;
  }

  public setTLSConfig(tlsConfig: TLSConfig): void {
    this.tlsConfig = tlsConfig;
  }

  public getConnectionInfoByClient(
    clientHost: Host,
    clientPort: Port,
  ): ConnectionInfo | undefined {
    const clientAddress = networkUtils.buildAddress(clientHost, clientPort);
    const conn = this.connections.client.get(clientAddress);
    if (conn == null) {
      return;
    }
    const serverCertificates = conn.getServerCertificates();
    const serverNodeIds = conn.getServerNodeIds();
    return {
      nodeId: serverNodeIds[0],
      certificates: serverCertificates,
      egressHost: this.egressHost,
      egressPort: this.egressPort,
      ingressHost: conn.host,
      ingressPort: conn.port,
    };
  }

  public getConnectionInfoByIngress(
    ingressHost: Host,
    ingressPort: Port,
  ): ConnectionInfo | undefined {
    const ingressAddress = networkUtils.buildAddress(ingressHost, ingressPort);
    const conn = this.connections.ingress.get(ingressAddress);
    if (conn == null) {
      return;
    }
    const serverCertificates = conn.getServerCertificates();
    const serverNodeIds = conn.getServerNodeIds();
    return {
      nodeId: serverNodeIds[0],
      certificates: serverCertificates,
      egressHost: this.egressHost,
      egressPort: this.egressPort,
      ingressHost: conn.host,
      ingressPort: conn.port,
    };
  }

  public getConnectionCount(): number {
    return this.connections.ingress.size;
  }

  public async openConnection(
    nodeId: NodeId,
    ingressHost: Host,
    ingressPort: Port,
    timer?: Timer,
  ): Promise<void> {
    if (!this._started) {
      throw new networkErrors.ErrorForwardProxyNotStarted();
    }
    const ingressAddress = networkUtils.buildAddress(ingressHost, ingressPort);
    let lock = this.connectionLocks.get(ingressAddress);
    if (lock == null) {
      lock = new Mutex();
      this.connectionLocks.set(ingressAddress, lock);
    }
    const release = await lock.acquire();
    try {
      await this.establishConnection(nodeId, ingressHost, ingressPort, timer);
    } finally {
      release();
      this.connectionLocks.delete(ingressAddress);
    }
  }

  public async closeConnection(
    ingressHost: Host,
    ingressPort: Port,
  ): Promise<void> {
    if (!this._started) {
      throw new networkErrors.ErrorForwardProxyNotStarted();
    }
    const ingressAddress = networkUtils.buildAddress(ingressHost, ingressPort);
    let lock = this.connectionLocks.get(ingressAddress);
    if (lock == null) {
      lock = new Mutex();
      this.connectionLocks.set(ingressAddress, lock);
    }
    const release = await lock.acquire();
    try {
      const conn = this.connections.ingress.get(ingressAddress);
      if (conn == null) {
        return;
      }
      await conn.stop();
    } finally {
      release();
      this.connectionLocks.delete(ingressAddress);
    }
  }

  /**
   * HTTP Connect Proxy will proxy TCP to TLS + uTP
   */
  protected handleConnect = async (
    request: http.IncomingMessage,
    clientSocket: Socket,
  ): Promise<void> => {
    const clientSocketEnd = promisify(clientSocket.end).bind(clientSocket);
    const clientSocketWrite = promisify(clientSocket.write).bind(clientSocket);
    let ingressAddress: string | null = null;
    const handleConnectError = (e) => {
      if (ingressAddress != null) {
        this.logger.error(
          `Failed CONNECT to ${ingressAddress} - ${e.toString()}`,
        );
      } else {
        this.logger.error(`Failed CONNECT - ${e.toString()}`);
      }
      clientSocket.destroy();
    };
    clientSocket.on('error', handleConnectError);
    if (request.url === undefined) {
      await clientSocketEnd('HTTP/1.1 400 Bad Request\r\n' + '\r\n');
      clientSocket.destroy(new networkErrors.ErrorForwardProxyInvalidUrl());
      return;
    }
    const url = new URL(`pk://${request.url}`);
    const nodeId = url.searchParams.get('nodeId') as NodeId | null;
    if (nodeId == null) {
      await clientSocketEnd('HTTP/1.1 400 Bad Request\r\n' + '\r\n');
      clientSocket.destroy(new networkErrors.ErrorForwardProxyMissingNodeId());
      return;
    }
    const hostMatch = url.hostname.match(/\[(.+)\]|(.+)/)!;
    if (hostMatch == null) {
      await clientSocketEnd('HTTP/1.1 400 Bad Request\r\n' + '\r\n');
      clientSocket.destroy(new networkErrors.ErrorForwardProxyInvalidUrl());
      return;
    }
    const ingressHost = (hostMatch[1] ?? hostMatch[2]) as Host;
    const ingressPort = (url.port === '' ? 80 : parseInt(url.port)) as Port;
    ingressAddress = url.host;
    this.logger.info(`Handling CONNECT to ${ingressAddress}`);
    // must be authenticated
    if (!this.authenticated(request)) {
      await clientSocketEnd(
        'HTTP/1.1 407 Proxy Authentication Required\r\n' +
          'Proxy-Authenticate: Basic\r\n' +
          '\r\n',
      );
      clientSocket.destroy(new networkErrors.ErrorForwardProxyAuth());
      return;
    }
    let lock = this.connectionLocks.get(ingressAddress as Address);
    if (lock == null) {
      lock = new Mutex();
      this.connectionLocks.set(ingressAddress as Address, lock);
    }
    const release = await lock.acquire();
    try {
      const timer = timerStart(this.connConnectTime);
      try {
        await this.connect(
          nodeId,
          ingressHost,
          ingressPort,
          clientSocket,
          timer,
        );
      } catch (e) {
        if (e instanceof networkErrors.ErrorConnection) {
          if (!clientSocket.destroyed) {
            await clientSocketEnd('HTTP/1.1 400 Bad Request\r\n' + '\r\n');
            clientSocket.destroy(e);
          }
          return;
        }
        if (!clientSocket.destroyed) {
          await clientSocketEnd(
            'HTTP/1.1 500 Internal Server Error\r\n' + '\r\n',
          );
          clientSocket.destroy(e);
        }
        return;
      } finally {
        timerStop(timer);
      }
      // after composing, switch off this error handler
      clientSocket.off('error', handleConnectError);
      await clientSocketWrite(
        'HTTP/1.1 200 Connection Established\r\n' + '\r\n',
      );
      this.logger.info(`Handled CONNECT to ${ingressAddress}`);
    } finally {
      release();
      this.connectionLocks.delete(ingressAddress as Address);
    }
  };

  protected async connect(
    nodeId: NodeId,
    ingressHost: Host,
    ingressPort: Port,
    clientSocket: Socket,
    timer?: Timer,
  ): Promise<void> {
    const conn = await this.establishConnection(
      nodeId,
      ingressHost,
      ingressPort,
      timer,
    );
    conn.compose(clientSocket);
  }

  protected async establishConnection(
    nodeId: NodeId,
    ingressHost: Host,
    ingressPort: Port,
    timer?: Timer,
  ): Promise<ConnectionForward> {
    const ingressAddress = networkUtils.buildAddress(ingressHost, ingressPort);
    let conn: ConnectionForward | undefined;
    conn = this.connections.ingress.get(ingressAddress);
    // no more than one connection to an ingress address.
    if (conn != null) {
      return conn;
    }
    conn = new ConnectionForward({
      nodeId,
      connections: this.connections,
      pingIntervalTime: this.connPingIntervalTime,
      utpSocket: this.utpSocket,
      host: ingressHost,
      port: ingressPort,
      tlsConfig: this.tlsConfig,
      timeoutTime: this.connTimeoutTime,
      logger: this.logger.getChild(`Connection ${ingressAddress}`),
    });
    await conn.start({ timer });
    return conn;
  }

  /**
   * Given a request, authenticate its proxy-authorization token.
   */
  protected authenticated(request: http.IncomingMessage): boolean {
    const bearerAuthToken = networkUtils.toAuthToken(this.authToken);
    return (
      request.headers['proxy-authorization'] !== undefined &&
      request.headers['proxy-authorization'] === bearerAuthToken
    );
  }

  /**
   * Regular HTTP requests are not allowed
   */
  protected handleRequest = (
    request: http.IncomingMessage,
    response: http.ServerResponse,
  ): void => {
    response.writeHead(405);
    response.end();
  };
}

export default ForwardProxy;
