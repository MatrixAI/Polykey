import type { ContextTimed } from '../types';
import * as contextsUtils from '../utils';
import * as contextsErrors from '../errors';
import Timer from '../../timer/Timer';
import {
  AsyncFunction,
  GeneratorFunction,
  AsyncGeneratorFunction,
} from '../../utils';

type TimedDecorator = {
  <T extends (...params: Array<any>) => Promise<any>>(
    target: any,
    key: string | symbol,
    descriptor: TypedPropertyDescriptor<T>,
  ): TypedPropertyDescriptor<T>;
  <T extends (...params: Array<any>) => Generator<any, any, any>>(
    target: any,
    key: string | symbol,
    descriptor: TypedPropertyDescriptor<T>,
  ): TypedPropertyDescriptor<T>;
  <T extends (...params: Array<any>) => AsyncGenerator<any, any, any>>(
    target: any,
    key: string | symbol,
    descriptor: TypedPropertyDescriptor<T>,
  ): TypedPropertyDescriptor<T>;
};

/**
 * This sets up the context
 * This will mutate the `params` parameter
 * It returns a teardown function to be called
 * when the target function is finished
 */
function setupContext(
  delay: number,
  errorTimeout: new () => Error,
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
  // Mutating the `context` parameter
  if (context.timer === undefined && context.signal === undefined) {
    const abortController = new AbortController();
    const timer = new Timer(
      () => void abortController.abort(new errorTimeout()),
      delay,
    );
    context.signal = abortController.signal;
    context.timer = timer;
    return () => {
      // Ignore the cancellation
      void timer.catch(() => {});
      timer.cancel();
    };
  } else if (
    context.timer === undefined &&
    context.signal instanceof AbortSignal
  ) {
    const abortController = new AbortController();
    const timer = new Timer(
      () => void abortController.abort(new errorTimeout()),
      delay,
    );
    // Chain the upstream abort signal to this context
    const signalHandler = () =>
      void abortController.abort(context.signal!.reason);
    context.signal.addEventListener('abort', signalHandler);
    // Overwrite the signal property with this context's `AbortController.signal`
    context.signal = abortController.signal;
    context.timer = timer;
    return () => {
      context.signal!.removeEventListener('abort', signalHandler);
      // Ignore the cancellation
      void timer.catch(() => {});
      timer.cancel();
    };
  } else if (context.timer instanceof Timer && context.signal === undefined) {
    const abortController = new AbortController();
    let finished = false;
    // If the timer resolves, then abort the target function
    context.timer.then((r: any, s: AbortSignal) => {
      // If the timer is aborted after it resolves
      // then don't bother aborting the target function
      if (!finished || !s.aborted) {
        abortController.abort(new errorTimeout());
      }
      return r;
    });
    context.signal = abortController.signal;
    return () => {
      finished = true;
    };
  } else {
    // In this case, `context.timer` and `context.signal` are both instances of
    // `Timer` and `AbortSignal` respectively
    return () => {};
  }
}

/**
 * Timed method decorator
 */
function timed(
  delay: number = Infinity,
  errorTimeout: new () => Error = contextsErrors.ErrorContextsTimedExpiry,
): TimedDecorator {
  return (
    target: any,
    key: string | symbol,
    descriptor: TypedPropertyDescriptor<Function>,
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
    if (f instanceof AsyncFunction) {
      descriptor['value'] = async function (...params) {
        const teardownContext = setupContext(
          delay,
          errorTimeout,
          target,
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
    } else if (f instanceof GeneratorFunction) {
      descriptor['value'] = function* (...params) {
        const teardownContext = setupContext(
          delay,
          errorTimeout,
          target,
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
    } else if (f instanceof AsyncGeneratorFunction) {
      descriptor['value'] = async function* (...params) {
        const teardownContext = setupContext(
          delay,
          errorTimeout,
          target,
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
          errorTimeout,
          target,
          key,
          contextIndex,
          params,
        );
        return f.apply(this, params).finally(() => {
          teardownContext();
        });
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

export type { TimedDecorator };
