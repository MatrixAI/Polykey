import type {
  ReadableStreamController,
  WritableStreamDefaultController,
} from 'stream/web';
import type { JSONValue } from '../types';
import type { TLSConfig } from '../network/types';
import type { IncomingMessage, ServerResponse } from 'http';
import { WritableStream, ReadableStream } from 'stream/web';
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
   * @param obj.maxReadableStreamBytes - The number of bytes the readable stream will buffer until pausing.
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
   * @param maxReadableStreamBytes Max number of bytes stored in read buffer before error
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
      host: this._host,
      port: this._port,
      server: this.server,
    });

    this.webSocketServer.on('connection', this.connectionHandler);
    this.webSocketServer.on('close', this.closeHandler);
    this.server.on('close', this.closeHandler);
    this.webSocketServer.on('error', this.errorHandler);
    this.server.on('error', this.errorHandler);
    this.server.on('request', this.requestHandler);

    // This.server.any('/*', (res, _) => {
    //   // Reject normal requests with an upgrade code
    //   res
    //     .writeStatus('426')
    //     .writeHeader('connection', 'Upgrade')
    //     .writeHeader('upgrade', 'websocket')
    //     .end('426 Upgrade Required', true);
    // });

    // TODO: tell normal requests to upgrade.
    const listenProm = promise<void>();
    this.server.listen(port ?? 0, host, listenProm.resolveP);
    await listenProm.p;
    const address = this.server.address();
    // TODO: handle string
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
    const socket = request.connection;
    const webSocketStream = new WebSocketStreamServerInternal(
      webSocket,
      this.pingIntervalTime,
      this.pingTimeoutTimeTime,
      {
        localHost: socket.localAddress ?? '',
        localPort: socket.localPort ?? 0,
        remoteHost: socket.remoteAddress ?? '',
        remotePort: socket.remotePort ?? '',
      },
      this.logger.getChild(WebSocketStreamServerInternal.name),
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

class WebSocketStreamServerInternal extends WebSocketStream {
  protected writableController: WritableStreamDefaultController | undefined;
  protected readableController:
    | ReadableStreamController<Uint8Array>
    | undefined;
  protected messageHandler: (data: ws.RawData, isBinary: boolean) => void;

  constructor(
    protected webSocket: ws.WebSocket,
    pingInterval: number,
    pingTimeoutTime: number,
    protected metadata: Record<string, JSONValue>,
    protected logger: Logger,
  ) {
    super();
    logger.info('WS opened');
    const writableLogger = logger.getChild('Writable');
    const readableLogger = logger.getChild('Readable');
    // Setting up the writable stream
    this.writable = new WritableStream<Uint8Array>({
      start: (controller) => {
        this.writableController = controller;
      },
      write: async (chunk, controller) => {
        const writeResultProm = promise<void>();
        this.webSocket.send(chunk, (err) => {
          if (err == null) writeResultProm.resolveP();
          else writeResultProm.rejectP(err);
        });
        try {
          await writeResultProm.p;
          writableLogger.debug(`Sending ${Buffer.from(chunk).toString()}`);
        } catch (e) {
          this.logger.error(e);
          controller.error(new webSocketErrors.ErrorServerSendFailed());
        }
      },
      close: async () => {
        writableLogger.info('Closed, sending null message');
        if (!this._webSocketEnded) {
          const endProm = promise<void>();
          this.webSocket.send(Buffer.from([]), (err) => {
            if (err == null) endProm.resolveP();
            else endProm.rejectP(err);
          });
          await endProm.p;
        }
        this.signalWritableEnd();
        if (this._readableEnded && !this._webSocketEnded) {
          writableLogger.debug('Ending socket');
          this.signalWebSocketEnd();
          this.webSocket.close();
        }
      },
      abort: (reason) => {
        writableLogger.info('Aborted');
        if (this._readableEnded && !this._webSocketEnded) {
          writableLogger.debug('Ending socket');
          this.signalWebSocketEnd(reason);
          this.webSocket.close(4000, 'Aborting connection');
        }
      },
    },
    {
      highWaterMark: 1,
    });
    // Setting up the readable stream
    this.messageHandler = (data: ws.RawData, isBinary: boolean) => {
      if (!isBinary) never();
      if (data instanceof Array) never();
      const messageBuffer = Buffer.from(data);
      readableLogger.debug(`Received ${messageBuffer.toString()}`);
      if (messageBuffer.byteLength === 0) {
        readableLogger.debug('Null message received');
        this.webSocket.off('message', this.messageHandler);
        if (!this._readableEnded) {
          readableLogger.debug('Closing');
          this.signalReadableEnd();
          this.readableController!.close();
          if (this._writableEnded && !this._webSocketEnded) {
            readableLogger.debug('Ending socket');
            this.signalWebSocketEnd();
            this.webSocket.close();
          }
        }
        return;
      }
      this.readableController!.enqueue(messageBuffer);
      if (
        this.readableController!.desiredSize != null &&
        this.readableController!.desiredSize < 0
      ) {
        this.webSocket.pause();
      }
    };
    this.readable = new ReadableStream<Uint8Array>(
      {
        start: (controller) => {
          this.readableController = controller;
          this.webSocket.on('message', this.messageHandler);
        },
        pull: () => {
          this.webSocket.resume();
        },
        cancel: (reason) => {
          this.webSocket.off('message', this.messageHandler);
          this.signalReadableEnd(reason);
          if (this._writableEnded && !this._webSocketEnded) {
            readableLogger.debug('Ending socket');
            this.signalWebSocketEnd();
            this.webSocket.close();
          }
        },
      },
      {
        highWaterMark: 1,
      },
    );

    const pingTimer = setInterval(() => {
      this.webSocket.ping();
    }, pingInterval);
    const pingTimeoutTimeTimer = setTimeout(() => {
      logger.debug('Ping timed out');
      this.webSocket.close();
    }, pingTimeoutTime);
    const pongHandler = (data: Buffer) => {
      logger.debug(`Received pong with (${data.toString()})`);
      pingTimeoutTimeTimer.refresh();
    };
    this.webSocket.on('pong', pongHandler);

    const closeHandler = () => {
      logger.debug('Closing');
      this.signalWebSocketEnd();
      // Cleaning up timers
      logger.debug('Cleaning up timers');
      clearTimeout(pingTimer);
      clearTimeout(pingTimeoutTimeTimer);
      // Closing streams
      logger.debug('Cleaning streams');
      this.webSocket.off('message', this.messageHandler);
      const err = new webSocketErrors.ErrorServerConnectionEndedEarly();
      if (!this._readableEnded) {
        readableLogger.debug('Closing');
        this.signalReadableEnd(err);
        this.webSocket.off('message', this.messageHandler);
        this.readableController?.error(err);
      }
      if (!this._writableEnded) {
        writableLogger.debug('Closing');
        this.signalWritableEnd(err);
        this.writableController?.error(err);
      }
    };
    this.webSocket.once('close', closeHandler);
  }

  get meta(): Record<string, JSONValue> {
    return {
      ...this.metadata,
    };
  }

  cancel(reason?: any): void {
    // Default error
    const err = reason ?? new webSocketErrors.ErrorClientConnectionEndedEarly();
    // Close the streams with the given error,
    if (!this._readableEnded) {
      this.webSocket.off('message', this.messageHandler);
      this.readableController?.error(err);
      this.signalReadableEnd(err);
    }
    if (!this._writableEnded) {
      this.writableController?.error(err);
      this.signalWritableEnd(err);
    }
    // Then close the websocket
    if (!this._webSocketEnded) {
      this.webSocket.terminate();
      this.signalWebSocketEnd(err);
    }
  }
}

export default WebSocketServer;
