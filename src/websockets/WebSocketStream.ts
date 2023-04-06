import type {
  ReadableStream,
  ReadableWritablePair,
  WritableStream,
} from 'stream/web';
import { promise } from '../utils';

abstract class WebSocketStream
  implements ReadableWritablePair<Uint8Array, Uint8Array>
{
  public readable: ReadableStream;
  public writable: WritableStream;

  protected _readableEnded = false;
  protected _readableEndedProm = promise();
  protected _writableEnded = false;
  protected _writableEndedProm = promise();
  protected _webSocketEnded = false;
  protected _webSocketEndedProm = promise();
  protected _endedProm: Promise<void>;

  protected constructor() {
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

  /**
   * Forces the active stream to end early
   */
  abstract cancel(reason?: any): void;

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
