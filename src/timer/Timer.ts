import { performance } from 'perf_hooks';
import { CreateDestroy } from '@matrixai/async-init/dist/CreateDestroy';
import * as timerErrors from './errors';

/**
 * Unlike `setTimeout` or `setInterval`,
 * this will not keep the NodeJS event loop alive
 */
interface Timer<T> extends CreateDestroy {}
@CreateDestroy()
class Timer<T = void> implements Promise<T> {
  public static createTimer<T = void>({
    handler,
    delay = 0,
  }: {
    handler?: () => T;
    delay?: number;
  } = {}): Timer<T> {
    return new this({handler, delay});
  }

  /**
   * Delay in milliseconds
   * This may be `Infinity`
   */
  public readonly delay: number;

  /**
   * Timestamp when this is constructed
   * Guaranteed to be weakly monotonic within the process lifetime
   * Compare this with `performance.now()` not `Date.now()`
   */
  public readonly timestamp: Date;

  /**
   * Timestamp when this is scheduled to finish and execute the handler
   * Guaranteed to be weakly monotonic within the process lifetime
   * Compare this with `performance.now()` not `Date.now()`
   */
  public readonly scheduled?: Date;

  /**
   * Handler to be executed
   */
  protected handler?: () => T;

  /**
   * Deconstructed promise
   */
  protected p: Promise<T>;

  /**
   * Resolve deconstructed promise
   */
  protected resolveP: (value?: T) => void;

  /**
   * Reject deconstructed promise
   */
  protected rejectP: (reason?: timerErrors.ErrorTimer<any>) => void;

  /**
   * Internal timeout reference
   */
  protected timeoutRef?: ReturnType<typeof setTimeout>;

  /**
   * Whether the timer has timed out
   * This is only `true` when the timer resolves
   * If the timer rejects, this stays `false`
   */
  protected _status: 'resolved' | 'rejected' | null = null;

  constructor({
    handler,
    delay = 0,
  }: {
    handler?: () => T;
    delay?: number;
  } = {}) {
    // Clip to delay >= 0
    delay = Math.max(delay, 0);
    // Coerce NaN to minimal delay of 0
    if (isNaN(delay)) delay = 0;
    this.handler = handler;
    this.delay = delay;
    this.p = new Promise<T>((resolve, reject) => {
      this.resolveP = resolve.bind(this.p);
      this.rejectP = reject.bind(this.p);
    });
    // If the delay is Infinity, there is no `setTimeout`
    // therefore this promise will never resolve
    // it may still reject however
    if (isFinite(delay)) {
      this.timeoutRef = setTimeout(() => void this.destroy('resolve'), delay);
      if (typeof this.timeoutRef.unref === 'function') {
        // Do not keep the event loop alive
        this.timeoutRef.unref();
      }
      this.timestamp = new Date(
        performance.timeOrigin + performance.now()
      );
      this.scheduled = new Date(
        this.timestamp.getTime() + delay
      );
    } else {
      // There is no `setTimeout` nor `setInterval`
      // so the event loop will not be kept alive
      this.timestamp = new Date(
        performance.timeOrigin + performance.now()
      );
    }
  }

  public get [Symbol.toStringTag](): string {
    return this.constructor.name;
  }

  public get status(): 'resolved' | 'rejected' | null {
    return this._status;
  }

  public async destroy(type: 'resolve' | 'reject' = 'resolve'): Promise<void> {
    clearTimeout(this.timeoutRef);
    delete this.timeoutRef;
    if (type ==='resolve') {
      this._status = 'resolved';
      if (this.handler != null) {
        this.resolveP(this.handler());
      } else {
        this.resolveP();
      }
    } else if (type === 'reject') {
      this._status = 'rejected';
      this.rejectP(new timerErrors.ErrorTimerCancelled());
    }
  }

  /**
   * Gets the remaining time in milliseconds
   * This will return `Infinity` if `delay` is `Infinity`
   * This will return `0` if status is `resolved` or `rejected`
   */
  public getTimeout(): number {
    if (this._status !== null) return 0;
    if (this.scheduled == null) return Infinity;
    return Math.max(
      Math.trunc(this.scheduled.getTime() - (
        performance.timeOrigin + performance.now()
      )),
      0,
    );
  }

  /**
   * To remaining time as a string
   * This may return `'Infinity'` if `this.delay` is `Infinity`
   */
  public toString(): string {
    return this.getTimeout().toString();
  }

  /**
   * To remaining time as a number
   * This may return `Infinity` if `this.delay` is `Infinity`
   */
  public valueOf(): number {
    return this.getTimeout();
  }

  public then<TResult1 = T, TResult2 = never>(
    onFulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onRejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2> {
    return this.p.then(onFulfilled, onRejected);
  }

  public catch<TResult = never>(
    onRejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null
  ): Promise<T | TResult> {
    return this.p.catch(onRejected);
  }

  public finally(onFinally?: (() => void) | undefined | null): Promise<T> {
    return this.p.finally(onFinally);
  }

  public cancel() {
    void this.destroy('reject');
  }
}

export default Timer;
