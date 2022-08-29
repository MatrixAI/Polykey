import * as contextsUtils from '../utils';
import * as contextsErrors from '../errors';
import Timer from '../../timer/Timer';
import {
  AsyncFunction,
  GeneratorFunction,
  AsyncGeneratorFunction,
} from '../../utils';

// @timed(100, TimeoutError)
// do we "construct" the exception
// or should we pass in the Error()
// at that point?
// becuase if you get it in the context
// the stack looks wrong
// yea, that makes sense...
// the problem is that it doesn't show the context of the call
// ti shows the context of where it was first constructed
// but on the otherh and, we end up with the same problem
// and you can provide a "default" error in this case
// it should be "overridable" then
// of course the issue is that you have pass a unction can be newed
// so { new : }
// and then you don't have any constructor relationship
// or you have to put it in the right interface
// at any case... at the very least the stack trace is about who this is called!!!
// but at the same time time...
// type X = new (...args: Array<any>) => Error;
// const x: X = Error;
// const y = new x('abc');
// new timeoutError
// new errorDestroyed
// throw errorDestroyed

function checkContext(
  context: any,
  targetName: string,
  key: string | symbol,
): asserts context is
  | {
      timer: Timer | undefined;
      signal: AbortSignal | undefined;
    }
  | undefined {
  if (
    context !== undefined &&
    (typeof context !== 'object' || context === null)
  ) {
    throw new TypeError(
      `\`${targetName}.${key.toString()}\` decorated \`@context\` parameter is not a context object`,
    );
  }
  if (context?.timer !== undefined && !(context.timer instanceof Timer)) {
    throw new TypeError(
      `\`${targetName}.${key.toString()}\` decorated \`@context\` parameter's \`timer\` property is not an instance of \`Timer\``,
    );
  }
  if (
    context?.signal !== undefined &&
    !(context.signal instanceof AbortSignal)
  ) {
    throw new TypeError(
      `\`${targetName}.${key.toString()}\` decorated \`@context\` parameter's \`signal\` property is not an instance of \`AbortSignal\``,
    );
  }
}

/**
 * Timed method decorator
 */
function timed(
  delay: number = Infinity,
  errorTimeout: new () => Error = contextsErrors.ErrorContextsTimerExpired,
) {
  return <
    T extends (
      ...params: Array<any>
    ) => Promise<unknown> | Generator | AsyncGenerator,
  >(
    target: any,
    key: string | symbol,
    descriptor: TypedPropertyDescriptor<T>,
  ): TypedPropertyDescriptor<T> => {
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

    // Const checkContext = (context: any): asserts context is { timer: Timer | undefined; signal: AbortSignal | undefined } | undefined => {
    // };

    const wrap = (that: any, params: Array<any>) => {
      const context: unknown = params[contextIndex];
      checkContext(context, target, key);

      // Now `context: { timer: Timer | undefined; signal: AbortSignal | undefined } | undefined`
      if (
        context === undefined ||
        (context.timer === undefined && context.signal === undefined)
      ) {
        const abortController = new AbortController();
        const timer = new Timer(
          () => void abortController.abort(new errorTimeout()),
          delay,
        );
        params[contextIndex] = context !== undefined ? context : {};
        params[contextIndex].signal = abortController.signal;
        params[contextIndex].timer = timer;
        const result = f.apply(that, params);

        // Ok an error timeout
        // it sent in
        // it may then abort in a number of ways
        // who knows
        // we don't know what the result returns
        // like AT ALL
        // it only makes sense if this a promise
        // but now it doesn't even make sense at all here
        // if you are "cancelling" the timeout
        // i don't think this was the same

        class ErrorX extends Error {}

        timer.catch((e) => {
          // Ignore cancellation
          if (!(e instanceof ErrorX)) {
            throw e;
          }
        });
        timer.cancel(new ErrorX());
        return result;
      } else if (
        context.timer === undefined &&
        context.signal instanceof AbortSignal
      ) {
        const abortController = new AbortController();
        const timer = new Timer({
          delay,
          handler: () =>
            void abortController.abort(
              new contextsErrors.ErrorContextsTimerExpired(),
            ),
        });
        context.signal.onabort = () =>
          void abortController.abort(context.signal.reason);
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
        context.timer.then(
          () =>
            void abortController.abort(
              new contextsErrors.ErrorContextsTimerExpired(),
            ),
        );
        params[contextIndex].signal = abortController.signal;
        return f.apply(that, params);
      } else if (
        context.timer instanceof Timer &&
        context.signal instanceof AbortSignal
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
      value: typeof key === 'symbol' ? `[${key.description}]` : key,
    });
    return descriptor;
  };
}

export default timed;
