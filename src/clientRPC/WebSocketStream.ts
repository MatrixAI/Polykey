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

  protected readableEnded_ = false;
  protected readableEndedProm_ = promise();
  protected writableEnded_ = false;
  protected writableEndedProm_ = promise();
  protected webSocketEnded_ = false;
  protected webSocketEndedProm_ = promise();
  protected endedProm_: Promise<void>;

  protected constructor() {
    // Sanitise promises so they don't result in unhandled rejections
    this.readableEndedProm_.p.catch(() => {});
    this.writableEndedProm_.p.catch(() => {});
    this.webSocketEndedProm_.p.catch(() => {});
    // Creating the endedPromise
    this.endedProm_ = Promise.allSettled([
      this.readableEndedProm_.p,
      this.writableEndedProm_.p,
      this.webSocketEndedProm_.p,
    ]).then((result) => {
      if (
        result[0].status === 'rejected' ||
        result[1].status === 'rejected' ||
        result[2].status === 'rejected'
      ) {
        // Throw a compound error
        throw Error('TMP Stream failed', { cause: result });
      }
      // Otherwise return nothing
    });
    // Ignore errors if it's never used
    this.endedProm_.catch(() => {});
  }

  get readableEnded() {
    return this.readableEnded_;
  }

  /**
   * Resolves when the readable has ended and rejects with any errors.
   */
  get readableEndedProm() {
    return this.readableEndedProm_.p;
  }

  get writableEnded() {
    return this.writableEnded_;
  }

  /**
   * Resolves when the writable has ended and rejects with any errors.
   */
  get writableEndedProm() {
    return this.writableEndedProm_.p;
  }

  get webSocketEnded() {
    return this.webSocketEnded_;
  }

  /**
   * Resolves when the webSocket has ended and rejects with any errors.
   */
  get webSocketEndedProm() {
    return this.webSocketEndedProm_.p;
  }

  get ended() {
    return this.readableEnded_ && this.writableEnded_;
  }

  /**
   * Resolves when the stream has fully closed
   */
  get endedProm(): Promise<void> {
    return this.endedProm_;
  }

  /**
   * Forces the active stream to end early
   */
  abstract end(): void;

  /**
   * Signals the end of the ReadableStream. to be used with the extended class
   * to track the streams state.
   */
  protected endReadable(e?: Error) {
    if (this.readableEnded_) return;
    this.readableEnded_ = true;
    if (e == null) this.readableEndedProm_.resolveP();
    else this.readableEndedProm_.rejectP(e);
  }

  /**
   * Signals the end of the WritableStream. to be used with the extended class
   * to track the streams state.
   */
  protected endWritable(e?: Error) {
    if (this.writableEnded_) return;
    this.writableEnded_ = true;
    if (e == null) this.writableEndedProm_.resolveP();
    else this.writableEndedProm_.rejectP(e);
  }

  /**
   * Signals the end of the WebSocket. to be used with the extended class
   * to track the streams state.
   */
  protected endWebSocket(e?: Error) {
    if (this.webSocketEnded_) return;
    this.webSocketEnded_ = true;
    if (e == null) this.webSocketEndedProm_.resolveP();
    else this.webSocketEndedProm_.rejectP(e);
  }
}

export default WebSocketStream;
