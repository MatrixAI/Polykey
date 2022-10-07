import type { ContextTimed } from '../types';
import { setupTimedCancellable } from '../functions/timedCancellable';
import * as contextsUtils from '../utils';
import * as contextsErrors from '../errors';

function timedCancellable(
  lazy: boolean | ((object: any) => boolean) = false,
  delay: number | ((object: any) => number) = Infinity,
  errorTimeoutConstructor: new () => Error = contextsErrors.ErrorContextsTimedTimeOut,
) {
  return <
    T extends TypedPropertyDescriptor<
      (...params: Array<any>) => PromiseLike<any>
    >,
  >(
    target: any,
    key: string | symbol,
    descriptor: T,
  ) => {
    // Target is instance prototype for instance methods
    // or the class prototype for static methods
    const targetName: string = target['name'] ?? target.constructor.name;
    const f = descriptor['value'];
    if (typeof f !== 'function') {
      throw new TypeError(
        `\`${targetName}.${key.toString()}\` is not a function`,
      );
    }
    const contextIndex = contextsUtils.getContextIndex(target, key, targetName);
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
      const lazy_ = typeof lazy === 'boolean' ? lazy : lazy(this);
      const delay_ = typeof delay === 'number' ? delay : delay(this);
      return setupTimedCancellable(
        (_, ...args) => f.apply(this, args),
        lazy_,
        delay_,
        errorTimeoutConstructor,
        ctx,
        args,
      );
    };
    // Preserve the name
    Object.defineProperty(descriptor['value'], 'name', {
      value: typeof key === 'symbol' ? `[${key.description}]` : key,
    });
    return descriptor;
  };
}

export default timedCancellable;
