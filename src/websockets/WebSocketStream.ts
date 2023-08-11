import type { ReadableWritablePair } from 'stream/web';
import type {
  ReadableStreamController,
  WritableStreamDefaultController,
} from 'stream/web';
import type * as ws from 'ws';
import type Logger from '@matrixai/logger';
import type { NodeIdEncoded } from '../ids/types';
import type { JSONValue } from '../types';
import { WritableStream, ReadableStream } from 'stream/web';
import * as webSocketErrors from './errors';
import * as utilsErrors from '../utils/errors';
import { promise } from '../utils';

class WebSocketStream implements ReadableWritablePair<Uint8Array, Uint8Array> {
  public readable: ReadableStream;
  public writable: WritableStream;

  protected _readableEnded = false;
  protected _readableEndedProm = promise();
  protected _writableEnded = false;
  protected _writableEndedProm = promise();
  protected _webSocketEnded = false;
  protected _webSocketEndedProm = promise();
  protected _endedProm: Promise<void>;

  protected readableController:
    | ReadableStreamController<Uint8Array>
    | undefined;
  protected writableController: WritableStreamDefaultController | undefined;

  constructor(
    protected ws: ws.WebSocket,
    pingInterval: number,
    pingTimeoutTime: number,
    protected metadata: {
      nodeId?: NodeIdEncoded;
      localHost: string;
      localPort: number;
      remoteHost: string;
      remotePort: number;
    },
    logger: Logger,
  ) {
    // Sanitise promises so they don't result in unhandled rejections
    this._readableEndedProm.p.catch(() => {});
    this._writableEndedProm.p.catch(() => {});
    this._webSocketEndedProm.p.catch(() => {});
    // Creating the endedPromise
    this._endedProm = Promise.allSettled([
      this._readableEndedProm.p,
      this._writableEndedProm.p,
      this._webSocketEndedProm.p,
    ]).then((result) => {
      if (
        result[0].status === 'rejected' ||
        result[1].status === 'rejected' ||
        result[2].status === 'rejected'
      ) {
        // Throw a compound error
        throw AggregateError(result, 'stream failed');
      }
      // Otherwise return nothing
    });
    // Ignore errors if it's never used
    this._endedProm.catch(() => {});

    logger.info('WS opened');
    const readableLogger = logger.getChild('readable');
    const writableLogger = logger.getChild('writable');
    // Setting up the readable stream
    this.readable = new ReadableStream<Uint8Array>(
      {
        start: (controller) => {
          readableLogger.debug('Starting');
          this.readableController = controller;
          const messageHandler = (data: ws.RawData, isBinary: boolean) => {
            if (!isBinary || data instanceof Array) {
              controller.error(new utilsErrors.ErrorUtilsUndefinedBehaviour());
              return;
            }
            const message = data as Buffer;
            readableLogger.debug(`Received ${message.toString()}`);
            if (message.length === 0) {
              readableLogger.debug('Null message received');
              ws.removeListener('message', messageHandler);
              if (!this._readableEnded) {
                readableLogger.debug('Closing');
                this.signalReadableEnd();
                controller.close();
              }
              if (this._writableEnded) {
                logger.debug('Closing socket');
                ws.close();
              }
              return;
            }
            if (this._readableEnded) {
              return;
            }
            controller.enqueue(message);
            if (controller.desiredSize == null) {
              controller.error(new utilsErrors.ErrorUtilsUndefinedBehaviour());
              return;
            }
            if (controller.desiredSize < 0) {
              readableLogger.debug('Applying readable backpressure');
              ws.pause();
            }
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
          if (this._writableEnded) {
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
      { highWaterMark: 1 },
    );
    this.writable = new WritableStream<Uint8Array>(
      {
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
              writableLogger.debug(
                `Closed early, ${code}, ${reason.toString()}`,
              );
              const e = new webSocketErrors.ErrorClientConnectionEndedEarly();
              this.signalWritableEnd(e);
              controller.error(e);
            }
          });
        },
        close: async () => {
          writableLogger.debug('Closing, sending null message');
          const sendProm = promise<void>();
          ws.send(Buffer.from([]), (err) => {
            if (err == null) sendProm.resolveP();
            else sendProm.rejectP(err);
          });
          await sendProm.p;
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
            ws.close(4000, `Aborting connection with ${reason.message}`);
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
      },
      { highWaterMark: 1 },
    );

    // Setting up heartbeat
    const pingTimer = setInterval(() => {
      ws.ping();
    }, pingInterval);
    const pingTimeoutTimeTimer = setTimeout(() => {
      logger.debug('Ping timed out');
      ws.close(4002, 'Timed out');
    }, pingTimeoutTime);
    const pingHandler = () => {
      logger.debug('Received ping');
      ws.pong();
    };
    const pongHandler = () => {
      logger.debug('Received pong');
      pingTimeoutTimeTimer.refresh();
    };
    ws.on('ping', pingHandler);
    ws.on('pong', pongHandler);
    ws.once('close', (code, reason) => {
      ws.off('ping', pingHandler);
      ws.off('pong', pongHandler);
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
      clearTimeout(pingTimeoutTimeTimer);
    });
  }

  get readableEnded() {
    return this._readableEnded;
  }

  /**
   * Resolves when the readable has ended and rejects with any errors.
   */
  get readableEndedProm() {
    return this._readableEndedProm.p;
  }

  get writableEnded() {
    return this._writableEnded;
  }

  /**
   * Resolves when the writable has ended and rejects with any errors.
   */
  get writableEndedProm() {
    return this._writableEndedProm.p;
  }

  get webSocketEnded() {
    return this._webSocketEnded;
  }

  /**
   * Resolves when the webSocket has ended and rejects with any errors.
   */
  get webSocketEndedProm() {
    return this._webSocketEndedProm.p;
  }

  get ended() {
    return this._readableEnded && this._writableEnded;
  }

  /**
   * Resolves when the stream has fully closed
   */
  get endedProm(): Promise<void> {
    return this._endedProm;
  }

  get meta(): Record<string, JSONValue> {
    // Spreading to avoid modifying the data
    return {
      ...this.metadata,
    };
  }

  /**
   * Forces the active stream to end early
   */
  public cancel(reason?: any): void {
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

  /**
   * Signals the end of the ReadableStream. to be used with the extended class
   * to track the streams state.
   */
  protected signalReadableEnd(reason?: any) {
    if (this._readableEnded) return;
    this._readableEnded = true;
    if (reason == null) this._readableEndedProm.resolveP();
    else this._readableEndedProm.rejectP(reason);
  }

  /**
   * Signals the end of the WritableStream. to be used with the extended class
   * to track the streams state.
   */
  protected signalWritableEnd(reason?: any) {
    if (this._writableEnded) return;
    this._writableEnded = true;
    if (reason == null) this._writableEndedProm.resolveP();
    else this._writableEndedProm.rejectP(reason);
  }

  /**
   * Signals the end of the WebSocket. to be used with the extended class
   * to track the streams state.
   */
  protected signalWebSocketEnd(reason?: any) {
    if (this._webSocketEnded) return;
    this._webSocketEnded = true;
    if (reason == null) this._webSocketEndedProm.resolveP();
    else this._webSocketEndedProm.rejectP(reason);
  }
}

export default WebSocketStream;
