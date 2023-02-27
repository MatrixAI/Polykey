import type {
  ReadableStreamController,
  ReadableWritablePair,
  WritableStreamDefaultController,
} from 'stream/web';
import type { FileSystem, PromiseDeconstructed } from 'types';
import type { TLSConfig } from 'network/types';
import type {
  HttpRequest,
  HttpResponse,
  us_socket_context_t,
  WebSocket,
} from 'uWebSockets.js';
import type { ConnectionInfo } from '../RPC/types';
import { WritableStream, ReadableStream } from 'stream/web';
import path from 'path';
import os from 'os';
import { startStop } from '@matrixai/async-init';
import Logger from '@matrixai/logger';
import uWebsocket from 'uWebSockets.js';
import * as clientRPCErrors from './errors';
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
  writeBackpressure: boolean;
};

interface WebSocketServer extends startStop.StartStop {}
@startStop.StartStop()
class WebSocketServer {
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
  protected host: string;
  protected connectionCallback: ConnectionCallback;
  protected activeSockets: Set<WebSocket<any>> = new Set();
  protected waitForActive: PromiseDeconstructed<void> | null = null;
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
  ) {}

  public async start({
    connectionCallback,
    tlsConfig,
    basePath = os.tmpdir(),
    host,
    port = 0,
  }: {
    connectionCallback: ConnectionCallback;
    tlsConfig: TLSConfig;
    basePath?: string;
    host?: string;
    port?: number;
  }): Promise<void> {
    this.logger.info(`Starting ${this.constructor.name}`);
    this.connectionCallback = connectionCallback;
    const tmpDir = await this.fs.promises.mkdtemp(
      path.join(basePath, 'polykey-'),
    );
    // TODO: The key file needs to be in the encrypted format
    const keyFile = path.join(tmpDir, 'keyFile.pem');
    const certFile = path.join(tmpDir, 'certFile.pem');
    await this.fs.promises.writeFile(keyFile, tlsConfig.keyPrivatePem);
    await this.fs.promises.writeFile(certFile, tlsConfig.certChainPem);
    this.server = uWebsocket.SSLApp({
      key_file_name: keyFile,
      cert_file_name: certFile,
    });
    await this.fs.promises.rm(keyFile);
    await this.fs.promises.rm(certFile);
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
    this.host = host ?? '127.0.0.1';
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop(force: boolean = false): Promise<void> {
    this.logger.info(`Stopping ${this.constructor.name}`);
    // Close the server by closing the underlying socket
    uWebsocket.us_listen_socket_close(this.listenSocket);
    // Shutting down active websockets
    if (force) {
      for (const ws of this.activeSockets) {
        ws.end();
      }
    }
    // Wait for all active websockets to close
    await this.waitForActive?.p;
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  get port() {
    return uWebsocket.us_socket_local_port(this.listenSocket);
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
    if (this.waitForActive == null) this.waitForActive = promise();
    // Adding socket to the active sockets map
    this.activeSockets.add(ws);

    const context = ws.getUserData();
    const logger = context.logger;
    logger.info('WS opened');
    let writableClosed = false;
    let readableClosed = false;
    let wsClosed = false;
    let backpressure: PromiseDeconstructed<void> | null = null;
    let writableController: WritableStreamDefaultController | undefined;
    let readableController: ReadableStreamController<Uint8Array> | undefined;
    const writableLogger = logger.getChild('Writable');
    const readableLogger = logger.getChild('Readable');
    // Setting up the writable stream
    const writableStream = new WritableStream<Uint8Array>({
      start: (controller) => {
        writableController = controller;
      },
      write: async (chunk, controller) => {
        await backpressure?.p;
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
            backpressure = promise();
            context.writeBackpressure = true;
            backpressure.p.finally(() => {
              context.writeBackpressure = false;
            });
            break;
          case 1:
            // Success
            writableLogger.debug(`Sending ${chunk.toString()}`);
            break;
        }
      },
      close: () => {
        writableLogger.info('Closed, sending null message');
        if (!wsClosed) ws.send(Buffer.from([]), true);
        writableClosed = true;
        if (readableClosed && !wsClosed) {
          writableLogger.debug('Ending socket');
          ws.end();
        }
      },
      abort: () => {
        writableLogger.info('Aborted');
        if (readableClosed && !wsClosed) {
          writableLogger.debug('Ending socket');
          ws.end();
        }
      },
    });
    // Setting up the readable stream
    const readableStream = new ReadableStream<Uint8Array>(
      {
        start: (controller) => {
          readableController = controller;
          context.message = (ws, message, _) => {
            readableLogger.debug(`Received ${message.toString()}`);
            if (message.byteLength === 0) {
              readableLogger.debug('Null message received');
              if (!readableClosed) {
                readableClosed = true;
                readableLogger.debug('Closing');
                controller.close();
                if (writableClosed && !wsClosed) {
                  readableLogger.debug('Ending socket');
                  ws.end();
                }
              }
              return;
            }
            controller.enqueue(Buffer.from(message));
            if (controller.desiredSize != null && controller.desiredSize < 0) {
              readableLogger.error('Read stream buffer full');
              if (!wsClosed) ws.end(4001, 'Read stream buffer full');
              controller.error(
                new clientRPCErrors.ErrorServerReadableBufferLimit(),
              );
            }
          };
        },
        cancel: () => {
          readableClosed = true;
          if (writableClosed && !wsClosed) {
            readableLogger.debug('Ending socket');
            ws.end();
          }
        },
      },
      {
        highWaterMark: this.maxReadBufferBytes,
        size: (chunk) => chunk?.byteLength ?? 0,
      },
    );

    const pingTimer = setInterval(() => {
      ws.ping();
    }, this.pingInterval);
    const pingTimeoutTimer = setTimeout(() => {
      logger.debug('Ping timed out');
      ws.end();
    }, this.pingTimeout);
    context.pong = () => {
      logger.debug('Received pong');
      pingTimeoutTimer.refresh();
    };
    context.close = () => {
      logger.debug('Closing');
      wsClosed = true;
      // Cleaning up timers
      logger.debug('Cleaning up timers');
      clearTimeout(pingTimer);
      clearTimeout(pingTimeoutTimer);
      // Closing streams
      logger.debug('Cleaning streams');
      if (!readableClosed) {
        readableClosed = true;
        readableLogger.debug('Closing');
        readableController?.error(
          new clientRPCErrors.ErrorServerConnectionEndedEarly(),
        );
      }
      if (!writableClosed) {
        writableClosed = true;
        writableLogger.debug('Closing');
        writableController?.error(
          new clientRPCErrors.ErrorServerConnectionEndedEarly(),
        );
      }
    };
    context.drain = () => {
      logger.debug('Drained');
      backpressure?.resolveP();
    };
    logger.debug('Calling handler callback');
    // There is not nodeId or certs for the client, and we can't get the remote
    //  port from the `uWebsocket` library.
    const connectionInfo: ConnectionInfo = {
      remoteHost: Buffer.from(ws.getRemoteAddressAsText()).toString(),
      localHost: this.host,
      localPort: this.port,
    };
    try {
      this.connectionCallback(
        {
          readable: readableStream,
          writable: writableStream,
        },
        connectionInfo,
      );
    } catch (e) {
      context.close(ws, 0, Buffer.from(''));
      logger.error(e.toString());
    }
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
    this.activeSockets.delete(ws);
    if (this.activeSockets.size === 0) this.waitForActive?.resolveP();
    ws.getUserData().close(ws, code, message);
  };

  protected pong = (ws: WebSocket<Context>, message: ArrayBuffer) => {
    ws.getUserData().pong(ws, message);
  };
}

export default WebSocketServer;
