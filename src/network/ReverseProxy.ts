import type UTPConnection from 'utp-native/lib/connection';
import type { Host, Port, Address, ConnectionInfo, TLSConfig } from './types';
import type { ConnectionsReverse } from './ConnectionReverse';
import type { Timer } from '../types';

import UTP from 'utp-native';
import { Mutex } from 'async-mutex';
import Logger from '@matrixai/logger';
import { StartStop, ready } from '@matrixai/async-init/dist/StartStop';
import ConnectionReverse from './ConnectionReverse';
import * as networkUtils from './utils';
import * as networkErrors from './errors';
import { promisify, sleep, timerStart, timerStop } from '../utils';

interface ReverseProxy extends StartStop {}
@StartStop()
class ReverseProxy {
  public readonly connConnectTime: number;
  public readonly connTimeoutTime: number;

  protected logger: Logger;
  protected _ingressHost: Host;
  protected _ingressPort: Port;
  protected _serverHost: Host;
  protected _serverPort: Port;
  protected utpSocket: UTP;
  protected tlsConfig: TLSConfig;
  protected connectionLocks: Map<Address, Mutex> = new Map();
  protected connections: ConnectionsReverse = {
    egress: new Map(),
    proxy: new Map(),
  };

  constructor({
    connConnectTime = 20000,
    connTimeoutTime = 20000,
    logger,
  }: {
    connConnectTime?: number;
    connTimeoutTime?: number;
    logger?: Logger;
  }) {
    this.logger = logger ?? new Logger(ReverseProxy.name);
    this.logger.info('Creating Reverse Proxy');
    this.connConnectTime = connConnectTime;
    this.connTimeoutTime = connTimeoutTime;
    this.logger.info('Created Reverse Proxy');
  }

  /**
   * UTP only supports IPv4
   */
  public async start({
    serverHost,
    serverPort,
    ingressHost = '0.0.0.0' as Host,
    ingressPort = 0 as Port,
    tlsConfig,
  }: {
    serverHost: Host;
    serverPort: Port;
    ingressHost?: Host;
    ingressPort?: Port;
    tlsConfig: TLSConfig;
  }): Promise<void> {
    this._ingressHost = ingressHost;
    this.tlsConfig = tlsConfig;
    let ingressAddress = networkUtils.buildAddress(ingressHost, ingressPort);
    let serverAddress = networkUtils.buildAddress(serverHost, serverPort);
    this.logger.info(
      `Starting Reverse Proxy from ${ingressAddress} to ${serverAddress}`,
    );
    const utpSocket = UTP.createServer(this.handleConnection, {
      allowHalfOpen: false,
    });
    const utpSocketListen = promisify(utpSocket.listen).bind(utpSocket);
    await utpSocketListen(ingressPort, this._ingressHost);
    this._ingressPort = utpSocket.address().port;
    this._serverHost = serverHost;
    this._serverPort = serverPort;
    this.utpSocket = utpSocket;
    ingressAddress = networkUtils.buildAddress(
      this._ingressHost,
      this._ingressPort,
    );
    serverAddress = networkUtils.buildAddress(serverHost, serverPort);
    this.logger.info(
      `Started Reverse Proxy from ${ingressAddress} to ${serverAddress}`,
    );
  }

  public async stop(): Promise<void> {
    this.logger.info('Stopping Reverse Proxy');
    // Ensure no new connections are created while this is iterating
    await Promise.all(
      Array.from(this.connections.egress, ([, conn]) => conn.stop()),
    );
    // Delay socket close by about 1 second
    // this gives some time for the end/FIN packets to be sent
    await sleep(1000);
    // Even when all connections are destroyed
    // the utp socket sometimes hangs in closing
    // here we asynchronously close and unreference it
    // in order to speed up the closing
    this.utpSocket.close();
    this.utpSocket.unref();
    this.logger.info('Stopped Reverse Proxy');
  }

  @ready(new networkErrors.ErrorReverseProxyNotStarted())
  get ingressHost(): Host {
    return this._ingressHost;
  }

  @ready(new networkErrors.ErrorReverseProxyNotStarted())
  get ingressPort(): Port {
    return this._ingressPort;
  }

  @ready(new networkErrors.ErrorReverseProxyNotStarted())
  get serverHost(): Host {
    return this._serverHost;
  }

  @ready(new networkErrors.ErrorReverseProxyNotStarted())
  get serverPort(): Port {
    return this._serverPort;
  }

  public setTLSConfig(tlsConfig: TLSConfig): void {
    this.tlsConfig = tlsConfig;
  }

  @ready(new networkErrors.ErrorReverseProxyNotStarted())
  public getConnectionInfoByProxy(
    proxyHost: Host,
    proxyPort: Port,
  ): ConnectionInfo | undefined {
    const proxyAddress = networkUtils.buildAddress(proxyHost, proxyPort);
    const conn = this.connections.proxy.get(proxyAddress);
    if (conn == null) {
      return;
    }
    const clientCertificates = conn.getClientCertificates();
    const clientNodeIds = conn.getClientNodeIds();
    return {
      nodeId: clientNodeIds[0],
      certificates: clientCertificates,
      egressHost: conn.host,
      egressPort: conn.port,
      ingressHost: this._ingressHost,
      ingressPort: this._ingressPort,
    };
  }

  @ready(new networkErrors.ErrorReverseProxyNotStarted())
  public getConnectionInfoByEgress(
    egressHost: Host,
    egressPort: Port,
  ): ConnectionInfo | undefined {
    const egressAddress = networkUtils.buildAddress(egressHost, egressPort);
    const conn = this.connections.egress.get(egressAddress);
    if (conn == null) {
      return;
    }
    const clientCertificates = conn.getClientCertificates();
    const clientNodeIds = conn.getClientNodeIds();
    return {
      nodeId: clientNodeIds[0],
      certificates: clientCertificates,
      egressHost: conn.host,
      egressPort: conn.port,
      ingressHost: this._ingressHost,
      ingressPort: this._ingressPort,
    };
  }

  get connectionCount(): number {
    return this.connections.egress.size;
  }

  @ready(new networkErrors.ErrorReverseProxyNotStarted())
  public async openConnection(
    egressHost: Host,
    egressPort: Port,
    timer?: Timer,
  ): Promise<void> {
    const egressAddress = networkUtils.buildAddress(egressHost, egressPort);
    let lock = this.connectionLocks.get(egressAddress);
    if (lock == null) {
      lock = new Mutex();
      this.connectionLocks.set(egressAddress, lock);
    }
    const release = await lock.acquire();
    try {
      await this.establishConnection(egressHost, egressPort, timer);
    } finally {
      release();
      this.connectionLocks.delete(egressAddress);
    }
  }

  @ready(new networkErrors.ErrorReverseProxyNotStarted())
  public async closeConnection(
    egressHost: Host,
    egressPort: Port,
  ): Promise<void> {
    const egressAddress = networkUtils.buildAddress(egressHost, egressPort);
    let lock = this.connectionLocks.get(egressAddress);
    if (lock == null) {
      lock = new Mutex();
      this.connectionLocks.set(egressAddress, lock);
    }
    const release = await lock.acquire();
    try {
      const conn = this.connections.egress.get(egressAddress);
      if (conn == null) {
        return;
      }
      await conn.stop();
    } finally {
      release();
      this.connectionLocks.delete(egressAddress);
    }
  }

  protected handleConnection = async (
    utpConn: UTPConnection,
  ): Promise<void> => {
    const egressAddress = networkUtils.buildAddress(
      utpConn.remoteAddress,
      utpConn.remotePort,
    );
    let lock = this.connectionLocks.get(egressAddress);
    if (lock == null) {
      lock = new Mutex();
      this.connectionLocks.set(egressAddress, lock);
    }
    const release = await lock.acquire();
    try {
      const handleConnectionError = (e) => {
        this.logger.warn(
          `Failed connection from ${egressAddress} - ${e.toString()}`,
        );
        utpConn.destroy();
      };
      utpConn.on('error', handleConnectionError);
      this.logger.info(`Handling connection from ${egressAddress}`);
      const timer = timerStart(this.connConnectTime);
      try {
        await this.connect(
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
          utpConn.destroy(e);
        } else {
          this.logger.warn(
            `Failed connection from ${egressAddress} - ${e.toString()}`,
          );
        }
      } finally {
        timerStop(timer);
      }
      utpConn.off('error', handleConnectionError);
      this.logger.info(`Handled connection from ${egressAddress}`);
    } finally {
      release();
      this.connectionLocks.delete(egressAddress);
    }
  };

  protected async connect(
    egressHost: Host,
    egressPort: Port,
    utpConn: UTPConnection,
    timer?: Timer,
  ): Promise<void> {
    const conn = await this.establishConnection(egressHost, egressPort, timer);
    await conn.compose(utpConn, timer);
  }

  protected async establishConnection(
    egressHost: Host,
    egressPort: Port,
    timer?: Timer,
  ): Promise<ConnectionReverse> {
    const egressAddress = networkUtils.buildAddress(egressHost, egressPort);
    let conn = this.connections.egress.get(egressAddress);
    if (conn != null) {
      return conn;
    }
    conn = new ConnectionReverse({
      serverHost: this._serverHost,
      serverPort: this._serverPort,
      connections: this.connections,
      utpSocket: this.utpSocket,
      host: egressHost,
      port: egressPort,
      tlsConfig: this.tlsConfig,
      timeoutTime: this.connTimeoutTime,
      logger: this.logger.getChild(
        `${ConnectionReverse.name} ${egressAddress}`,
      ),
    });
    await conn.start({ timer });
    return conn;
  }
}

export default ReverseProxy;
