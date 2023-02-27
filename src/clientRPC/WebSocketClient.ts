import type { TLSSocket } from 'tls';
import type { NodeId } from 'ids/index';
import { WritableStream, ReadableStream } from 'stream/web';
import { createDestroy } from '@matrixai/async-init';
import Logger from '@matrixai/logger';
import WebSocket from 'ws';
import { Timer } from '@matrixai/timer';
import { Validator } from 'ip-num';
import WebSocketStream from './WebSocketStream';
import * as clientRpcUtils from './utils';
import * as clientRPCErrors from './errors';
import { promise } from '../utils';

const timeoutSymbol = Symbol('TimedOutSymbol');

interface WebSocketClient extends createDestroy.CreateDestroy {}
@createDestroy.CreateDestroy()
class WebSocketClient {
  static async createWebSocketClient({
    host,
    port,
    expectedNodeIds,
    connectionTimeout,
    pingInterval = 1000,
    pingTimeout = 10000,
    maxReadableStreamBytes = 1000, // About 1kB
    logger = new Logger(this.name),
  }: {
    host: string;
    port: number;
    expectedNodeIds: Array<NodeId>;
    connectionTimeout?: number;
    pingInterval?: number;
    pingTimeout?: number;
    maxReadableStreamBytes?: number;
    logger?: Logger;
  }): Promise<WebSocketClient> {
    logger.info(`Creating ${this.name}`);
    const clientClient = new this(
      logger,
      host,
      port,
      maxReadableStreamBytes,
      expectedNodeIds,
      connectionTimeout,
      pingInterval,
      pingTimeout,
    );
    logger.info(`Created ${this.name}`);
    return clientClient;
  }

  protected host: string;
  protected activeConnections: Set<WebSocketStream> = new Set();

  constructor(
    protected logger: Logger,
    host: string,
    protected port: number,
    protected maxReadableStreamBytes: number,
    protected expectedNodeIds: Array<NodeId>,
    protected connectionTimeout: number | undefined,
    protected pingInterval: number,
    protected pingTimeout: number,
  ) {
    if (Validator.isValidIPv4String(host)[0]) {
      this.host = host;
    } else if (Validator.isValidIPv6String(host)[0]) {
      this.host = `[${host}]`;
    } else {
      throw new clientRPCErrors.ErrorClientInvalidHost();
    }
  }

  public async destroy(force: boolean = false) {
    this.logger.info(`Destroying ${this.constructor.name}`);
    if (force) {
      for (const activeConnection of this.activeConnections) {
        activeConnection.end();
      }
    }
    for (const activeConnection of this.activeConnections) {
      await activeConnection.endedProm.catch(() => {}); // Ignore errors here
    }
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  @createDestroy.ready(new clientRPCErrors.ErrorClientDestroyed())
  public async startConnection({
    timeoutTimer,
  }: {
    timeoutTimer?: Timer;
  } = {}): Promise<WebSocketStreamClientInternal> {
    // Use provided timer
    let timer: Timer<void> | undefined = timeoutTimer;
    // If no timer provided use provided default timeout
    if (timeoutTimer == null && this.connectionTimeout != null) {
      timer = new Timer({
        delay: this.connectionTimeout,
      });
    }
    const address = `wss://${this.host}:${this.port}`;
    this.logger.info(`Connecting to ${address}`);
    const connectProm = promise<void>();
    const authenticateProm = promise<NodeId>();
    const ws = new WebSocket(address, {
      rejectUnauthorized: false,
    });
    // Handle connection failure
    const openErrorHandler = (e) => {
      connectProm.rejectP(
        new clientRPCErrors.ErrorClientConnectionFailed(undefined, {
          cause: e,
        }),
      );
    };
    ws.once('error', openErrorHandler);
    // Authenticate server's certificates
    ws.once('upgrade', async (request) => {
      const tlsSocket = request.socket as TLSSocket;
      const peerCert = tlsSocket.getPeerCertificate(true);
      clientRpcUtils
        .verifyServerCertificateChain(
          this.expectedNodeIds,
          clientRpcUtils.detailedToCertChain(peerCert),
        )
        .then(authenticateProm.resolveP, authenticateProm.rejectP);
    });
    ws.once('open', () => {
      this.logger.info('starting connection');
      connectProm.resolveP();
    });
    const earlyCloseProm = promise();
    ws.once('close', () => {
      earlyCloseProm.resolveP();
    });
    // There are 3 resolve conditions here.
    //  1. Connection established and authenticated
    //  2. connection error or authentication failure
    //  3. connection timed out
    try {
      const result = await Promise.race([
        timer?.then(() => timeoutSymbol) ?? new Promise(() => {}),
        await Promise.all([authenticateProm.p, connectProm.p]),
      ]);
      if (result === timeoutSymbol) {
        throw new clientRPCErrors.ErrorClientConnectionTimedOut();
      }
    } catch (e) {
      // Clean up
      // unregister handlers
      ws.removeAllListeners('error');
      ws.removeAllListeners('upgrade');
      ws.removeAllListeners('open');
      // Close the ws if it's open at this stage
      ws.terminate();
      // Ensure the connection is removed from the active connection set before
      //  returning.
      await earlyCloseProm.p;
      throw e;
    }
    // Cleaning up connection error
    ws.removeEventListener('error', openErrorHandler);

    // Constructing the `ReadableWritablePair`, the lifecycle is handed off to
    //  the webSocketStream at this point.
    const webSocketStreamClient = new WebSocketStreamClientInternal(
      ws,
      this.maxReadableStreamBytes,
      this.pingInterval,
      this.pingTimeout,
      this.logger,
    );
    // Setting up activeStream map lifecycle
    this.activeConnections.add(webSocketStreamClient);
    void webSocketStreamClient.endedProm
      .catch(() => {}) // Ignore errors
      .finally(() => {
        this.activeConnections.delete(webSocketStreamClient);
      });
    return webSocketStreamClient;
  }
}

// This is the internal implementation of the client's stream pair.
class WebSocketStreamClientInternal extends WebSocketStream {
  constructor(
    protected ws: WebSocket,
    maxReadableStreamBytes: number,
    pingInterval: number,
    pingTimeout: number,
    logger: Logger,
  ) {
    super();
    const readableLogger = logger.getChild('readable');
    const writableLogger = logger.getChild('writable');
    this.readable = new ReadableStream<Uint8Array>(
      {
        start: (controller) => {
          readableLogger.info('Starting');
          const messageHandler = (data) => {
            readableLogger.debug(`Received ${data.toString()}`);
            if (controller.desiredSize == null) {
              controller.error(Error('NEVER'));
              return;
            }
            if (controller.desiredSize < 0) {
              readableLogger.debug('Applying readable backpressure');
              ws.pause();
            }
            const message = data as Buffer;
            if (message.length === 0) {
              readableLogger.debug('Null message received');
              ws.removeListener('message', messageHandler);
              if (!this.readableEnded) {
                this.endReadable();
                readableLogger.debug('Closing');
                controller.close();
              }
              if (this.writableEnded) {
                logger.debug('Closing socket');
                ws.close();
              }
              return;
            }
            controller.enqueue(message);
          };
          readableLogger.debug('Registering socket message handler');
          ws.on('message', messageHandler);
          ws.once('close', (code, reason) => {
            logger.info('Socket closed');
            ws.removeListener('message', messageHandler);
            if (!this.readableEnded) {
              readableLogger.debug(
                `Closed early, ${code}, ${reason.toString()}`,
              );
              const e = new clientRPCErrors.ErrorClientConnectionEndedEarly();
              this.endReadable(e);
              controller.error(e);
            }
          });
          ws.once('error', (e) => {
            if (!this.readableEnded) {
              readableLogger.error(e);
              this.endReadable(e);
              controller.error(e);
            }
          });
        },
        cancel: () => {
          readableLogger.debug('Cancelled');
          if (!this.writableEnded) {
            readableLogger.debug('Closing socket');
            this.endReadable();
            ws.close();
          }
        },
        pull: () => {
          readableLogger.debug('Releasing backpressure');
          ws.resume();
        },
      },
      {
        highWaterMark: maxReadableStreamBytes,
        size: (chunk) => chunk?.byteLength ?? 0,
      },
    );
    this.writable = new WritableStream<Uint8Array>({
      start: (controller) => {
        writableLogger.info('Starting');
        ws.once('error', (e) => {
          if (!this.writableEnded) {
            writableLogger.error(e);
            this.endWritable(e);
            controller.error(e);
          }
        });
        ws.once('close', (code, reason) => {
          if (!this.writableEnded) {
            writableLogger.debug(`Closed early, ${code}, ${reason.toString()}`);
            const e = new clientRPCErrors.ErrorClientConnectionEndedEarly();
            this.endWritable(e);
            controller.error(e);
          }
        });
      },
      close: () => {
        writableLogger.debug('Closing, sending null message');
        ws.send(Buffer.from([]));
        this.endWritable();
        if (this.readableEnded) {
          writableLogger.debug('Closing socket');
          ws.close();
        }
      },
      abort: () => {
        writableLogger.debug('Aborted');
        this.endWritable(Error('TMP ABORTED'));
        if (this.readableEnded) {
          writableLogger.debug('Closing socket');
          ws.close();
        }
      },
      write: async (chunk, controller) => {
        if (this.writableEnded) return;
        writableLogger.debug(`Sending ${chunk?.toString()}`);
        const wait = promise<void>();
        ws.send(chunk, (e) => {
          if (e != null && !this.writableEnded) {
            // Opting to debug message here and not log an error, sending
            //  failure is common if we send before the close event.
            writableLogger.debug('failed to send');
            const err = new clientRPCErrors.ErrorClientConnectionEndedEarly(
              undefined,
              {
                cause: e,
              },
            );
            this.endWritable(err);
            controller.error(err);
          }
          wait.resolveP();
        });
        await wait.p;
      },
    });

    // Setting up heartbeat
    const pingTimer = setInterval(() => {
      ws.ping();
    }, pingInterval);
    const pingTimeoutTimer = setTimeout(() => {
      logger.debug('Ping timed out');
      ws.close(4002, 'Timed out');
    }, pingTimeout);
    ws.on('ping', () => {
      logger.debug('Received ping');
      ws.pong();
    });
    ws.on('pong', () => {
      logger.debug('Received pong');
      pingTimeoutTimer.refresh();
    });
    ws.once('close', (code, reason) => {
      logger.debug('WebSocket closed');
      const err =
        code !== 1000
          ? Error(`TMP WebSocket ended with code ${code}, ${reason.toString()}`)
          : undefined;
      this.endWebSocket(err);
      logger.debug('Cleaning up timers');
      // Clean up timers
      clearTimeout(pingTimer);
      clearTimeout(pingTimeoutTimer);
    });
  }

  end(): void {
    this.ws.terminate();
  }
}

export default WebSocketClient;
