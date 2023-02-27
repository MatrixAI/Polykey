import type { ReadableWritablePair } from 'stream/web';
import type { TLSSocket } from 'tls';
import type { NodeId } from 'ids/index';
import { WritableStream, ReadableStream } from 'stream/web';
import { createDestroy } from '@matrixai/async-init';
import Logger from '@matrixai/logger';
import WebSocket from 'ws';
import { PromiseCancellable } from '@matrixai/async-cancellable';
import { Timer } from '@matrixai/timer';
import { Validator } from 'ip-num';
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

  protected activeConnections: Set<PromiseCancellable<void>> = new Set();

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
        activeConnection.cancel();
      }
    }
    for (const activeConnection of this.activeConnections) {
      await activeConnection;
    }
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  @createDestroy.ready(new clientRPCErrors.ErrorClientDestroyed())
  public async startConnection({
    timeoutTimer,
  }: {
    timeoutTimer?: Timer;
  } = {}): Promise<ReadableWritablePair<Uint8Array, Uint8Array>> {
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
    // Creating logic for awaiting active connections and terminating them
    const abortHandler = () => {
      ws.terminate();
    };
    const abortController = new AbortController();
    const activeConnectionProm = new PromiseCancellable<void>((resolve) => {
      ws.once('close', () => {
        abortController.signal.removeEventListener('abort', abortHandler);
        resolve();
      });
    }, abortController);
    abortController.signal.addEventListener('abort', abortHandler);
    this.activeConnections.add(activeConnectionProm);
    activeConnectionProm.finally(() =>
      this.activeConnections.delete(activeConnectionProm),
    );
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
    // TODO: Race with a connection timeout here
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
      await activeConnectionProm;
      throw e;
    }
    // Cleaning up connection error
    ws.removeEventListener('error', openErrorHandler);

    let readableClosed = false;
    let writableClosed = false;
    const readableLogger = this.logger.getChild('readable');
    const writableLogger = this.logger.getChild('writable');
    const readableStream = new ReadableStream<Uint8Array>(
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
              if (!readableClosed) {
                readableClosed = true;
                readableLogger.debug('Closing');
                controller.close();
              }
              if (writableClosed) {
                this.logger.debug('Closing socket');
                ws.close();
              }
              return;
            }
            controller.enqueue(message);
          };
          readableLogger.debug('Registering socket message handler');
          ws.on('message', messageHandler);
          ws.once('close', (code, reason) => {
            this.logger.info('Socket closed');
            ws.removeListener('message', messageHandler);
            if (!readableClosed) {
              readableClosed = true;
              readableLogger.debug(
                `Closed early, ${code}, ${reason.toString()}`,
              );
              controller.error(
                new clientRPCErrors.ErrorClientConnectionEndedEarly(),
              );
            }
          });
          ws.once('error', (e) => {
            if (!readableClosed) {
              readableClosed = true;
              readableLogger.error(e);
              controller.error(e);
            }
          });
        },
        cancel: () => {
          readableLogger.debug('Cancelled');
          if (!readableClosed) {
            readableLogger.debug('Closing socket');
            readableClosed = true;
            ws.close();
          }
        },
        pull: () => {
          readableLogger.debug('Releasing backpressure');
          ws.resume();
        },
      },
      {
        highWaterMark: this.maxReadableStreamBytes,
        size: (chunk) => chunk?.byteLength ?? 0,
      },
    );
    const writableStream = new WritableStream<Uint8Array>({
      start: (controller) => {
        writableLogger.info('Starting');
        ws.once('error', (e) => {
          if (!writableClosed) {
            writableClosed = true;
            writableLogger.error(e);
            controller.error(e);
          }
        });
        ws.once('close', (code, reason) => {
          if (!writableClosed) {
            writableClosed = true;
            writableLogger.debug(`Closed early, ${code}, ${reason.toString()}`);
            controller.error(
              new clientRPCErrors.ErrorClientConnectionEndedEarly(),
            );
          }
        });
      },
      close: () => {
        writableLogger.debug('Closing, sending null message');
        ws.send(Buffer.from([]));
        writableClosed = true;
        if (readableClosed) {
          writableLogger.debug('Closing socket');
          ws.close();
        }
      },
      abort: () => {
        writableLogger.debug('Aborted');
        writableClosed = true;
        if (readableClosed) {
          writableLogger.debug('Closing socket');
          ws.close();
        }
      },
      write: async (chunk, controller) => {
        if (writableClosed) return;
        writableLogger.debug(`Sending ${chunk?.toString()}`);
        const wait = promise<void>();
        ws.send(chunk, (e) => {
          if (e != null && !writableClosed) {
            writableClosed = true;
            // Opting to debug message here and not log an error, sending
            //  failure is common if we send before the close event.
            writableLogger.debug('failed to send');
            controller.error(
              new clientRPCErrors.ErrorClientConnectionEndedEarly(undefined, {
                cause: e,
              }),
            );
          }
          wait.resolveP();
        });
        await wait.p;
      },
    });

    // Setting up heartbeat
    const pingTimer = setInterval(() => {
      ws.ping();
    }, this.pingInterval);
    const pingTimeoutTimer = setTimeout(() => {
      this.logger.debug('Ping timed out');
      ws.close(4002, 'Timed out');
    }, this.pingTimeout);
    ws.on('ping', () => {
      this.logger.debug('Received ping');
      ws.pong();
    });
    ws.on('pong', () => {
      this.logger.debug('Received pong');
      pingTimeoutTimer.refresh();
    });
    ws.once('close', () => {
      this.logger.debug('Cleaning up timers');
      // Clean up timers
      clearTimeout(pingTimer);
      clearTimeout(pingTimeoutTimer);
    });

    return {
      readable: readableStream,
      writable: writableStream,
    };
  }
}

export default WebSocketClient;
