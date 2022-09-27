import type { AddressInfo, Socket } from 'net';
import type {
  Host,
  Port,
  Address,
  ConnectionInfo,
  TLSConfig,
  ConnectionEstablishedCallback,
} from './types';
import type { ConnectionsForward } from './ConnectionForward';
import type { NodeId } from '../ids/types';
import type { Timer } from '../types';
import type UTPConnection from 'utp-native/lib/connection';
import type { ConnectionsReverse } from './ConnectionReverse';
import http from 'http';
import UTP from 'utp-native';
import Logger from '@matrixai/logger';
import { Lock } from '@matrixai/async-locks';
import { withF } from '@matrixai/resources';
import { StartStop, ready } from '@matrixai/async-init/dist/StartStop';
import ConnectionReverse from './ConnectionReverse';
import ConnectionForward from './ConnectionForward';
import * as networkUtils from './utils';
import * as networkErrors from './errors';
import * as nodesUtils from '../nodes/utils';
import { promisify, timerStart, timerStop } from '../utils';

interface Proxy extends StartStop {}
@StartStop()
class Proxy {
  public readonly authToken: string;
  public readonly connConnectTime: number;
  public readonly connKeepAliveTimeoutTime: number;
  public readonly connEndTime: number;
  public readonly connPunchIntervalTime: number;
  public readonly connKeepAliveIntervalTime: number;

  protected logger: Logger;
  protected forwardHost: Host;
  protected forwardPort: Port;
  protected serverHost: Host;
  protected serverPort: Port;
  protected proxyHost: Host;
  protected proxyPort: Port;
  protected server: http.Server;
  protected utpSocket: UTP;
  protected tlsConfig: TLSConfig;
  protected connectionLocksForward: Map<Address, Lock> = new Map();
  protected connectionsForward: ConnectionsForward = {
    proxy: new Map(),
    client: new Map(),
  };
  protected connectionLocksReverse: Map<Address, Lock> = new Map();
  protected connectionsReverse: ConnectionsReverse = {
    proxy: new Map(),
    reverse: new Map(),
  };
  protected connectionEstablishedCallback: ConnectionEstablishedCallback;

  constructor({
    authToken,
    connConnectTime = 20000,
    connKeepAliveTimeoutTime = 20000,
    connEndTime = 1000,
    connPunchIntervalTime = 1000,
    connKeepAliveIntervalTime = 1000,
    connectionEstablishedCallback = () => {},
    logger,
  }: {
    authToken: string;
    connConnectTime?: number;
    connKeepAliveTimeoutTime?: number;
    connEndTime?: number;
    connPunchIntervalTime?: number;
    connKeepAliveIntervalTime?: number;
    connectionEstablishedCallback?: ConnectionEstablishedCallback;
    logger?: Logger;
  }) {
    this.logger = logger ?? new Logger(Proxy.name);
    this.logger.info(`Creating ${Proxy.name}`);
    this.authToken = authToken;
    this.connConnectTime = connConnectTime;
    this.connKeepAliveTimeoutTime = connKeepAliveTimeoutTime;
    this.connEndTime = connEndTime;
    this.connPunchIntervalTime = connPunchIntervalTime;
    this.connKeepAliveIntervalTime = connKeepAliveIntervalTime;
    this.server = http.createServer();
    this.server.on('request', this.handleRequest);
    this.server.on('connect', this.handleConnectForward);
    this.connectionEstablishedCallback = connectionEstablishedCallback;
    this.logger.info(`Created ${Proxy.name}`);
  }

  /**
   * UTP only supports IPv4
   */
  public async start({
    proxyHost = '0.0.0.0' as Host,
    proxyPort = 0 as Port,
    forwardHost = '127.0.0.1' as Host,
    forwardPort = 0 as Port,
    serverHost,
    serverPort,
    tlsConfig,
  }: {
    proxyHost?: Host;
    proxyPort?: Port;
    forwardHost?: Host;
    forwardPort?: Port;
    serverHost: Host;
    serverPort: Port;
    tlsConfig: TLSConfig;
  }): Promise<void> {
    let forwardAddress = networkUtils.buildAddress(forwardHost, forwardPort);
    let proxyAddress = networkUtils.buildAddress(proxyHost, proxyPort);
    let serverAddress = networkUtils.buildAddress(serverHost, serverPort);
    this.logger.info(
      `Starting Forward Proxy from ${forwardAddress} to ${proxyAddress} and Reverse Proxy from ${proxyAddress} to ${serverAddress}`,
    );
    // Normal sockets defaults to `allowHalfOpen: false`
    // But UTP defaults to `allowHalfOpen: true`
    // Setting `allowHalfOpen: false` on UTP is buggy and cannot be used
    const utpSocket = UTP.createServer(
      { allowHalfOpen: true },
      this.handleConnectionReverse,
    );
    const utpSocketListen = promisify(utpSocket.listen).bind(utpSocket);
    await utpSocketListen(proxyPort, proxyHost);
    proxyPort = utpSocket.address().port;
    const serverListen = promisify(this.server.listen).bind(this.server);
    await serverListen(forwardPort, forwardHost);
    forwardPort = (this.server.address() as AddressInfo).port as Port;
    this.forwardHost = forwardHost;
    this.forwardPort = forwardPort;
    this.serverHost = serverHost;
    this.serverPort = serverPort;
    this.proxyHost = proxyHost;
    this.proxyPort = proxyPort;
    this.utpSocket = utpSocket;
    this.tlsConfig = tlsConfig;
    forwardAddress = networkUtils.buildAddress(forwardHost, forwardPort);
    proxyAddress = networkUtils.buildAddress(proxyHost, proxyPort);
    serverAddress = networkUtils.buildAddress(serverHost, serverPort);
    this.logger.info(
      `Started Forward Proxy from ${forwardAddress} to ${proxyAddress} and Reverse Proxy from ${proxyAddress} to ${serverAddress}`,
    );
  }

  public async stop(): Promise<void> {
    this.logger.info('Stopping Proxy Server');
    // Ensure no new connections are created
    this.server.removeAllListeners('connect');
    this.server.on('connect', async (_request, clientSocket) => {
      const clientSocketEnd = promisify(clientSocket.end).bind(clientSocket);
      await clientSocketEnd('HTTP/1.1 503 Service Unavailable\r\n' + '\r\n');
      clientSocket.destroy();
    });
    this.utpSocket.removeAllListeners('connection');
    this.utpSocket.on('connection', (utpConn: UTPConnection) => {
      utpConn.end();
      utpConn.destroy();
    });
    const connStops: Array<Promise<void>> = [];
    for (const [_, conn] of this.connectionsForward.proxy) {
      connStops.push(conn.stop());
    }
    for (const [_, conn] of this.connectionsReverse.proxy) {
      connStops.push(conn.stop());
    }
    const serverClose = promisify(this.server.close).bind(this.server);
    await serverClose();
    await Promise.all(connStops);
    // Even when all connections are destroyed
    // the utp socket sometimes hangs in closing
    // here we asynchronously close and un-reference it
    // in order to speed up the closing
    this.utpSocket.close();
    this.utpSocket.unref();
    this.logger.info('Stopped Proxy Server');
  }

  @ready(new networkErrors.ErrorProxyNotRunning())
  public getForwardHost(): Host {
    return this.forwardHost;
  }

  @ready(new networkErrors.ErrorProxyNotRunning())
  public getForwardPort(): Port {
    return this.forwardPort;
  }

  @ready(new networkErrors.ErrorProxyNotRunning())
  public getServerHost(): Host {
    return this.serverHost;
  }

  @ready(new networkErrors.ErrorProxyNotRunning())
  public getServerPort(): Port {
    return this.serverPort;
  }

  @ready(new networkErrors.ErrorProxyNotRunning())
  public getProxyHost(): Host {
    return this.proxyHost;
  }

  @ready(new networkErrors.ErrorProxyNotRunning())
  public getProxyPort(): Port {
    return this.proxyPort;
  }

  public getConnectionForwardCount(): number {
    return this.connectionsForward.proxy.size;
  }

  public getConnectionReverseCount(): number {
    return this.connectionsReverse.proxy.size;
  }

  @ready(new networkErrors.ErrorProxyNotRunning())
  public getConnectionInfoByClient(
    clientHost: Host,
    clientPort: Port,
  ): ConnectionInfo | undefined {
    const clientAddress = networkUtils.buildAddress(clientHost, clientPort);
    const conn = this.connectionsForward.client.get(clientAddress);
    if (conn == null) {
      return;
    }
    const serverCertificates = conn.getServerCertificates();
    const serverNodeIds = conn.getServerNodeIds();
    return {
      remoteNodeId: serverNodeIds[0],
      remoteCertificates: serverCertificates,
      localHost: this.proxyHost,
      localPort: this.proxyPort,
      remoteHost: conn.host,
      remotePort: conn.port,
    };
  }

  @ready(new networkErrors.ErrorProxyNotRunning())
  public getConnectionInfoByReverse(
    reverseHost: Host,
    reversePort: Port,
  ): ConnectionInfo | undefined {
    const proxyAddress = networkUtils.buildAddress(reverseHost, reversePort);
    const conn = this.connectionsReverse.reverse.get(proxyAddress);
    if (conn == null) {
      return;
    }
    const clientCertificates = conn.getClientCertificates();
    const clientNodeIds = conn.getClientNodeIds();
    return {
      remoteNodeId: clientNodeIds[0],
      remoteCertificates: clientCertificates,
      remoteHost: conn.host,
      remotePort: conn.port,
      localHost: this.proxyHost,
      localPort: this.proxyPort,
    };
  }

  @ready(new networkErrors.ErrorProxyNotRunning())
  public getConnectionInfoByProxy(
    proxyHost: Host,
    proxyPort: Port,
  ): ConnectionInfo | undefined {
    const proxyAddress = networkUtils.buildAddress(proxyHost, proxyPort);
    // Check for a forward connection
    const forwardConn = this.connectionsForward.proxy.get(proxyAddress);
    if (forwardConn != null) {
      const certificates = forwardConn.getServerCertificates();
      const nodeIds = forwardConn.getServerNodeIds();
      return {
        remoteNodeId: nodeIds[0],
        remoteCertificates: certificates,
        localHost: this.proxyHost,
        localPort: this.proxyPort,
        remoteHost: forwardConn.host,
        remotePort: forwardConn.port,
      };
    }
    // Check for a reverse connection
    const reverseConn = this.connectionsReverse.proxy.get(proxyAddress);
    if (reverseConn != null) {
      const certificates = reverseConn.getClientCertificates();
      const nodeIds = reverseConn.getClientNodeIds();
      return {
        remoteNodeId: nodeIds[0],
        remoteCertificates: certificates,
        localHost: this.proxyHost,
        localPort: this.proxyPort,
        remoteHost: reverseConn.host,
        remotePort: reverseConn.port,
      };
    }
    // Otherwise return nothing
  }

  @ready(new networkErrors.ErrorProxyNotRunning())
  public setTLSConfig(tlsConfig: TLSConfig): void {
    this.logger.info(`Updating ${this.constructor.name} TLS Config`);
    this.tlsConfig = tlsConfig;
  }

  // Forward connection specific methods

  /**
   * Manually opens a connection with the ForwardProxy
   * Usually you just use HTTP Connect requests to trigger handleConnect
   * This will default to using `this.connConnectTime` if
   * timer is not set or set to `undefined`
   * It will only stop the timer if using the default timer
   * Set timer to `null` explicitly to wait forever
   */
  @ready(new networkErrors.ErrorProxyNotRunning(), true)
  public async openConnectionForward(
    nodeId: NodeId,
    proxyHost: Host,
    proxyPort: Port,
    timer?: Timer,
  ): Promise<void> {
    let timer_ = timer;
    if (timer === undefined) {
      timer_ = timerStart(this.connConnectTime);
    }
    const proxyAddress = networkUtils.buildAddress(proxyHost, proxyPort);
    let lock = this.connectionLocksForward.get(proxyAddress);
    if (lock == null) {
      lock = new Lock();
      this.connectionLocksForward.set(proxyAddress, lock);
    }
    await withF([lock.lock()], async () => {
      try {
        await this.establishConnectionForward(
          nodeId,
          proxyHost,
          proxyPort,
          timer_,
        );
      } finally {
        if (timer === undefined) {
          timerStop(timer_!);
        }
        this.connectionLocksForward.delete(proxyAddress);
      }
    });
  }

  @ready(new networkErrors.ErrorProxyNotRunning(), true)
  public async closeConnectionForward(
    proxyHost: Host,
    proxyPort: Port,
  ): Promise<void> {
    const proxyAddress = networkUtils.buildAddress(proxyHost, proxyPort);
    let lock = this.connectionLocksForward.get(proxyAddress);
    if (lock == null) {
      lock = new Lock();
      this.connectionLocksForward.set(proxyAddress, lock);
    }
    await withF([lock.lock()], async () => {
      try {
        const conn = this.connectionsForward.proxy.get(proxyAddress);
        if (conn == null) {
          return;
        }
        await conn.stop();
      } finally {
        this.connectionLocksForward.delete(proxyAddress);
      }
    });
  }

  /**
   * HTTP Connect Proxy will proxy TCP to TLS + uTP
   */
  protected handleConnectForward = async (
    request: http.IncomingMessage,
    clientSocket: Socket,
  ): Promise<void> => {
    const clientSocketEnd = promisify(clientSocket.end).bind(clientSocket);
    const clientSocketWrite = promisify(clientSocket.write).bind(clientSocket);
    let proxyAddress: string | null = null;
    const handleConnectError = (e) => {
      if (proxyAddress != null) {
        this.logger.error(
          `Failed CONNECT to ${proxyAddress} - ${e.toString()}`,
        );
      } else {
        this.logger.error(`Failed CONNECT - ${e.toString()}`);
      }
      clientSocket.destroy();
    };
    clientSocket.on('error', handleConnectError);
    if (request.url === undefined) {
      await clientSocketEnd('HTTP/1.1 400 Bad Request\r\n' + '\r\n');
      clientSocket.destroy(new networkErrors.ErrorProxyConnectInvalidUrl());
      return;
    }
    const url = new URL(`pk://${request.url}`);
    const nodeIdEncodedForURL = url.searchParams.get('nodeId');
    const nodeId =
      nodeIdEncodedForURL != null
        ? nodesUtils.decodeNodeId(nodeIdEncodedForURL)
        : undefined;
    if (nodeId == null) {
      await clientSocketEnd('HTTP/1.1 400 Bad Request\r\n' + '\r\n');
      clientSocket.destroy(new networkErrors.ErrorProxyConnectMissingNodeId());
      return;
    }
    const hostMatch = url.hostname.match(/\[(.+)\]|(.+)/)!;
    if (hostMatch == null) {
      await clientSocketEnd('HTTP/1.1 400 Bad Request\r\n' + '\r\n');
      clientSocket.destroy(new networkErrors.ErrorProxyConnectInvalidUrl());
      return;
    }
    const proxyHost = (hostMatch[1] ?? hostMatch[2]) as Host;
    const proxyPort = (url.port === '' ? 80 : parseInt(url.port)) as Port;
    proxyAddress = url.host;
    this.logger.info(`Handling CONNECT to ${proxyAddress}`);
    // Must be authenticated
    if (!this.authenticated(request)) {
      await clientSocketEnd(
        'HTTP/1.1 407 Proxy Authentication Required\r\n' +
          'Proxy-Authenticate: Basic\r\n' +
          '\r\n',
      );
      clientSocket.destroy(new networkErrors.ErrorProxyConnectAuth());
      return;
    }
    let lock = this.connectionLocksForward.get(proxyAddress as Address);
    if (lock == null) {
      lock = new Lock();
      this.connectionLocksForward.set(proxyAddress as Address, lock);
    }
    await withF([lock.lock()], async () => {
      try {
        const timer = timerStart(this.connConnectTime);
        try {
          await this.connectForward(
            nodeId,
            proxyHost,
            proxyPort,
            clientSocket,
            timer,
          );
        } catch (e) {
          if (e instanceof networkErrors.ErrorProxyConnectInvalidUrl) {
            if (!clientSocket.destroyed) {
              await clientSocketEnd('HTTP/1.1 400 Bad Request\r\n' + '\r\n');
              clientSocket.destroy(e);
            }
            return;
          }
          if (e instanceof networkErrors.ErrorConnectionStartTimeout) {
            if (!clientSocket.destroyed) {
              await clientSocketEnd(
                'HTTP/1.1 504 Gateway Timeout\r\n' + '\r\n',
              );
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
        this.logger.info(`Handled CONNECT to ${proxyAddress}`);
      } finally {
        this.connectionLocksForward.delete(proxyAddress as Address);
      }
    });
  };

  protected async connectForward(
    nodeId: NodeId,
    proxyHost: Host,
    proxyPort: Port,
    clientSocket: Socket,
    timer?: Timer,
  ): Promise<void> {
    const conn = await this.establishConnectionForward(
      nodeId,
      proxyHost,
      proxyPort,
      timer,
    );
    conn.compose(clientSocket);
    // With the connection composed without error we can assume that the
    //  connection was established and verified
    await this.connectionEstablishedCallback({
      remoteNodeId: conn.getServerNodeIds()[0],
      remoteHost: conn.host,
      remotePort: conn.port,
      type: 'forward',
    });
  }

  protected async establishConnectionForward(
    nodeId: NodeId,
    proxyHost: Host,
    proxyPort: Port,
    timer?: Timer,
  ): Promise<ConnectionForward> {
    if (networkUtils.isHostWildcard(proxyHost)) {
      throw new networkErrors.ErrorProxyConnectInvalidUrl();
    }
    const proxyAddress = networkUtils.buildAddress(proxyHost, proxyPort);
    let conn: ConnectionForward | undefined;
    conn = this.connectionsForward.proxy.get(proxyAddress);
    // No more than one connection to an proxy address.
    if (conn != null) {
      return conn;
    }
    conn = new ConnectionForward({
      nodeId,
      connections: this.connectionsForward,
      utpSocket: this.utpSocket,
      host: proxyHost,
      port: proxyPort,
      tlsConfig: this.tlsConfig,
      keepAliveTimeoutTime: this.connKeepAliveTimeoutTime,
      endTime: this.connEndTime,
      punchIntervalTime: this.connPunchIntervalTime,
      keepAliveIntervalTime: this.connKeepAliveIntervalTime,
      logger: this.logger.getChild(`${ConnectionForward.name} ${proxyAddress}`),
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

  // Reverse connection specific methods

  @ready(new networkErrors.ErrorProxyNotRunning(), true)
  public async openConnectionReverse(
    proxyHost: Host,
    proxyPort: Port,
    timer?: Timer,
  ): Promise<void> {
    let timer_ = timer;
    if (timer === undefined) {
      timer_ = timerStart(this.connConnectTime);
    }
    const proxyAddress = networkUtils.buildAddress(proxyHost, proxyPort);
    let lock = this.connectionLocksReverse.get(proxyAddress);
    if (lock == null) {
      lock = new Lock();
      this.connectionLocksReverse.set(proxyAddress, lock);
    }
    await withF([lock.lock()], async () => {
      try {
        await this.establishConnectionReverse(proxyHost, proxyPort, timer_);
      } finally {
        if (timer === undefined) {
          timerStop(timer_!);
        }
        this.connectionLocksReverse.delete(proxyAddress);
      }
    });
  }

  @ready(new networkErrors.ErrorProxyNotRunning(), true)
  public async closeConnectionReverse(
    proxyHost: Host,
    proxyPort: Port,
  ): Promise<void> {
    const proxyAddress = networkUtils.buildAddress(proxyHost, proxyPort);
    let lock = this.connectionLocksReverse.get(proxyAddress);
    if (lock == null) {
      lock = new Lock();
      this.connectionLocksReverse.set(proxyAddress, lock);
    }
    await withF([lock.lock()], async () => {
      try {
        const conn = this.connectionsReverse.proxy.get(proxyAddress);
        if (conn == null) {
          return;
        }
        await conn.stop();
      } finally {
        this.connectionLocksReverse.delete(proxyAddress);
      }
    });
  }

  protected handleConnectionReverse = async (
    utpConn: UTPConnection,
  ): Promise<void> => {
    const proxyAddress = networkUtils.buildAddress(
      utpConn.remoteAddress,
      utpConn.remotePort,
    );
    let lock = this.connectionLocksReverse.get(proxyAddress);
    if (lock == null) {
      lock = new Lock();
      this.connectionLocksReverse.set(proxyAddress, lock);
    }
    await withF([lock.lock()], async () => {
      try {
        this.logger.info(`Handling connection from ${proxyAddress}`);
        const timer = timerStart(this.connConnectTime);
        try {
          await this.connectReverse(
            utpConn.remoteAddress,
            utpConn.remotePort,
            utpConn,
            timer,
          );
        } catch (e) {
          if (!(e instanceof networkErrors.ErrorNetwork)) {
            throw e;
          }
          if (!utpConn.destroyed) {
            utpConn.destroy();
          }
          this.logger.warn(
            `Failed connection from ${proxyAddress} - ${e.toString()}`,
          );
        } finally {
          timerStop(timer);
        }
        this.logger.info(`Handled connection from ${proxyAddress}`);
      } finally {
        this.connectionLocksReverse.delete(proxyAddress);
      }
    });
  };

  protected async connectReverse(
    proxyHost: Host,
    proxyPort: Port,
    utpConn: UTPConnection,
    timer?: Timer,
  ): Promise<void> {
    const conn = await this.establishConnectionReverse(
      proxyHost,
      proxyPort,
      timer,
    );
    await conn.compose(utpConn, timer);
    // With the connection composed without error we can assume that the
    //  connection was established and verified
    await this.connectionEstablishedCallback({
      remoteNodeId: conn.getClientNodeIds()[0],
      remoteHost: conn.host,
      remotePort: conn.port,
      type: 'reverse',
    });
  }

  protected async establishConnectionReverse(
    proxyHost: Host,
    proxyPort: Port,
    timer?: Timer,
  ): Promise<ConnectionReverse> {
    if (networkUtils.isHostWildcard(proxyHost)) {
      throw new networkErrors.ErrorProxyConnectInvalidUrl();
    }
    const proxyAddress = networkUtils.buildAddress(proxyHost, proxyPort);
    let conn = this.connectionsReverse.proxy.get(proxyAddress);
    if (conn != null) {
      return conn;
    }
    conn = new ConnectionReverse({
      serverHost: this.serverHost,
      serverPort: this.serverPort,
      connections: this.connectionsReverse,
      utpSocket: this.utpSocket,
      host: proxyHost,
      port: proxyPort,
      tlsConfig: this.tlsConfig,
      keepAliveTimeoutTime: this.connKeepAliveTimeoutTime,
      endTime: this.connEndTime,
      punchIntervalTime: this.connPunchIntervalTime,
      logger: this.logger.getChild(`${ConnectionReverse.name} ${proxyAddress}`),
    });
    await conn.start({ timer });
    return conn;
  }
}

export default Proxy;
