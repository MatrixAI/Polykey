import type {
  ReadableStreamController,
  ReadableWritablePair,
  WritableStreamDefaultController,
} from 'stream/web';
import type { FileSystem, PromiseDeconstructed } from 'types';
import type { TLSConfig } from 'network/types';
import type { WebSocket } from 'uWebSockets.js';
import { WritableStream, ReadableStream } from 'stream/web';
import path from 'path';
import os from 'os';
import { startStop } from '@matrixai/async-init';
import Logger from '@matrixai/logger';
import uWebsocket from 'uWebSockets.js';
import { promise } from '../utils';

type ConnectionCallback = (
  streamPair: ReadableWritablePair<Uint8Array, Uint8Array>,
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

interface ClientServer extends startStop.StartStop {}
@startStop.StartStop()
class ClientServer {
  static async createClientServer({
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
    port,
  }: {
    connectionCallback: ConnectionCallback;
    tlsConfig: TLSConfig;
    basePath?: string;
    host?: string;
    port?: number;
  }): Promise<void> {
    this.logger.info(`Starting ${this.constructor.name}`);
    this.connectionCallback = connectionCallback;
    // TODO: take a TLS config, write the files in the temp directory and
    //  load them.
    let count = 0;
    const tmpDir = await this.fs.promises.mkdtemp(
      path.join(basePath, 'polykey-'),
    );
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
      upgrade: (res, req, context) => {
        const logger = this.logger.getChild(`Connection ${count}`);
        res.upgrade<Partial<Context>>(
          {
            logger,
          },
          req.getHeader('sec-websocket-key'),
          req.getHeader('sec-websocket-protocol'),
          req.getHeader('sec-websocket-extensions'),
          context,
        );
        count += 1;
      },
      open: (ws: WebSocket<Context>) => {
        if (this.waitForActive == null) this.waitForActive = promise();
        this.activeSockets.add(ws);
        // Set up streams and context
        this.handleOpen(ws);
      },
      // TODO: could this take an async and apply backpressure implicitly?
      message: async (ws: WebSocket<Context>, message, isBinary) => {
        ws.getUserData().message(ws, message, isBinary);
      },
      close: (ws, code, message) => {
        this.activeSockets.delete(ws);
        if (this.activeSockets.size === 0) this.waitForActive?.resolveP();
        ws.getUserData().close(ws, code, message);
      },
      drain: (ws) => {
        ws.getUserData().drain(ws);
      },
    });
    const listenProm = promise<void>();
    if (host != null) {
      // With custom host
      this.server.any('/*', (res, _) => {
        res
          .writeStatus('426')
          .writeHeader('connection', 'Upgrade')
          .writeHeader('upgrade', 'websocket')
          .end('426 Upgrade Required', true);
      });
      this.server.listen(host, port ?? 0, (listenSocket) => {
        if (listenSocket) {
          this.listenSocket = listenSocket;
          listenProm.resolveP();
        } else {
          listenProm.rejectP(Error('TMP, no port'));
        }
      });
    } else {
      // With default host
      this.server.listen(port ?? 0, (listenSocket) => {
        if (listenSocket) {
          this.listenSocket = listenSocket;
          listenProm.resolveP();
        } else {
          listenProm.rejectP(Error('TMP, no port'));
        }
      });
    }
    await listenProm.p;
    this.logger.debug(
      `bound to port ${uWebsocket.us_socket_local_port(this.listenSocket)}`,
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

  protected handleOpen(ws: WebSocket<Context>) {
    const context = ws.getUserData();
    const logger = context.logger;
    logger.info('WS opened');
    let writableClosed = false;
    let readableClosed = false;
    let wsClosed = false;
    let backpressure: PromiseDeconstructed<void> | null = null;
    let writableController: WritableStreamDefaultController | undefined;
    let readableController: ReadableStreamController<Uint8Array> | undefined;
    // Setting up the writable stream
    const writableStream = new WritableStream<Uint8Array>({
      start: (controller) => {
        writableController = controller;
      },
      write: async (chunk, controller) => {
        // Logger.debug(`WRITABLE WRITE ${chunk.toString()}`);
        await backpressure?.p;
        const writeResult = ws.send(chunk, true);
        switch (writeResult) {
          default:
          case 2:
            // Write failure, emit error
            controller.error(Error('TMP Failed to write'));
            break;
          case 0:
            logger.info('Write backpressure');
            // Signal backpressure
            backpressure = promise();
            context.writeBackpressure = true;
            backpressure.p.finally(() => {
              context.writeBackpressure = false;
            });
            break;
          case 1:
            // Success
            break;
        }
      },
      close: () => {
        logger.info('WRITABLE CLOSE');
        if (!wsClosed) ws.send(Buffer.from([]), true);
        writableClosed = true;
        if (readableClosed && !wsClosed) {
          logger.debug('ENDING WS');
          ws.end();
        }
      },
      abort: () => {
        logger.info('WRITABLE ABORT');
        if (readableClosed && !wsClosed) {
          logger.debug('ENDING WS');
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
            // Logger.debug(`MESSAGE CALLED ${message.toString()}`);
            if (message.byteLength === 0) {
              logger.debug('NULL MESSAGE, CLOSING');
              if (!readableClosed) {
                logger.debug('CLOSING READABLE');
                controller.close();
                readableClosed = true;
                if (writableClosed && !wsClosed) {
                  ws.end();
                }
              }
              return;
            }
            controller.enqueue(Buffer.from(message));
            if (
              controller.desiredSize != null &&
              controller.desiredSize < -1000
            ) {
              logger.error('Read stream buffer full');
              const err = Error('TMP read buffer limit');
              if (!wsClosed) ws.end(4001, err.toString());
              controller.error(err);
            }
          };
        },
        cancel: () => {
          readableClosed = true;
          if (writableClosed && !wsClosed) {
            logger.debug('ENDING WS');
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
      logger.debug('ping timed out');
      ws.end();
    }, this.pingTimeout);
    context.pong = () => {
      logger.debug('received pong');
      pingTimeoutTimer.refresh();
    };
    context.close = () => {
      logger.debug('CLOSING CALLED');
      wsClosed = true;
      // Cleaning up timers
      logger.debug('Cleaning up timers');
      clearTimeout(pingTimer);
      clearTimeout(pingTimeoutTimer);
      // Closing streams
      logger.debug('cleaning streams');
      if (!readableClosed) {
        logger.debug('CLOSING READABLE');
        readableController?.error(Error('TMP Web stream closed early SR'));
        readableClosed = true;
      }
      if (!writableClosed) {
        logger.debug('CLOSING Writable');
        writableController?.error(Error('TMP Web stream closed early SW'));
        writableClosed = true;
      }
    };
    context.drain = () => {
      logger.debug('DRAINING CALLED');
      backpressure?.resolveP();
    };

    logger.info('callback');
    try {
      this.connectionCallback({
        readable: readableStream,
        writable: writableStream,
      });
    } catch (e) {
      context.close(ws, 0, Buffer.from(''));
      logger.error(e.toString());
    }
  }
}

export default ClientServer;
