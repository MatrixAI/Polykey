import type { TLSSocket } from 'tls';
import type { NodeId, NodeIdEncoded } from 'ids/index';
import type { ContextTimed } from '../contexts/types';
import type {
  ReadableStreamController,
  WritableStreamDefaultController,
} from 'stream/web';
import type { JSONValue } from '../types';
import { WritableStream, ReadableStream } from 'stream/web';
import { createDestroy } from '@matrixai/async-init';
import Logger from '@matrixai/logger';
import WebSocket from 'ws';
import { Validator } from 'ip-num';
import { Timer } from '@matrixai/timer';
import WebSocketStream from './WebSocketStream';
import * as webSocketUtils from './utils';
import * as webSocketErrors from './errors';
import { promise } from '../utils';
import * as nodesUtils from '../nodes/utils';

interface WebSocketClient extends createDestroy.CreateDestroy {}
@createDestroy.CreateDestroy()
class WebSocketClient {
  /**
   * @param obj
   * @param obj.host - Target host address to connect to
   * @param obj.port - Target port to connect to
   * @param obj.expectedNodeIds - Expected NodeIds you are trying to connect to. Will validate the cert chain of the
   * sever. If none of these NodeIDs are found the connection will be rejected.
   * @param obj.connectionTimeoutTime - Timeout time used when attempting the connection.
   * Default is Infinity milliseconds.
   * @param obj.pingIntervalTime - Time between pings for checking connection health and keep alive.
   * Default is 1,000 milliseconds.
   * @param obj.pingTimeoutTime - Time before connection is cleaned up after no ping responses.
   * Default is 10,000 milliseconds.
   * @param obj.maxReadableStreamBytes - The number of bytes the readable stream will buffer until pausing.
   * @param obj.logger
   */
  static async createWebSocketClient({
    host,
    port,
    expectedNodeIds,
    connectionTimeoutTime = Infinity,
    pingIntervalTime = 1_000,
    pingTimeoutTime = 10_000,
    maxReadableStreamBytes = 1_000, // About 1kB
    logger = new Logger(this.name),
  }: {
    host: string;
    port: number;
    expectedNodeIds: Array<NodeId>;
    connectionTimeoutTime?: number;
    pingIntervalTime?: number;
    pingTimeoutTime?: number;
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
      connectionTimeoutTime,
      pingIntervalTime,
      pingTimeoutTime,
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
    protected connectionTimeoutTime: number,
    protected pingIntervalTime: number,
    protected pingTimeoutTime: number,
  ) {
    if (Validator.isValidIPv4String(host)[0]) {
      this.host = host;
    } else if (Validator.isValidIPv6String(host)[0]) {
      this.host = `[${host}]`;
    } else {
      throw new webSocketErrors.ErrorClientInvalidHost();
    }
  }

  public async destroy(force: boolean = false) {
    this.logger.info(`Destroying ${this.constructor.name}`);
    if (force) {
      for (const activeConnection of this.activeConnections) {
        activeConnection.cancel(
          new webSocketErrors.ErrorClientEndingConnections(
            'Destroying WebSocketClient',
          ),
        );
      }
    }
    for (const activeConnection of this.activeConnections) {
      // Ignore errors here, we only care that it finishes
      await activeConnection.endedProm.catch(() => {});
    }
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  @createDestroy.ready(new webSocketErrors.ErrorClientDestroyed())
  public async stopConnections() {
    for (const activeConnection of this.activeConnections) {
      activeConnection.cancel(
        new webSocketErrors.ErrorClientEndingConnections(),
      );
    }
    for (const activeConnection of this.activeConnections) {
      // Ignore errors here, we only care that it finished
      await activeConnection.endedProm.catch(() => {});
    }
  }

  @createDestroy.ready(new webSocketErrors.ErrorClientDestroyed())
  public async startConnection(
    ctx: Partial<ContextTimed> = {},
  ): Promise<WebSocketStreamClientInternal> {
    // Setting up abort/cancellation logic
    const abortRaceProm = promise<never>();
    // Ignore unhandled rejection
    abortRaceProm.p.catch(() => {});
    const timer =
      ctx.timer ??
      new Timer({
        delay: this.connectionTimeoutTime,
      });
    void timer.then(
      () => {
        abortRaceProm.rejectP(
          new webSocketErrors.ErrorClientConnectionTimedOut(),
        );
      },
      () => {}, // Ignore cancellation errors
    );
    const { signal } = ctx;
    let abortHandler: () => void | undefined;
    if (signal != null) {
      abortHandler = () => {
        abortRaceProm.rejectP(signal.reason);
      };
      if (signal.aborted) abortHandler();
      else signal.addEventListener('abort', abortHandler);
    }
    const cleanUp = () => {
      // Cancel timer if it was internally created
      if (ctx.timer == null) timer.cancel();
      signal?.removeEventListener('abort', abortHandler);
    };
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
        new webSocketErrors.ErrorClientConnectionFailed(undefined, {
          cause: e,
        }),
      );
    };
    ws.once('error', openErrorHandler);
    // Authenticate server's certificates
    ws.once('upgrade', async (request) => {
      const tlsSocket = request.socket as TLSSocket;
      const peerCert = tlsSocket.getPeerCertificate(true);
      webSocketUtils
        .verifyServerCertificateChain(
          this.expectedNodeIds,
          webSocketUtils.detailedToCertChain(peerCert),
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
      await Promise.race([
        abortRaceProm.p,
        await Promise.all([authenticateProm.p, connectProm.p]),
      ]);
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
    } finally {
      cleanUp();
      // Cleaning up connection error
      ws.removeEventListener('error', openErrorHandler);
    }

    // Constructing the `ReadableWritablePair`, the lifecycle is handed off to
    //  the webSocketStream at this point.
    const webSocketStreamClient = new WebSocketStreamClientInternal(
      ws,
      this.maxReadableStreamBytes,
      this.pingIntervalTime,
      this.pingTimeoutTime,
      {
        host: this.host,
        nodeId: nodesUtils.encodeNodeId(await authenticateProm.p),
        port: this.port,
      },
      this.logger,
    );
    const abortStream = () => {
      webSocketStreamClient.cancel(
        new webSocketErrors.ErrorClientStreamAborted(undefined, {
          cause: signal?.reason,
        }),
      );
    };
    // Setting up activeStream map lifecycle
    this.activeConnections.add(webSocketStreamClient);
    void webSocketStreamClient.endedProm
      // Ignore errors, we only care that it finished
      .catch(() => {})
      .finally(() => {
        this.activeConnections.delete(webSocketStreamClient);
        signal?.removeEventListener('abort', abortStream);
      });
    // Abort connection on signal
    if (signal?.aborted === true) abortStream();
    else signal?.addEventListener('abort', abortStream);
    return webSocketStreamClient;
  }
}

// This is the internal implementation of the client's stream pair.
class WebSocketStreamClientInternal extends WebSocketStream {
  protected readableController:
    | ReadableStreamController<Uint8Array>
    | undefined;
  protected writableController: WritableStreamDefaultController | undefined;

  constructor(
    protected ws: WebSocket,
    maxReadableStreamBytes: number,
    pingInterval: number,
    pingTimeout: number,
    protected clientMetadata: {
      nodeId: NodeIdEncoded;
      host: string;
      port: number;
    },
    logger: Logger,
  ) {
    super();
    const readableLogger = logger.getChild('readable');
    const writableLogger = logger.getChild('writable');

    this.readable = new ReadableStream<Uint8Array>(
      {
        start: (controller) => {
          this.readableController = controller;
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
              if (!this._readableEnded) {
                this.signalReadableEnd();
                readableLogger.debug('Closing');
                controller.close();
              }
              if (this._writableEnded) {
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
            if (!this._readableEnded) {
              readableLogger.debug(
                `Closed early, ${code}, ${reason.toString()}`,
              );
              const e = new webSocketErrors.ErrorClientConnectionEndedEarly();
              this.signalReadableEnd(e);
              controller.error(e);
            }
          });
          ws.once('error', (e) => {
            if (!this._readableEnded) {
              readableLogger.error(e);
              this.signalReadableEnd(e);
              controller.error(e);
            }
          });
        },
        cancel: (reason) => {
          readableLogger.debug('Cancelled');
          this.signalReadableEnd(reason);
          if (!this._writableEnded) {
            readableLogger.debug('Closing socket');
            this.signalWritableEnd(reason);
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
        this.writableController = controller;
        writableLogger.info('Starting');
        ws.once('error', (e) => {
          if (!this._writableEnded) {
            writableLogger.error(e);
            this.signalWritableEnd(e);
            controller.error(e);
          }
        });
        ws.once('close', (code, reason) => {
          if (!this._writableEnded) {
            writableLogger.debug(`Closed early, ${code}, ${reason.toString()}`);
            const e = new webSocketErrors.ErrorClientConnectionEndedEarly();
            this.signalWritableEnd(e);
            controller.error(e);
          }
        });
      },
      close: () => {
        writableLogger.debug('Closing, sending null message');
        ws.send(Buffer.from([]));
        this.signalWritableEnd();
        if (this._readableEnded) {
          writableLogger.debug('Closing socket');
          ws.close();
        }
      },
      abort: (reason) => {
        writableLogger.debug('Aborted');
        this.signalWritableEnd(reason);
        if (this._readableEnded) {
          writableLogger.debug('Closing socket');
          ws.close();
        }
      },
      write: async (chunk, controller) => {
        if (this._writableEnded) return;
        writableLogger.debug(`Sending ${chunk?.toString()}`);
        const wait = promise<void>();
        ws.send(chunk, (e) => {
          if (e != null && !this._writableEnded) {
            // Opting to debug message here and not log an error, sending
            //  failure is common if we send before the close event.
            writableLogger.debug('failed to send');
            const err = new webSocketErrors.ErrorClientConnectionEndedEarly(
              undefined,
              {
                cause: e,
              },
            );
            this.signalWritableEnd(err);
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
          ? new webSocketErrors.ErrorClientConnectionEndedEarly(
              `ended with code ${code}, ${reason.toString()}`,
            )
          : undefined;
      this.signalWebSocketEnd(err);
      logger.debug('Cleaning up timers');
      // Clean up timers
      clearTimeout(pingTimer);
      clearTimeout(pingTimeoutTimer);
    });
  }

  get meta(): Record<string, JSONValue> {
    // Spreading to avoid modifying the data
    return {
      ...this.clientMetadata,
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
      this.ws.close(4000, 'Ending connection');
      this.signalWebSocketEnd(err);
    }
  }
}

export default WebSocketClient;
