import type { ContextTimed } from '../types';
import { Timer } from '@matrixai/timer';
import * as contextsUtils from '../utils';
import * as contextsErrors from '../errors';
import * as utils from '../../utils';

/**
 * This sets up the context
 * This will mutate the `params` parameter
 * It returns a teardown function to be called
 * when the target function is finished
 */
function setupContext(
  delay: number,
  errorTimeoutConstructor: new () => Error,
  targetName: string,
  key: string | symbol,
  contextIndex: number,
  params: Array<any>,
): () => void {
  let context: Partial<ContextTimed> = params[contextIndex];
  if (context === undefined) {
    context = {};
    params[contextIndex] = context;
  }
  // Runtime type check on the context parameter
  if (typeof context !== 'object' || context === null) {
    throw new TypeError(
      `\`${targetName}.${key.toString()}\` decorated \`@context\` parameter is not a context object`,
    );
  }
  if (context.timer !== undefined && !(context.timer instanceof Timer)) {
    throw new TypeError(
      `\`${targetName}.${key.toString()}\` decorated \`@context\` parameter's \`timer\` property is not an instance of \`Timer\``,
    );
  }
  if (
    context.signal !== undefined &&
    !(context.signal instanceof AbortSignal)
  ) {
    throw new TypeError(
      `\`${targetName}.${key.toString()}\` decorated \`@context\` parameter's \`signal\` property is not an instance of \`AbortSignal\``,
    );
  }
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
  if (context.timer === undefined && context.signal === undefined) {
    const abortController = new AbortController();
    const e = new errorTimeoutConstructor();
    // Property A
    const timer = new Timer(() => void abortController.abort(e), delay);
    abortController.signal.addEventListener('abort', () => {
      // Property B
      timer.cancel();
    });
    context.signal = abortController.signal;
    context.timer = timer;
    return () => {
      // Property C
      timer.cancel();
    };
  } else if (
    context.timer === undefined &&
    context.signal instanceof AbortSignal
  ) {
    const abortController = new AbortController();
    const e = new errorTimeoutConstructor();
    // Property A
    const timer = new Timer(() => void abortController.abort(e), delay);
    const signalUpstream = context.signal;
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
    // Overwrite the signal property with this context's `AbortController.signal`
    context.signal = abortController.signal;
    context.timer = timer;
    return () => {
      signalUpstream.removeEventListener('abort', signalHandler);
      // Property C
      timer.cancel();
    };
  } else if (context.timer instanceof Timer && context.signal === undefined) {
    const abortController = new AbortController();
    const e = new errorTimeoutConstructor();
    let finished = false;
    // If the timer resolves, then abort the target function
    void context.timer.then(
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
    context.signal = abortController.signal;
    return () => {
      finished = true;
    };
  } else {
    // In this case, `context.timer` and `context.signal` are both instances of
    // `Timer` and `AbortSignal` respectively
    // It is assumed that both the timer and signal are already hooked up to each other
    return () => {};
  }
}

/**
 * Timed method decorator
 */
function timed(
  delay: number = Infinity,
  errorTimeoutConstructor: new () => Error = contextsErrors.ErrorContextsTimedTimeOut,
) {
  return (
    target: any,
    key: string | symbol,
    descriptor: TypedPropertyDescriptor<(...params: Array<any>) => any>,
  ) => {
    // Target is instance prototype for instance methods
    // or the class prototype for static methods
    const targetName = target['name'] ?? target.constructor.name;
    const f = descriptor['value'];
    if (typeof f !== 'function') {
      throw new TypeError(
        `\`${targetName}.${key.toString()}\` is not a function`,
      );
    }
    const contextIndex = contextsUtils.contexts.get(target[key]);
    if (contextIndex == null) {
      throw new TypeError(
        `\`${targetName}.${key.toString()}\` does not have a \`@context\` parameter decorator`,
      );
    }
    if (f instanceof utils.AsyncFunction) {
      descriptor['value'] = async function (...params) {
        const teardownContext = setupContext(
          delay,
          errorTimeoutConstructor,
          targetName,
          key,
          contextIndex,
          params,
        );
        try {
          return await f.apply(this, params);
        } finally {
          teardownContext();
        }
      };
    } else if (f instanceof utils.GeneratorFunction) {
      descriptor['value'] = function* (...params) {
        const teardownContext = setupContext(
          delay,
          errorTimeoutConstructor,
          targetName,
          key,
          contextIndex,
          params,
        );
        try {
          return yield* f.apply(this, params);
        } finally {
          teardownContext();
        }
      };
    } else if (f instanceof utils.AsyncGeneratorFunction) {
      descriptor['value'] = async function* (...params) {
        const teardownContext = setupContext(
          delay,
          errorTimeoutConstructor,
          targetName,
          key,
          contextIndex,
          params,
        );
        try {
          return yield* f.apply(this, params);
        } finally {
          teardownContext();
        }
      };
    } else {
      descriptor['value'] = function (...params) {
        const teardownContext = setupContext(
          delay,
          errorTimeoutConstructor,
          targetName,
          key,
          contextIndex,
          params,
        );
        const result = f.apply(this, params);
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
    // Preserve the name
    Object.defineProperty(descriptor['value'], 'name', {
      value: typeof key === 'symbol' ? `[${key.description}]` : key,
    });
    return descriptor;
  };
}

export default timed;
