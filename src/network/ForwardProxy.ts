import type { AddressInfo, Socket } from 'net';
import type { Host, Port, Address, ConnectionInfo, TLSConfig } from './types';
import type { ConnectionsForward } from './ConnectionForward';
import type { NodeId } from '../nodes/types';
import type { Timer } from '../types';

import http from 'http';
import UTP from 'utp-native';
import { Mutex } from 'async-mutex';
import Logger from '@matrixai/logger';
import { StartStop, ready } from '@matrixai/async-init/dist/StartStop';
import ConnectionForward from './ConnectionForward';
import * as networkUtils from './utils';
import * as networkErrors from './errors';
import { promisify, timerStart, timerStop } from '../utils';

interface ForwardProxy extends StartStop {}
@StartStop()
class ForwardProxy {
  public readonly authToken: string;
  public readonly connConnectTime: number;
  public readonly connKeepAliveTimeoutTime: number;
  public readonly connEndTime: number;
  public readonly connPunchIntervalTime: number;
  public readonly connKeepAliveIntervalTime: number;

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

  constructor({
    authToken,
    connConnectTime = 20000,
    connKeepAliveTimeoutTime = 20000,
    connEndTime = 1000,
    connPunchIntervalTime = 1000,
    connKeepAliveIntervalTime = 1000,
    logger,
  }: {
    authToken: string;
    connConnectTime?: number;
    connKeepAliveTimeoutTime?: number;
    connEndTime?: number;
    connPunchIntervalTime?: number;
    connKeepAliveIntervalTime?: number;
    logger?: Logger;
  }) {
    this.logger = logger ?? new Logger(ForwardProxy.name);
    this.logger.info('Creating Forward Proxy');
    this.authToken = authToken;
    this.connConnectTime = connConnectTime;
    this.connKeepAliveTimeoutTime = connKeepAliveTimeoutTime;
    this.connEndTime = connEndTime;
    this.connPunchIntervalTime = connPunchIntervalTime;
    this.connKeepAliveIntervalTime = connKeepAliveIntervalTime;
    this.server = http.createServer();
    this.server.on('request', this.handleRequest);
    this.server.on('connect', this.handleConnect);
    this.logger.info('Created Forward Proxy');
  }

  /**
   * UTP only supports IPv4
   */
  public async start({
    proxyHost = '127.0.0.1' as Host,
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
    let proxyAddress = networkUtils.buildAddress(proxyHost, proxyPort);
    let egressAddress = networkUtils.buildAddress(egressHost, egressPort);
    this.logger.info(
      `Starting Forward Proxy from ${proxyAddress} to ${egressAddress}`,
    );
    // Normal sockets defaults to `allowHalfOpen: false`
    // But UTP defaults to `allowHalfOpen: true`
    // Setting `allowHalfOpen: false` on UTP is buggy and cannot be used
    const utpSocket = UTP({ allowHalfOpen: true });
    const utpSocketBind = promisify(utpSocket.bind).bind(utpSocket);
    await utpSocketBind(egressPort, egressHost);
    egressPort = utpSocket.address().port;
    const serverListen = promisify(this.server.listen).bind(this.server);
    await serverListen(proxyPort, proxyHost);
    proxyPort = (this.server.address() as AddressInfo).port as Port;
    this.proxyHost = proxyHost;
    this.proxyPort = proxyPort;
    this.egressHost = egressHost;
    this.egressPort = egressPort;
    this.utpSocket = utpSocket;
    this.tlsConfig = tlsConfig;
    proxyAddress = networkUtils.buildAddress(proxyHost, proxyPort);
    egressAddress = networkUtils.buildAddress(egressHost, egressPort);
    this.logger.info(
      `Started Forward Proxy from ${proxyAddress} to ${egressAddress}`,
    );
  }

  public async stop(): Promise<void> {
    this.logger.info('Stopping Forward Proxy Server');
    // Ensure no new connections are created
    this.server.removeAllListeners('connect');
    this.server.on('connect', async (_request, clientSocket) => {
      const clientSocketEnd = promisify(clientSocket.end).bind(clientSocket);
      await clientSocketEnd('HTTP/1.1 503 Service Unavailable\r\n' + '\r\n');
      clientSocket.destroy();
    });
    const connStops: Array<Promise<void>> = [];
    for (const [_, conn] of this.connections.ingress) {
      connStops.push(conn.stop());
    }
    const serverClose = promisify(this.server.close).bind(this.server);
    await serverClose();
    await Promise.all(connStops);
    // Even when all connections are destroyed
    // the utp socket sometimes hangs in closing
    // here we asynchronously close and unreference it
    // in order to speed up the closing
    this.utpSocket.close();
    this.utpSocket.unref();
    this.logger.info('Stopped Forward Proxy Server');
  }

  @ready(new networkErrors.ErrorForwardProxyNotRunning())
  public getProxyHost(): Host {
    return this.proxyHost;
  }

  @ready(new networkErrors.ErrorForwardProxyNotRunning())
  public getProxyPort(): Port {
    return this.proxyPort;
  }

  @ready(new networkErrors.ErrorForwardProxyNotRunning())
  public getEgressHost(): Host {
    return this.egressHost;
  }

  @ready(new networkErrors.ErrorForwardProxyNotRunning())
  public getEgressPort(): Port {
    return this.egressPort;
  }
  public getConnectionCount(): number {
    return this.connections.ingress.size;
  }

  @ready(new networkErrors.ErrorForwardProxyNotRunning())
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

  @ready(new networkErrors.ErrorForwardProxyNotRunning())
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

  @ready(new networkErrors.ErrorForwardProxyNotRunning())
  public setTLSConfig(tlsConfig: TLSConfig): void {
    this.tlsConfig = tlsConfig;
  }

  /**
   * Manually opens a connection with the ForwardProxy
   * Usually you just use HTTP Connect requests to trigger handleConnect
   * This will default to using `this.connConnectTime` if
   * timer is not set or set to `undefined`
   * It will only stop the timer if using the default timer
   * Set timer to `null` explicitly to wait forever
   */
  @ready(new networkErrors.ErrorForwardProxyNotRunning(), true)
  public async openConnection(
    nodeId: NodeId,
    ingressHost: Host,
    ingressPort: Port,
    timer?: Timer,
  ): Promise<void> {
    let timer_ = timer;
    if (timer === undefined) {
      timer_ = timerStart(this.connConnectTime);
    }
    const ingressAddress = networkUtils.buildAddress(ingressHost, ingressPort);
    let lock = this.connectionLocks.get(ingressAddress);
    if (lock == null) {
      lock = new Mutex();
      this.connectionLocks.set(ingressAddress, lock);
    }
    const release = await lock.acquire();
    try {
      await this.establishConnection(nodeId, ingressHost, ingressPort, timer_);
    } finally {
      if (timer === undefined) {
        timerStop(timer_!);
      }
      release();
      this.connectionLocks.delete(ingressAddress);
    }
  }

  @ready(new networkErrors.ErrorForwardProxyNotRunning(), true)
  public async closeConnection(
    ingressHost: Host,
    ingressPort: Port,
  ): Promise<void> {
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
    // Must be authenticated
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
        if (e instanceof networkErrors.ErrorConnectionStartTimeout) {
          if (!clientSocket.destroyed) {
            await clientSocketEnd('HTTP/1.1 504 Gateway Timeout\r\n' + '\r\n');
            clientSocket.destroy(e);
          }
          return;
        }
        if (e instanceof networkErrors.ErrorConnectionStart) {
          if (!clientSocket.destroyed) {
            await clientSocketEnd('HTTP/1.1 502 Bad Gateway\r\n' + '\r\n');
            clientSocket.destroy(e);
          }
          return;
        }
        if (e instanceof networkErrors.ErrorCertChain) {
          if (!clientSocket.destroyed) {
            await clientSocketEnd(
              'HTTP/1.1 526 Invalid SSL Certificate\r\n' + '\r\n',
            );
            clientSocket.destroy(e);
          }
          return;
        }
        if (e instanceof networkErrors.ErrorConnectionTimeout) {
          if (!clientSocket.destroyed) {
            await clientSocketEnd(
              'HTTP/1.1 524 A Timeout Occurred\r\n' + '\r\n',
            );
            clientSocket.destroy(e);
          }
          return;
        }
        if (e instanceof networkErrors.ErrorConnection) {
          if (!clientSocket.destroyed) {
            await clientSocketEnd(
              'HTTP/1.1 500 Internal Server Error\r\n' + '\r\n',
            );
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
      // After composing, switch off this error handler
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
    // No more than one connection to an ingress address.
    if (conn != null) {
      return conn;
    }
    conn = new ConnectionForward({
      nodeId,
      connections: this.connections,
      utpSocket: this.utpSocket,
      host: ingressHost,
      port: ingressPort,
      tlsConfig: this.tlsConfig,
      keepAliveTimeoutTime: this.connKeepAliveTimeoutTime,
      endTime: this.connEndTime,
      punchIntervalTime: this.connPunchIntervalTime,
      keepAliveIntervalTime: this.connKeepAliveIntervalTime,
      logger: this.logger.getChild(
        `${ConnectionForward.name} ${ingressAddress}`,
      ),
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
    _request: http.IncomingMessage,
    response: http.ServerResponse,
  ): void => {
    response.writeHead(405);
    response.end();
  };
}

export default ForwardProxy;
