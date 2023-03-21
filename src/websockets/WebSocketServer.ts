import type {
  ReadableStreamController,
  ReadableWritablePair,
  WritableStreamDefaultController,
} from 'stream/web';
import type { FileSystem, PromiseDeconstructed } from 'types';
import type { Host, Port, TLSConfig } from 'network/types';
import type {
  HttpRequest,
  HttpResponse,
  us_socket_context_t,
  WebSocket,
} from 'uWebSockets.js';
import type { ConnectionInfo } from '../rpc/types';
import { WritableStream, ReadableStream } from 'stream/web';
import path from 'path';
import os from 'os';
import { startStop } from '@matrixai/async-init';
import Logger from '@matrixai/logger';
import uWebsocket from 'uWebSockets.js';
import WebSocketStream from './WebSocketStream';
import * as clientRPCErrors from './errors';
import * as webSocketEvents from './events';
import { promise } from '../utils';

type ConnectionCallback = (
  streamPair: ReadableWritablePair<Uint8Array, Uint8Array>,
  connectionInfo: ConnectionInfo,
) => void;

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
  static async createWebSocketServer({
    connectionCallback,
    tlsConfig,
    basePath,
    host,
    port,
    idleTimeout,
    pingInterval = 1000,
    pingTimeout = 10000,
    fs = require('fs'),
    maxReadBufferBytes = 1_000_000_000, // About 1 GB
    logger = new Logger(this.name),
  }: {
    connectionCallback: ConnectionCallback;
    tlsConfig: TLSConfig;
    basePath?: string;
    host?: string;
    port?: number;
    idleTimeout?: number;
    pingInterval?: number;
    pingTimeout?: number;
    fs?: FileSystem;
    maxReadBufferBytes?: number;
    logger?: Logger;
  }) {
    logger.info(`Creating ${this.name}`);
    const wsServer = new this(
      logger,
      fs,
      maxReadBufferBytes,
      idleTimeout,
      pingInterval,
      pingTimeout,
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
   * @param maxReadBufferBytes Max number of bytes stored in read buffer before error
   * @param idleTimeout
   * @param pingInterval
   * @param pingTimeout
   */
  constructor(
    protected logger: Logger,
    protected fs: FileSystem,
    protected maxReadBufferBytes,
    protected idleTimeout: number | undefined,
    protected pingInterval: number,
    protected pingTimeout: number,
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
        connectionCallback(
          event.detail.webSocketStream,
          event.detail.connectionInfo,
        );
      };
      this.addEventListener('connection', this.connectionEventHandler);
    }
    await this.setupServer(basePath, tlsConfig);
    this.server.ws('/*', {
      sendPingsAutomatically: true,
      idleTimeout: this.idleTimeout,
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
        listenProm.rejectP(new clientRPCErrors.ErrorServerPortUnavailable());
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
    this.logger.debug(
      `Listening on port ${uWebsocket.us_socket_local_port(this.listenSocket)}`,
    );
    this._host = host ?? '127.0.0.1';
    this.dispatchEvent(
      new webSocketEvents.StartEvent({
        detail: {
          host: this._host,
          port: this.port,
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
        webSocketStream.end();
      }
    }
    // Wait for all active websockets to close
    for (const webSocketStream of this.activeSockets) {
      webSocketStream.endedProm.catch(() => {}); // Ignore errors
    }
    if (this.connectionEventHandler != null) {
      this.removeEventListener('connection', this.connectionEventHandler);
    }
    this.dispatchEvent(new webSocketEvents.StopEvent());
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  get port(): Port {
    return uWebsocket.us_socket_local_port(this.listenSocket) as Port;
  }

  get host(): Host {
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
      this.maxReadBufferBytes,
      this.pingInterval,
      this.pingTimeout,
    );
    // Adding socket to the active sockets map
    this.activeSockets.add(webSocketStream);
    webSocketStream.endedProm
      .catch(() => {}) // Ignore errors here
      .finally(() => {
        this.activeSockets.delete(webSocketStream);
      });

    // There is not nodeId or certs for the client, and we can't get the remote
    //  port from the `uWebsocket` library.
    const connectionInfo: ConnectionInfo = {
      remoteHost: Buffer.from(ws.getRemoteAddressAsText()).toString(),
      localHost: this._host,
      localPort: this.port,
    };
    this.dispatchEvent(
      new webSocketEvents.ConnectionEvent({
        detail: {
          webSocketStream,
          connectionInfo,
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

  constructor(
    protected ws: WebSocket<Context>,
    maxReadBufferBytes: number,
    pingInterval: number,
    pingTimeout: number,
  ) {
    super();
    const context = ws.getUserData();
    const logger = context.logger;
    logger.info('WS opened');
    let writableController: WritableStreamDefaultController | undefined;
    let readableController: ReadableStreamController<Uint8Array> | undefined;
    const writableLogger = logger.getChild('Writable');
    const readableLogger = logger.getChild('Readable');
    // Setting up the writable stream
    this.writable = new WritableStream<Uint8Array>({
      start: (controller) => {
        writableController = controller;
      },
      write: async (chunk, controller) => {
        await this.backPressure?.p;
        const writeResult = ws.send(chunk, true);
        switch (writeResult) {
          default:
          case 2:
            // Write failure, emit error
            writableLogger.error('Send error');
            controller.error(new clientRPCErrors.ErrorServerSendFailed());
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
        if (!this.webSocketEnded_) ws.send(Buffer.from([]), true);
        this.signalWritableEnd();
        if (this.readableEnded_ && !this.webSocketEnded_) {
          writableLogger.debug('Ending socket');
          this.signalWebSocketEnd();
          ws.end();
        }
      },
      abort: () => {
        writableLogger.info('Aborted');
        if (this.readableEnded_ && !this.webSocketEnded_) {
          writableLogger.debug('Ending socket');
          this.signalWebSocketEnd(Error('TMP ERROR ABORTED'));
          ws.end(4001, 'ABORTED');
        }
      },
    });
    // Setting up the readable stream
    this.readable = new ReadableStream<Uint8Array>(
      {
        start: (controller) => {
          readableController = controller;
          context.message = (ws, message, _) => {
            const messageBuffer = Buffer.from(message);
            readableLogger.debug(`Received ${messageBuffer.toString()}`);
            if (message.byteLength === 0) {
              readableLogger.debug('Null message received');
              if (!this.readableEnded_) {
                readableLogger.debug('Closing');
                this.signalReadableEnd();
                controller.close();
                if (this.writableEnded_ && !this.webSocketEnded_) {
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
              const err = new clientRPCErrors.ErrorServerReadableBufferLimit();
              if (!this.webSocketEnded_) {
                this.signalWebSocketEnd(err);
                ws.end(4001, 'Read stream buffer full');
              }
              controller.error(err);
            }
          };
        },
        cancel: () => {
          this.signalReadableEnd(Error('TMP READABLE CANCELLED'));
          if (this.writableEnded_ && !this.webSocketEnded_) {
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
      const err = new clientRPCErrors.ErrorServerConnectionEndedEarly();
      if (!this.readableEnded_) {
        readableLogger.debug('Closing');
        this.signalReadableEnd(err);
        readableController?.error(err);
      }
      if (!this.writableEnded_) {
        writableLogger.debug('Closing');
        this.signalWritableEnd(err);
        writableController?.error(err);
      }
    };
    context.drain = () => {
      logger.debug('Drained');
      this.backPressure?.resolveP();
    };
  }

  end(): void {
    this.ws.end(4001, 'TMP ENDING CONNECTION');
  }
}

export default WebSocketServer;
