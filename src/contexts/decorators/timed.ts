import type { ContextTimed } from '../types';
import { setupTimedContext } from '../functions/timed';
import * as contextsUtils from '../utils';
import * as contextsErrors from '../errors';
import * as utils from '../../utils';

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
    const contextIndex = contextsUtils.getContextIndex(target, key, targetName);
    if (f instanceof utils.AsyncFunction) {
      descriptor['value'] = async function (...args) {
        let ctx: Partial<ContextTimed> = args[contextIndex];
        if (ctx === undefined) {
          ctx = {};
        } else {
          // Copy the ctx into a new ctx object to avoid mutating the ctx in case
          // it is used again
          ctx = { ...ctx };
        }
        args[contextIndex] = ctx;
        // Runtime type check on the context parameter
        contextsUtils.checkContextTimed(ctx, key, targetName);
        const teardownContext = setupTimedContext(
          delay,
          errorTimeoutConstructor,
          ctx,
        );
        try {
          return await f.apply(this, args);
        } finally {
          teardownContext();
        }
      };
    } else if (f instanceof utils.GeneratorFunction) {
      descriptor['value'] = function* (...args) {
        let ctx: Partial<ContextTimed> = args[contextIndex];
        if (ctx === undefined) {
          ctx = {};
        } else {
          // Copy the ctx into a new ctx object to avoid mutating the ctx in case
          // it is used again
          ctx = { ...ctx };
        }
        args[contextIndex] = ctx;
        // Runtime type check on the context parameter
        contextsUtils.checkContextTimed(ctx, key, targetName);
        const teardownContext = setupTimedContext(
          delay,
          errorTimeoutConstructor,
          ctx,
        );
        try {
          return yield* f.apply(this, args);
        } finally {
          teardownContext();
        }
      };
    } else if (f instanceof utils.AsyncGeneratorFunction) {
      descriptor['value'] = async function* (...args) {
        let ctx: Partial<ContextTimed> = args[contextIndex];
        if (ctx === undefined) {
          ctx = {};
        } else {
          // Copy the ctx into a new ctx object to avoid mutating the ctx in case
          // it is used again
          ctx = { ...ctx };
        }
        args[contextIndex] = ctx;
        // Runtime type check on the context parameter
        contextsUtils.checkContextTimed(ctx, key, targetName);
        const teardownContext = setupTimedContext(
          delay,
          errorTimeoutConstructor,
          ctx,
        );
        try {
          return yield* f.apply(this, args);
        } finally {
          teardownContext();
        }
      };
    } else {
      descriptor['value'] = function (...args) {
        let ctx: Partial<ContextTimed> = args[contextIndex];
        if (ctx === undefined) {
          ctx = {};
        } else {
          // Copy the ctx into a new ctx object to avoid mutating the ctx in case
          // it is used again
          ctx = { ...ctx };
        }
        args[contextIndex] = ctx;
        // Runtime type check on the context parameter
        contextsUtils.checkContextTimed(ctx, key, targetName);
        const teardownContext = setupTimedContext(
          delay,
          errorTimeoutConstructor,
          ctx,
        );
        const result = f.apply(this, args);
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
