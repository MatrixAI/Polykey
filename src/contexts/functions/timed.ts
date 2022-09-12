import type { ContextTimed } from '../types';
import { Timer } from '@matrixai/timer';
import * as contextsErrors from '../errors';
import * as utils from '../../utils';

type ContextRemaining<C> = Omit<C, keyof ContextTimed>;

type ContextAndParameters<
  C,
  P extends Array<any>,
> = keyof ContextRemaining<C> extends never
  ? [Partial<ContextTimed>?, ...P]
  : [Partial<ContextTimed> & ContextRemaining<C>, ...P];

function setupTimedContext(
  delay: number,
  errorTimeoutConstructor: new () => Error,
  ctx: Partial<ContextTimed>,
): () => void {
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
  if (ctx.timer === undefined && ctx.signal === undefined) {
    const abortController = new AbortController();
    const e = new errorTimeoutConstructor();
    // Property A
    const timer = new Timer(() => void abortController.abort(e), delay);
    abortController.signal.addEventListener('abort', () => {
      // Property B
      timer.cancel();
    });
    ctx.signal = abortController.signal;
    ctx.timer = timer;
    return () => {
      // Property C
      timer.cancel();
    };
  } else if (ctx.timer === undefined && ctx.signal instanceof AbortSignal) {
    const abortController = new AbortController();
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
    return () => {
      signalUpstream.removeEventListener('abort', signalHandler);
      // Property C
      timer.cancel();
    };
  } else if (ctx.timer instanceof Timer && ctx.signal === undefined) {
    const abortController = new AbortController();
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
    return () => {
      finished = true;
    };
  } else {
    // In this case, `ctx.timer` and `ctx.signal` are both instances of
    // `Timer` and `AbortSignal` respectively
    // It is assumed that both the timer and signal are already hooked up to each other
    return () => {};
  }
}

/**
 * Timed HOF
 * This overloaded signature is external signature
 */
function timed<C extends ContextTimed, P extends Array<any>, R>(
  f: (ctx: C, ...params: P) => R,
  delay?: number,
  errorTimeoutConstructor?: new () => Error,
): (...params: ContextAndParameters<C, P>) => R;
function timed<C extends ContextTimed, P extends Array<any>>(
  f: (ctx: C, ...params: P) => any,
  delay: number = Infinity,
  errorTimeoutConstructor: new () => Error = contextsErrors.ErrorContextsTimedTimeOut,
): (...params: ContextAndParameters<C, P>) => any {
  if (f instanceof utils.AsyncFunction) {
    return async (...params) => {
      const ctx = params[0] ?? {};
      const args = params.slice(1) as P;
      const teardownContext = setupTimedContext(
        delay,
        errorTimeoutConstructor,
        ctx,
      );
      try {
        return await f(ctx as C, ...args);
      } finally {
        teardownContext();
      }
    };
  } else if (f instanceof utils.GeneratorFunction) {
    return function* (...params) {
      const ctx = params[0] ?? {};
      const args = params.slice(1) as P;
      const teardownContext = setupTimedContext(
        delay,
        errorTimeoutConstructor,
        ctx,
      );
      try {
        return yield* f(ctx as C, ...args);
      } finally {
        teardownContext();
      }
    };
  } else if (f instanceof utils.AsyncGeneratorFunction) {
    return async function* (...params) {
      const ctx = params[0] ?? {};
      const args = params.slice(1) as P;
      const teardownContext = setupTimedContext(
        delay,
        errorTimeoutConstructor,
        ctx,
      );
      try {
        return yield* f(ctx as C, ...args);
      } finally {
        teardownContext();
      }
    };
  } else {
    return (...params) => {
      const ctx = params[0] ?? {};
      const args = params.slice(1) as P;
      const teardownContext = setupTimedContext(
        delay,
        errorTimeoutConstructor,
        ctx,
      );
      const result = f(ctx as C, ...args);
      if (utils.isPromiseLike(result)) {
        return result.then(
          (r) => {
            teardownContext();
            return r;
          },
          (e) => {
            teardownContext();
            throw e;
          },
        );
      } else if (utils.isGenerator(result)) {
        return (function* () {
          try {
            return yield* result;
          } finally {
            teardownContext();
          }
        })();
      } else if (utils.isAsyncGenerator(result)) {
        return (async function* () {
          try {
            return yield* result;
          } finally {
            teardownContext();
          }
        })();
      } else {
        teardownContext();
        return result;
      }
    };
  }
}

export default timed;

export { setupTimedContext };
