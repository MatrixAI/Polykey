import type { TLSConfig } from '../network/types';
import type { IncomingMessage, ServerResponse } from 'http';
import https from 'https';
import { startStop, status } from '@matrixai/async-init';
import Logger from '@matrixai/logger';
import * as ws from 'ws';
import WebSocketStream from './WebSocketStream';
import * as webSocketErrors from './errors';
import * as webSocketEvents from './events';
import { never, promise } from '../utils';

type ConnectionCallback = (streamPair: WebSocketStream) => void;

/**
 * Events:
 * - start
 * - stop
 * - connection
 */
interface WebSocketServer extends startStop.StartStop {}
@startStop.StartStop()
class WebSocketServer extends EventTarget {
  /**
   * @param obj
   * @param obj.connectionCallback -
   * @param obj.tlsConfig - TLSConfig containing the private key and cert chain used for TLS.
   * @param obj.basePath - Directory path used for storing temp cert files for starting the `uWebsocket` server.
   * @param obj.host - Listen address to bind to.
   * @param obj.port - Listen port to bind to.
   * @param obj.maxIdleTimeout - Timeout time for when the connection is cleaned up after no activity.
   * Default is 120 seconds.
   * @param obj.pingIntervalTime - Time between pings for checking connection health and keep alive.
   * Default is 1,000 milliseconds.
   * @param obj.pingTimeoutTimeTime - Time before connection is cleaned up after no ping responses.
   * Default is 10,000 milliseconds.
   * @param obj.logger
   */
  static async createWebSocketServer({
    connectionCallback,
    tlsConfig,
    basePath,
    host,
    port,
    maxIdleTimeout = 120,
    pingIntervalTime = 1_000,
    pingTimeoutTimeTime = 10_000,
    logger = new Logger(this.name),
  }: {
    connectionCallback: ConnectionCallback;
    tlsConfig: TLSConfig;
    basePath?: string;
    host?: string;
    port?: number;
    maxIdleTimeout?: number;
    pingIntervalTime?: number;
    pingTimeoutTimeTime?: number;
    logger?: Logger;
  }) {
    logger.info(`Creating ${this.name}`);
    const wsServer = new this(
      logger,
      maxIdleTimeout,
      pingIntervalTime,
      pingTimeoutTimeTime,
    );
    await wsServer.start({
      connectionCallback,
      tlsConfig,
      basePath,
      host,
      port,
    });
    logger.info(`Created ${this.name}`);
    return wsServer;
  }

  protected server: https.Server;
  protected webSocketServer: ws.WebSocketServer;
  protected _port: number;
  protected _host: string;
  protected connectionEventHandler: (
    event: webSocketEvents.ConnectionEvent,
  ) => void;
  protected activeSockets: Set<WebSocketStream> = new Set();

  /**
   *
   * @param logger
   * @param maxIdleTimeout
   * @param pingIntervalTime
   * @param pingTimeoutTimeTime
   */
  constructor(
    protected logger: Logger,
    protected maxIdleTimeout: number | undefined,
    protected pingIntervalTime: number,
    protected pingTimeoutTimeTime: number,
  ) {
    super();
  }

  public async start({
    tlsConfig,
    host,
    port = 0,
    connectionCallback,
  }: {
    tlsConfig: TLSConfig;
    basePath?: string;
    host?: string;
    port?: number;
    connectionCallback?: ConnectionCallback;
  }): Promise<void> {
    this.logger.info(`Starting ${this.constructor.name}`);
    if (connectionCallback != null) {
      this.connectionEventHandler = (
        event: webSocketEvents.ConnectionEvent,
      ) => {
        connectionCallback(event.detail.webSocketStream);
      };
      this.addEventListener('connection', this.connectionEventHandler);
    }
    this.server = https.createServer({
      key: tlsConfig.keyPrivatePem,
      cert: tlsConfig.certChainPem,
    });
    this.webSocketServer = new ws.WebSocketServer({
      server: this.server,
    });

    this.webSocketServer.on('connection', this.connectionHandler);
    this.webSocketServer.on('close', this.closeHandler);
    this.server.on('close', this.closeHandler);
    this.webSocketServer.on('error', this.errorHandler);
    this.server.on('error', this.errorHandler);
    this.server.on('request', this.requestHandler);

    const listenProm = promise<void>();
    this.server.listen(port ?? 0, host, listenProm.resolveP);
    await listenProm.p;
    const address = this.server.address();
    if (address == null || typeof address === 'string') never();
    this._port = address.port;
    this.logger.debug(`Listening on port ${this._port}`);
    this._host = address.address ?? '127.0.0.1';
    this.dispatchEvent(
      new webSocketEvents.StartEvent({
        detail: {
          host: this._host,
          port: this._port,
        },
      }),
    );
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop(force: boolean = false): Promise<void> {
    this.logger.info(`Stopping ${this.constructor.name}`);
    // Shutting down active websockets
    if (force) {
      for (const webSocketStream of this.activeSockets) {
        webSocketStream.cancel();
      }
    }
    // Wait for all active websockets to close
    for (const webSocketStream of this.activeSockets) {
      // Ignore errors, we only care that it finished
      webSocketStream.endedProm.catch(() => {});
    }
    // Close the server by closing the underlying socket
    const wssCloseProm = promise<void>();
    this.webSocketServer.close((e) => {
      if (e == null || e.message === 'The server is not running') {
        wssCloseProm.resolveP();
      } else {
        wssCloseProm.rejectP(e);
      }
    });
    await wssCloseProm.p;
    const serverCloseProm = promise<void>();
    this.server.close((e) => {
      if (e == null || e.message === 'Server is not running.') {
        serverCloseProm.resolveP();
      } else {
        serverCloseProm.rejectP(e);
      }
    });
    await serverCloseProm.p;
    // Removing handlers
    if (this.connectionEventHandler != null) {
      this.removeEventListener('connection', this.connectionEventHandler);
    }

    this.webSocketServer.off('connection', this.connectionHandler);
    this.webSocketServer.off('close', this.closeHandler);
    this.server.off('close', this.closeHandler);
    this.webSocketServer.off('error', this.errorHandler);
    this.server.off('error', this.errorHandler);
    this.server.on('request', this.requestHandler);

    this.dispatchEvent(new webSocketEvents.StopEvent());
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  @startStop.ready(new webSocketErrors.ErrorWebSocketServerNotRunning())
  public getPort(): number {
    return this._port;
  }

  @startStop.ready(new webSocketErrors.ErrorWebSocketServerNotRunning())
  public getHost(): string {
    return this._host;
  }

  /**
   * Handles the creation of the `ReadableWritablePair` and provides it to the
   * StreamPair handler.
   */
  protected connectionHandler = (
    webSocket: ws.WebSocket,
    request: IncomingMessage,
  ) => {
    const connection = request.connection;
    const webSocketStream = new WebSocketStream(
      webSocket,
      this.pingIntervalTime,
      this.pingTimeoutTimeTime,
      {
        localHost: connection.localAddress ?? '',
        localPort: connection.localPort ?? 0,
        remoteHost: connection.remoteAddress ?? '',
        remotePort: connection.remotePort ?? 0,
      },
      this.logger.getChild(WebSocketStream.name),
    );
    // Adding socket to the active sockets map
    this.activeSockets.add(webSocketStream);
    void webSocketStream.endedProm
      // Ignore errors, we only care that it finished
      .catch(() => {})
      .finally(() => {
        this.activeSockets.delete(webSocketStream);
      });

    // There is not nodeId or certs for the client, and we can't get the remote
    //  port from the `uWebsocket` library.
    this.dispatchEvent(
      new webSocketEvents.ConnectionEvent({
        detail: {
          webSocketStream,
        },
      }),
    );
  };

  /**
   * Used to trigger stopping if the underlying server fails
   */
  protected closeHandler = async () => {
    if (this[status] == null || this[status] === 'stopping') {
      this.logger.debug('close event but already stopping');
      return;
    }
    this.logger.debug('close event, forcing stop');
    await this.stop(true);
  };

  /**
   * Used to propagate error conditions
   */
  protected errorHandler = (e: Error) => {
    this.logger.error(e);
  };

  /**
   * Will tell any normal HTTP request to upgrade
   */
  protected requestHandler = (_req, res: ServerResponse) => {
    res
      .writeHead(426, '426 Upgrade Required', {
        connection: 'Upgrade',
        upgrade: 'websocket',
      })
      .end('426 Upgrade Required');
  };
}

export default WebSocketServer;
