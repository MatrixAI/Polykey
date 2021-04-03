import type { AddressInfo } from 'net';

import net from 'net';
import http from 'http';
import Logger from '@matrixai/logger';
import ConnectionManager from './ConnectionManager';
import * as networkErrors from './errors';
import {
  httpPayloadAuthenticationRequired,
  httpPayloadConnectionEstablished,
  toAuthToken,
} from './utils';
import { promisify, sleep } from '../utils';

/**
 * A proxy responsible for forwarding local traffic
 * to another proxy.
 */
class ForwardProxy {
  protected authToken: string;
  protected server: http.Server;
  protected httpPort: number;
  protected socketPort: number;
  protected logger: Logger;
  protected connection: ConnectionManager;

  constructor({ authToken, logger }: { authToken: string; logger?: Logger }) {
    this.logger = logger ?? new Logger('ForwardProxy');
    this.connection = new ConnectionManager({ logger: this.logger });
    this.authToken = authToken;
  }

  /**
   * Start the proxy server at the specified host and port.
   * If the port is not provided, the port is randomly selected.
   * @param host
   * @param port
   */
  public async start(): Promise<void> {
    this.logger.info(`Starting Forward Proxy.`);

    this.connection.start();
    this.connection.bind();
    this.socketPort = this.connection.getPort();

    this.server = http.createServer();
    this.server.on('request', this.handleRequest);
    this.server.on('connect', this.handleConnect);
    this.server.on('error', this.handleError);

    this.httpPort = await new Promise<number>((resolve) => {
      this.server.listen(() => {
        resolve((this.server.address() as AddressInfo).port);
      });
    });

    this.logger.info(
      `Started HTTP Server in Forward Proxy at port ${this.httpPort}.`,
    );
    this.logger.info(
      `Started Socket in Forward Proxy at port ${this.socketPort}.`,
    );
  }

  /**
   * Stop the proxy server and perform necessary clean up.
   */
  public async stop(): Promise<void> {
    this.logger.info('Stopping Forward Proxy Server.');
    await new Promise<void>((resolve) => {
      this.server.close(() => resolve());
    });
    await this.connection.stop();
    this.logger.info('Stopped Forward Proxy Server.');
  }

  public getHttpPort(): number | undefined {
    return this.httpPort;
  }

  public getSocketPort(): number | undefined {
    return this.socketPort;
  }

  /**
   * Currently not being used as AddressResolver is being replaced
   * with another system
   */
  // public contactAddressResolver(resolverPort: number, resolverHost: string) {
  //   const addressInfoBuffer = Buffer.from(this.nodeId + ':F');
  //   this.connection
  //     .getSocket()
  //     .send(
  //       addressInfoBuffer,
  //       0,
  //       addressInfoBuffer.length,
  //       resolverPort,
  //       resolverHost,
  //     );
  // }

  /**
   * Adding a NAT connection and start hole punch. Once established, the connection is
   * automatically kept alived.
   * @param remotePort
   * @param remoteHost
   * @param attempts
   */
  public async addNatConnection(
    remotePort: number,
    remoteHost: string,
    attempts: number = 50,
  ): Promise<boolean> {
    return this.connection.addNatConnection(remotePort, remoteHost, attempts);
  }

  /**
   * Adding a direct connection, however connectivity is assumed to be directly connectable
   * and no verification is done.
   * @param remotePort
   * @param remoteHost
   */
  public addDirectConnection(remotePort: number, remoteHost: string): void {
    this.connection.addDirectConnection(remotePort, remoteHost);
  }

  /**
   * Remove an existing connection.
   * @param remotePort
   * @param remoteHost
   */
  public removeConnection(remotePort: number, remoteHost: string): void {
    this.connection.removeConnection(remotePort, remoteHost);
  }

  /**
   * Handle regular HTTP requests.
   * @param request
   * @param response
   */
  protected handleRequest(
    request: http.IncomingMessage,
    response: http.ServerResponse,
  ): void {
    response.writeHead(405);
    response.end();
  }

  /**
   * Handle errornous HTTP requests.
   * @param e
   */
  protected handleError(e: Error): void {
    throw new networkErrors.ErrorProxy(e.message, {
      code: (e as any).code,
    });
  }

  /**
   * Handle HTTP CONNECT PROXY requests.
   * @param request
   * @param cliSock
   * @param head
   */
  protected handleConnect = async (
    request: http.IncomingMessage,
    clientConnection: net.Socket,
  ): Promise<void> => {
    const clientSocketEnd = promisify(clientConnection.end).bind(
      clientConnection,
    );

    // Must be authenticated.
    if (!this.authenticated(request)) {
      this.logger.info('Authentication failed.');
      await clientSocketEnd(httpPayloadAuthenticationRequired());
      clientConnection.destroy();
      return;
    }

    // Must contains a remote proxy address that the request should go.
    if (request.url === undefined) {
      this.logger.info('No remote proxy address provided.');
      clientConnection.destroy();
      return;
    }

    // This should be the remote reverse proxy address.
    let dstPort;
    const [dstHost, p] = request.url!.split(':', 2);
    if (!p) {
      dstPort = '80';
    } else {
      dstPort = p;
    }

    console.log(request.url);

    this.logger.info(`Connecting`);
    const connected = await this.directConnect(
      parseInt(dstPort),
      dstHost,
      2000,
      clientConnection,
    );

    if (!connected) {
      this.logger.info(`Cannot to connect.`);
      clientConnection.destroy();
      return;
    }
  };

  /**
   * Connect to the remote server directly.
   * @param connection our own Connection object.
   * @param timeout wait for connection to be established until timedout in milliseconds.
   * @param clientConnection a net.Socket connection object.
   */
  protected directConnect = async (
    remotePort: number,
    remoteHost: string,
    timeout: number,
    clientConnection: net.Socket,
  ): Promise<boolean> => {
    const clientConnWrite = promisify(clientConnection.write).bind(
      clientConnection,
    );
    const rvProxyConnection = this.connection.connect(remotePort, remoteHost);

    // Reverse Proxy replied means it's established.
    rvProxyConnection.once('data', () => {
      rvProxyConnection.pipe(clientConnection);
      clientConnection.pipe(rvProxyConnection);
      clientConnWrite(httpPayloadConnectionEstablished());
    });

    // Reverse Proxy is connected.
    rvProxyConnection.once('connect', () => {
      this.logger.info(`Connected.`);
      return true;
    });

    rvProxyConnection.once('close', () => {
      this.logger.info(`Disconnected.`);
    });

    const rvProxyConnWrite = promisify(rvProxyConnection.write).bind(
      rvProxyConnection,
    );
    rvProxyConnWrite('Hello');

    await sleep(timeout);

    // Timed out on connect.
    return false;
  };

  /**
   * Given a request, authenticate its proxy-authorization token.
   * @param request
   */
  protected authenticated(request: http.IncomingMessage): boolean {
    const bearerAuthToken = toAuthToken(this.authToken);
    return (
      request.headers['proxy-authorization'] !== undefined &&
      request.headers['proxy-authorization'] == bearerAuthToken
    );
  }
}

export default ForwardProxy;
