import type { ContextTimed } from '../types';
import * as contextsErrors from '../errors';
import Timer from '../../timer/Timer';
import * as utils from '../../utils';

function setupContext(
  delay: number,
  errorTimeoutConstructor: new () => Error,
  ctx: Partial<ContextTimed>,
): () => void {
  // Mutating the `context` parameter
  if (ctx.timer === undefined && ctx.signal === undefined) {
    const abortController = new AbortController();
    const e = new errorTimeoutConstructor();
    const timer = new Timer(() => void abortController.abort(e), delay);
    ctx.signal = abortController.signal;
    ctx.timer = timer;
    return () => {
      timer.cancel();
    };
  } else if (
    ctx.timer === undefined &&
    ctx.signal instanceof AbortSignal
  ) {
    const abortController = new AbortController();
    const e = new errorTimeoutConstructor();
    const timer = new Timer(() => void abortController.abort(e), delay);
    const signalUpstream = ctx.signal;
    const signalHandler = () => {
      timer.cancel();
      abortController.abort(signalUpstream.reason);
    };
    // If already aborted, abort target and cancel the timer
    if (signalUpstream.aborted) {
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
    const signalHandler = () => {
      ctx!.timer!.cancel();
    };
    if (ctx.signal!.aborted) {
      ctx.timer!.cancel();
    } else {
      ctx.signal!.addEventListener('abort', signalHandler);
    }
    return () => {
      ctx!.signal!.removeEventListener('abort', signalHandler);
    };
  }
}

/**
 * Timed HOF
 * This overloaded signature is external signature
 */
function timed<P extends Array<any>, R>(
  f: ((...params: [ContextTimed, ...P]) => R),
  delay?: number,
  errorTimeoutConstructor?: new () => Error,
): (...params: [Partial<ContextTimed>?, ...P]) => R;
function timed<P extends Array<any>>(
  f: ((...params: [ContextTimed, ...P]) => any),
  delay: number = Infinity,
  errorTimeoutConstructor: new () => Error = contextsErrors.ErrorContextsTimedExpiry,
): ((...params: [Partial<ContextTimed>?, ...P]) => any) {
  if (f instanceof utils.AsyncFunction) {
    return async (ctx?: Partial<ContextTimed>, ...args: P) => {
      if (ctx == null) {
        ctx = {};
      }
      const teardownContext = setupContext(
        delay,
        errorTimeoutConstructor,
        ctx,
      );
      try {
        return await f(ctx as ContextTimed, ...args);
      } finally {
        teardownContext();
      }
    };
  } else if (f instanceof utils.GeneratorFunction) {
    return function* (ctx?: Partial<ContextTimed>, ...args: P) {
      if (ctx == null) {
        ctx = {};
      }
      const teardownContext = setupContext(
        delay,
        errorTimeoutConstructor,
        ctx,
      );
      try {
        return yield* f(ctx as ContextTimed, ...args);
      } finally {
        teardownContext();
      }
    };
  } else if (f instanceof utils.AsyncGeneratorFunction) {
    return async function* (ctx?: Partial<ContextTimed>, ...args: P) {
      if (ctx == null) {
        ctx = {};
      }
      const teardownContext = setupContext(
        delay,
        errorTimeoutConstructor,
        ctx,
      );
      try {
        return yield* f(ctx as ContextTimed, ...args);
      } finally {
        teardownContext();
      }
    };
  } else {
    return (ctx?: Partial<ContextTimed>, ...args: P) => {
      if (ctx == null) {
        ctx = {};
      }
      const teardownContext = setupContext(
        delay,
        errorTimeoutConstructor,
        ctx,
      );
      const result = f(ctx as ContextTimed, ...args);
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
      } else if (utils.isIterable(result)) {
        return (function* () {
          try {
            return yield* result;
          } finally {
            teardownContext();
          }
        })();
      } else if (utils.isAsyncIterable(result)) {
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
