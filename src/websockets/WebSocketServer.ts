import type {
  ReadableStreamController,
  WritableStreamDefaultController,
} from 'stream/web';
import type { FileSystem, JSONValue, PromiseDeconstructed } from 'types';
import type { Host, Port, TLSConfig } from 'network/types';
import type {
  HttpRequest,
  HttpResponse,
  us_socket_context_t,
  WebSocket,
} from 'uWebSockets.js';
import { WritableStream, ReadableStream } from 'stream/web';
import path from 'path';
import os from 'os';
import { startStop } from '@matrixai/async-init';
import Logger from '@matrixai/logger';
import uWebsocket from 'uWebSockets.js';
import WebSocketStream from './WebSocketStream';
import * as webSocketErrors from './errors';
import * as webSocketEvents from './events';
import { promise } from '../utils';

type ConnectionCallback = (streamPair: WebSocketStream) => void;

type Context = {
  message: (
    ws: WebSocket<any>,
    message: ArrayBuffer,
    isBinary: boolean,
  ) => void;
  drain: (ws: WebSocket<any>) => void;
  close: (ws: WebSocket<any>, code: number, message: ArrayBuffer) => void;
  pong: (ws: WebSocket<any>, message: ArrayBuffer) => void;
  logger: Logger;
};

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
   * @param obj.connectionIdleTimeoutTime - Timeout time for when the connection is cleaned up after no activity.
   * Default is 120 seconds.
   * @param obj.pingIntervalTime - Time between pings for checking connection health and keep alive.
   * Default is 1,000 milliseconds.
   * @param obj.pingTimeoutTime - Time before connection is cleaned up after no ping responses.
   * Default is 10,000 milliseconds.
   * @param obj.fs - FileSystem interface used for creating files.
   * @param obj.maxReadableStreamBytes - The number of bytes the readable stream will buffer until pausing.
   * @param obj.logger
   */
  static async createWebSocketServer({
    connectionCallback,
    tlsConfig,
    basePath,
    host,
    port,
    connectionIdleTimeoutTime = 120,
    pingIntervalTime = 1_000,
    pingTimeoutTime = 10_000,
    fs = require('fs'),
    maxReadableStreamBytes = 1_000_000_000, // About 1 GB
    logger = new Logger(this.name),
  }: {
    connectionCallback: ConnectionCallback;
    tlsConfig: TLSConfig;
    basePath?: string;
    host?: string;
    port?: number;
    connectionIdleTimeoutTime?: number;
    pingIntervalTime?: number;
    pingTimeoutTime?: number;
    fs?: FileSystem;
    maxReadableStreamBytes?: number;
    logger?: Logger;
  }) {
    logger.info(`Creating ${this.name}`);
    const wsServer = new this(
      logger,
      fs,
      maxReadableStreamBytes,
      connectionIdleTimeoutTime,
      pingIntervalTime,
      pingTimeoutTime,
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

  protected server: uWebsocket.TemplatedApp;
  protected listenSocket: uWebsocket.us_listen_socket;
  protected _port: number;
  protected _host: string;
  protected connectionEventHandler: (
    event: webSocketEvents.ConnectionEvent,
  ) => void;
  protected activeSockets: Set<WebSocketStream> = new Set();
  protected connectionIndex: number = 0;

  /**
   *
   * @param logger
   * @param fs
   * @param maxReadableStreamBytes Max number of bytes stored in read buffer before error
   * @param connectionIdleTimeoutTime
   * @param pingIntervalTime
   * @param pingTimeoutTime
   */
  constructor(
    protected logger: Logger,
    protected fs: FileSystem,
    protected maxReadableStreamBytes,
    protected connectionIdleTimeoutTime: number | undefined,
    protected pingIntervalTime: number,
    protected pingTimeoutTime: number,
  ) {
    super();
  }

  public async start({
    tlsConfig,
    basePath = os.tmpdir(),
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
    await this.setupServer(basePath, tlsConfig);
    this.server.ws('/*', {
      sendPingsAutomatically: true,
      idleTimeout: this.connectionIdleTimeoutTime,
      upgrade: this.upgrade,
      open: this.open,
      message: this.message,
      close: this.close,
      drain: this.drain,
      pong: this.pong,
      // Ping uses default behaviour.
      // We don't use subscriptions.
    });
    this.server.any('/*', (res, _) => {
      // Reject normal requests with an upgrade code
      res
        .writeStatus('426')
        .writeHeader('connection', 'Upgrade')
        .writeHeader('upgrade', 'websocket')
        .end('426 Upgrade Required', true);
    });
    const listenProm = promise<void>();
    const listenCallback = (listenSocket) => {
      if (listenSocket) {
        this.listenSocket = listenSocket;
        listenProm.resolveP();
      } else {
        listenProm.rejectP(new webSocketErrors.ErrorServerPortUnavailable());
      }
    };
    if (host != null) {
      // With custom host
      this.server.listen(host, port ?? 0, listenCallback);
    } else {
      // With default host
      this.server.listen(port, listenCallback);
    }
    await listenProm.p;
    this._port = uWebsocket.us_socket_local_port(this.listenSocket);
    this.logger.debug(`Listening on port ${this._port}`);
    this._host = host ?? '127.0.0.1';
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
    // Close the server by closing the underlying socket
    uWebsocket.us_listen_socket_close(this.listenSocket);
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
    if (this.connectionEventHandler != null) {
      this.removeEventListener('connection', this.connectionEventHandler);
    }
    this.dispatchEvent(new webSocketEvents.StopEvent());
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  @startStop.ready(new webSocketErrors.ErrorWebSocketServerNotRunning())
  public getPort(): Port {
    return this._port as Port;
  }

  @startStop.ready(new webSocketErrors.ErrorWebSocketServerNotRunning())
  public getHost(): Host {
    return this._host as Host;
  }

  /**
   * This creates the pem files and starts the server with them. It ensures that
   * files are cleaned up to the best of its ability.
   */
  protected async setupServer(basePath: string, tlsConfig: TLSConfig) {
    const tmpDir = await this.fs.promises.mkdtemp(
      path.join(basePath, 'polykey-'),
    );
    // TODO: The key file needs to be in the encrypted format
    const keyFile = path.join(tmpDir, 'keyFile.pem');
    const certFile = path.join(tmpDir, 'certFile.pem');
    await this.fs.promises.writeFile(keyFile, tlsConfig.keyPrivatePem);
    await this.fs.promises.writeFile(certFile, tlsConfig.certChainPem);
    try {
      this.server = uWebsocket.SSLApp({
        key_file_name: keyFile,
        cert_file_name: certFile,
      });
    } finally {
      await this.fs.promises.rm(keyFile);
      await this.fs.promises.rm(certFile);
      await this.fs.promises.rm(tmpDir, { recursive: true, force: true });
    }
  }

  /**
   * Applies default upgrade behaviour and creates a UserData object we can
   * mutate for the Context
   */
  protected upgrade = (
    res: HttpResponse,
    req: HttpRequest,
    context: us_socket_context_t,
  ) => {
    const logger = this.logger.getChild(`Connection ${this.connectionIndex}`);
    res.upgrade<Partial<Context>>(
      {
        logger,
      },
      req.getHeader('sec-websocket-key'),
      req.getHeader('sec-websocket-protocol'),
      req.getHeader('sec-websocket-extensions'),
      context,
    );
    this.connectionIndex += 1;
  };

  /**
   * Handles the creation of the `ReadableWritablePair` and provides it to the
   * StreamPair handler.
   */
  protected open = (ws: WebSocket<Context>) => {
    const webSocketStream = new WebSocketStreamServerInternal(
      ws,
      this.maxReadableStreamBytes,
      this.pingIntervalTime,
      this.pingTimeoutTime,
      {}, // TODO: fill in connection metadata
    );
    // Adding socket to the active sockets map
    this.activeSockets.add(webSocketStream);
    webSocketStream.endedProm
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
   * Routes incoming messages to each stream using the `Context` message
   * callback.
   */
  protected message = (
    ws: WebSocket<Context>,
    message: ArrayBuffer,
    isBinary: boolean,
  ) => {
    ws.getUserData().message(ws, message, isBinary);
  };

  protected drain = (ws: WebSocket<Context>) => {
    ws.getUserData().drain(ws);
  };

  protected close = (
    ws: WebSocket<Context>,
    code: number,
    message: ArrayBuffer,
  ) => {
    ws.getUserData().close(ws, code, message);
  };

  protected pong = (ws: WebSocket<Context>, message: ArrayBuffer) => {
    ws.getUserData().pong(ws, message);
  };
}

class WebSocketStreamServerInternal extends WebSocketStream {
  protected backPressure: PromiseDeconstructed<void> | null = null;
  protected writeBackpressure: boolean = false;
  protected writableController: WritableStreamDefaultController | undefined;
  protected readableController:
    | ReadableStreamController<Uint8Array>
    | undefined;

  constructor(
    protected ws: WebSocket<Context>,
    maxReadBufferBytes: number,
    pingInterval: number,
    pingTimeout: number,
    protected metadata: Record<string, JSONValue>,
  ) {
    super();
    const context = ws.getUserData();
    const logger = context.logger;
    logger.info('WS opened');
    const writableLogger = logger.getChild('Writable');
    const readableLogger = logger.getChild('Readable');
    // Setting up the writable stream
    this.writable = new WritableStream<Uint8Array>({
      start: (controller) => {
        this.writableController = controller;
      },
      write: async (chunk, controller) => {
        await this.backPressure?.p;
        const writeResult = ws.send(chunk, true);
        switch (writeResult) {
          default:
          case 2:
            // Write failure, emit error
            writableLogger.error('Send error');
            controller.error(new webSocketErrors.ErrorServerSendFailed());
            break;
          case 0:
            writableLogger.info('Write backpressure');
            // Signal backpressure
            this.backPressure = promise();
            this.writeBackpressure = true;
            this.backPressure.p.finally(() => {
              this.writeBackpressure = false;
            });
            break;
          case 1:
            // Success
            writableLogger.debug(`Sending ${Buffer.from(chunk).toString()}`);
            break;
        }
      },
      close: () => {
        writableLogger.info('Closed, sending null message');
        if (!this._webSocketEnded) ws.send(Buffer.from([]), true);
        this.signalWritableEnd();
        if (this._readableEnded && !this._webSocketEnded) {
          writableLogger.debug('Ending socket');
          this.signalWebSocketEnd();
          ws.end();
        }
      },
      abort: (reason) => {
        writableLogger.info('Aborted');
        if (this._readableEnded && !this._webSocketEnded) {
          writableLogger.debug('Ending socket');
          this.signalWebSocketEnd(reason);
          ws.end(4001, 'ABORTED');
        }
      },
    });
    // Setting up the readable stream
    this.readable = new ReadableStream<Uint8Array>(
      {
        start: (controller) => {
          this.readableController = controller;
          context.message = (ws, message, _) => {
            const messageBuffer = Buffer.from(message);
            readableLogger.debug(`Received ${messageBuffer.toString()}`);
            if (message.byteLength === 0) {
              readableLogger.debug('Null message received');
              if (!this._readableEnded) {
                readableLogger.debug('Closing');
                this.signalReadableEnd();
                controller.close();
                if (this._writableEnded && !this._webSocketEnded) {
                  readableLogger.debug('Ending socket');
                  this.signalWebSocketEnd();
                  ws.end();
                }
              }
              return;
            }
            controller.enqueue(messageBuffer);
            if (controller.desiredSize != null && controller.desiredSize < 0) {
              readableLogger.error('Read stream buffer full');
              const err = new webSocketErrors.ErrorServerReadableBufferLimit();
              if (!this._webSocketEnded) {
                this.signalWebSocketEnd(err);
                ws.end(4001, 'Read stream buffer full');
              }
              controller.error(err);
            }
          };
        },
        cancel: (reason) => {
          this.signalReadableEnd(reason);
          if (this._writableEnded && !this._webSocketEnded) {
            readableLogger.debug('Ending socket');
            this.signalWebSocketEnd();
            ws.end();
          }
        },
      },
      {
        highWaterMark: maxReadBufferBytes,
        size: (chunk) => chunk?.byteLength ?? 0,
      },
    );

    const pingTimer = setInterval(() => {
      ws.ping();
    }, pingInterval);
    const pingTimeoutTimer = setTimeout(() => {
      logger.debug('Ping timed out');
      ws.end();
    }, pingTimeout);
    context.pong = () => {
      logger.debug('Received pong');
      pingTimeoutTimer.refresh();
    };
    context.close = () => {
      logger.debug('Closing');
      this.signalWebSocketEnd();
      // Cleaning up timers
      logger.debug('Cleaning up timers');
      clearTimeout(pingTimer);
      clearTimeout(pingTimeoutTimer);
      // Closing streams
      logger.debug('Cleaning streams');
      const err = new webSocketErrors.ErrorServerConnectionEndedEarly();
      if (!this._readableEnded) {
        readableLogger.debug('Closing');
        this.signalReadableEnd(err);
        this.readableController?.error(err);
      }
      if (!this._writableEnded) {
        writableLogger.debug('Closing');
        this.signalWritableEnd(err);
        this.writableController?.error(err);
      }
    };
    context.drain = () => {
      logger.debug('Drained');
      this.backPressure?.resolveP();
    };
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
      this.readableController?.error(err);
      this.signalReadableEnd(err);
    }
    if (!this._writableEnded) {
      this.writableController?.error(err);
      this.signalWritableEnd(err);
    }
    // Then close the websocket
    if (!this._webSocketEnded) {
      this.ws.end(4001, 'Ending connection');
      this.signalWebSocketEnd(err);
    }
  }
}

export default WebSocketServer;
