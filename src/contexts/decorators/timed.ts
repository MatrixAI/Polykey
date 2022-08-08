import * as contextsUtils from '../utils';
import * as contextsErrors from '../errors';
import Timer from '../../timer/Timer';
import * as timerErrors from '../../timer/errors';
import {
  AsyncFunction,
  GeneratorFunction,
  AsyncGeneratorFunction
} from '../../utils';

/**
 * Timed method decorator
 */
function timed(delay: number = Infinity) {
  return (
    target: any,
    key: string | symbol,
    descriptor: TypedPropertyDescriptor<(...params: any[]) => any>
  ): TypedPropertyDescriptor<(...params: any[]) => any>  => {
    const targetName = (target['name'] ?? target.constructor.name);
    const f = descriptor['value'];
    if (typeof f !== 'function') {
      throw new TypeError(`\`${targetName}.${key.toString()}\` is not a function`);
    }
    const contextIndex = contextsUtils.contexts.get(target[key]);
    if (contextIndex == null) {
      throw new TypeError(`\`${targetName}.${key.toString()}\` does not have a \`@context\` parameter decorator`);
    }
    const wrap = (that: any, params: Array<any>) => {
      const context = params[contextIndex];
      if (context !== undefined && (typeof context !== 'object' || context === null)) {
        throw new TypeError(
          `\`${targetName}.${key.toString()}\` decorated \`@context\` parameter is not a context object`
        );
      }
      if (context?.timer !== undefined && !(context.timer instanceof Timer)) {
        throw new TypeError(
          `\`${targetName}.${key.toString()}\` decorated \`@context\` parameter's \`timer\` property is not an instance of \`Timer\``
        );
      }
      if (context?.signal !== undefined && !(context.signal instanceof AbortSignal)) {
        throw new TypeError(
          `\`${targetName}.${key.toString()}\` decorated \`@context\` parameter's \`signal\` property is not an instance of \`AbortSignal\``
        );
      }
      // Now `context: { timer: Timer | undefined; signal: AbortSignal | undefined } | undefined`
      if (
        context === undefined ||
        context.timer === undefined && context.signal === undefined
      ) {
        const abortController = new AbortController();
        const timer = new Timer({
          delay,
          handler: () => void abortController.abort(new contextsErrors.ErrorContextsTimerExpired)
        });
        params[contextIndex] = (context !== undefined) ? context : {};
        params[contextIndex].signal = abortController.signal;
        params[contextIndex].timer = timer;
        const result = f.apply(that, params);
        timer.catch((e) => {
          // Ignore cancellation
          if (!(e instanceof timerErrors.ErrorTimerCancelled)) {
            throw e;
          }
        });
        timer.cancel();
        return result;
      } else if (
        context.timer === undefined &&
        context.signal instanceof AbortSignal
      ) {
        const abortController = new AbortController();
        const timer = new Timer({
          delay,
          handler: () => void abortController.abort(new contextsErrors.ErrorContextsTimerExpired)
        });
        context.signal.onabort = () => void abortController.abort(context.signal.reason);
        params[contextIndex].signal = abortController.signal;
        params[contextIndex].timer = timer;
        const result = f.apply(that, params);
        timer.catch((e) => {
          // Ignore cancellation
          if (!(e instanceof timerErrors.ErrorTimerCancelled)) {
            throw e;
          }
        });
        timer.cancel();
        return result;
      } else if (
        context.timer instanceof Timer &&
        context.signal === undefined
      ) {
        const abortController = new AbortController();
        context.timer.then(() => void abortController.abort(new contextsErrors.ErrorContextsTimerExpired));
        params[contextIndex].signal = abortController.signal;
        return f.apply(that, params);
      } else if (
        context.timer instanceof Timer && context.signal instanceof AbortSignal
      ) {
        return f.apply(that, params);
      }
    };
    if (f instanceof AsyncFunction) {
      descriptor['value'] = async function (...params) {
        return wrap(this, params);
      };
    } else if (f instanceof GeneratorFunction) {
      descriptor['value'] = function* (...params) {
        return yield* wrap(this, params);
      };
    } else if (f instanceof AsyncGeneratorFunction) {
      descriptor['value'] = async function* (...params) {
        return yield* wrap(this, params);
      };
    } else {
      descriptor['value'] = function (...params) {
        return wrap(this, params);
      };
    }
    // Preserve the name
    Object.defineProperty(descriptor['value'], 'name', {
      value: (typeof key === 'symbol') ? `[${key.description}]` : key
    });
    return descriptor;
  };
}

export default timed;
