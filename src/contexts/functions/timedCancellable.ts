import type { ContextTimed } from '../types';
import { PromiseCancellable } from '@matrixai/async-cancellable';
import { Timer } from '@matrixai/timer';
import * as contextsErrors from '../errors';

type ContextRemaining<C> = Omit<C, keyof ContextTimed>;

type ContextAndParameters<
  C,
  P extends Array<any>,
> = keyof ContextRemaining<C> extends never
  ? [Partial<ContextTimed>?, ...P]
  : [Partial<ContextTimed> & ContextRemaining<C>, ...P];

function setupTimedCancellable<C extends ContextTimed, P extends Array<any>, R>(
  f: (ctx: C, ...params: P) => PromiseLike<R>,
  lazy: boolean,
  delay: number,
  errorTimeoutConstructor: new () => Error = contextsErrors.ErrorContextsTimedTimeOut,
  ctx: Partial<ContextTimed>,
  args: P,
): PromiseCancellable<R> {
  // There are 3 properties of timer and signal:
  //
  //   A. If timer times out, signal is aborted
  //   B. If signal is aborted, timer is cancelled
  //   C. If timer is owned by the wrapper, then it must be cancelled when the target finishes
  //
  // There are 4 cases where the wrapper is used:
  //
  //   1. Nothing is inherited - A B C
  //   2. Signal is inherited - A B C
  //   3. Timer is inherited - A
  //   4. Both signal and timer are inherited - A*
  //
  // Property B and C only applies to case 1 and 2 because the timer is owned
  // by the wrapper and it is not inherited, if it is inherited, the caller may
  // need to reuse the timer.
  // In situation 4, there's a caveat for property A: it is assumed that the
  // caller has already setup the property A relationship, therefore this
  // wrapper will not re-setup this property A relationship.
  let abortController: AbortController;
  let teardownContext: () => void;
  if (ctx.timer === undefined && ctx.signal === undefined) {
    abortController = new AbortController();
    const e = new errorTimeoutConstructor();
    // Property A
    const timer = new Timer(() => void abortController.abort(e), delay);
    abortController.signal.addEventListener('abort', () => {
      // Property B
      timer.cancel();
    });
    ctx.signal = abortController.signal;
    ctx.timer = timer;
    teardownContext = () => {
      // Property C
      timer.cancel();
    };
  } else if (ctx.timer === undefined && ctx.signal instanceof AbortSignal) {
    abortController = new AbortController();
    const e = new errorTimeoutConstructor();
    // Property A
    const timer = new Timer(() => void abortController.abort(e), delay);
    const signalUpstream = ctx.signal;
    const signalHandler = () => {
      // Property B
      timer.cancel();
      abortController.abort(signalUpstream.reason);
    };
    // If already aborted, abort target and cancel the timer
    if (signalUpstream.aborted) {
      // Property B
      timer.cancel();
      abortController.abort(signalUpstream.reason);
    } else {
      signalUpstream.addEventListener('abort', signalHandler);
    }
    // Overwrite the signal property with this ctx's `AbortController.signal`
    ctx.signal = abortController.signal;
    ctx.timer = timer;
    teardownContext = () => {
      signalUpstream.removeEventListener('abort', signalHandler);
      // Property C
      timer.cancel();
    };
  } else if (ctx.timer instanceof Timer && ctx.signal === undefined) {
    abortController = new AbortController();
    const e = new errorTimeoutConstructor();
    let finished = false;
    // If the timer resolves, then abort the target function
    void ctx.timer.then(
      (r: any, s: AbortSignal) => {
        // If the timer is aborted after it resolves
        // then don't bother aborting the target function
        if (!finished && !s.aborted) {
          // Property A
          abortController.abort(e);
        }
        return r;
      },
      () => {
        // Ignore any upstream cancellation
      },
    );
    ctx.signal = abortController.signal;
    teardownContext = () => {
      // The timer is not cancelled here because
      // it was not created in this scope
      finished = true;
    };
  } else {
    // In this case, `context.timer` and `context.signal` are both instances of
    // `Timer` and `AbortSignal` respectively
    // It is assumed that both the timer and signal are already hooked up to each other
    abortController = new AbortController();
    const signalUpstream = ctx.signal!;
    const signalHandler = () => {
      abortController.abort(signalUpstream.reason);
    };
    if (signalUpstream.aborted) {
      abortController.abort(signalUpstream.reason);
    } else {
      signalUpstream.addEventListener('abort', signalHandler);
    }
    // Overwrite the signal property with this context's `AbortController.signal`
    ctx.signal = abortController.signal;
    teardownContext = () => {
      signalUpstream.removeEventListener('abort', signalHandler);
    };
  }
  const result = f(ctx as C, ...args);
  // The `abortController` must be shared in the `finally` clause
  // to link up final promise's cancellation with the target
  // function's signal
  return new PromiseCancellable<R>((resolve, reject, signal) => {
    if (!lazy) {
      if (signal.aborted) {
        reject(signal.reason);
      } else {
        signal.addEventListener('abort', () => {
          reject(signal.reason);
        });
      }
    }
    void result.then(resolve, reject);
  }, abortController).finally(() => {
    teardownContext();
  }, abortController);
}

function timedCancellable<C extends ContextTimed, P extends Array<any>, R>(
  f: (ctx: C, ...params: P) => PromiseLike<R>,
  lazy: boolean = false,
  delay: number = Infinity,
  errorTimeoutConstructor: new () => Error = contextsErrors.ErrorContextsTimedTimeOut,
): (...params: ContextAndParameters<C, P>) => PromiseCancellable<R> {
  return (...params) => {
    const ctx = params[0] != null ? { ...params[0] } : {};
    const args = params.slice(1) as P;
    return setupTimedCancellable(
      f,
      lazy,
      delay,
      errorTimeoutConstructor,
      ctx,
      args,
    );
  };
}

export default timedCancellable;

export { setupTimedCancellable };
