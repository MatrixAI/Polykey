import type { ContextCancellable } from '../types';
import { PromiseCancellable } from '@matrixai/async-cancellable';
import * as contextsUtils from '../utils';

function cancellable(lazy: boolean = false) {
  return <
    T extends TypedPropertyDescriptor<
      (...params: Array<any>) => PromiseLike<any>
    >,
  >(
    target: any,
    key: string | symbol,
    descriptor: T,
  ): T => {
    // Target is instance prototype for instance methods // or the class prototype for static methods
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
    descriptor['value'] = function (...params) {
      let context: Partial<ContextCancellable> = params[contextIndex];
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
      if (
        context.signal !== undefined &&
        !(context.signal instanceof AbortSignal)
      ) {
        throw new TypeError(
          `\`${targetName}.${key.toString()}\` decorated \`@context\` parameter's \`signal\` property is not an instance of \`AbortSignal\``,
        );
      }
      // Mutating the `context` parameter
      if (context.signal === undefined) {
        const abortController = new AbortController();
        context.signal = abortController.signal;
        const result = f.apply(this, params);
        return new PromiseCancellable((resolve, reject, signal) => {
          if (!lazy) {
            signal.addEventListener('abort', () => {
              reject(signal.reason);
            });
          }
          void result.then(resolve, reject);
        }, abortController);
      } else {
        // In this case, `context.signal` is set
        // and we chain the upsteam signal to the downstream signal
        const abortController = new AbortController();
        const signalUpstream = context.signal;
        const signalHandler = () => {
          abortController.abort(signalUpstream.reason);
        };
        if (signalUpstream.aborted) {
          abortController.abort(signalUpstream.reason);
        } else {
          signalUpstream.addEventListener('abort', signalHandler);
        }
        // Overwrite the signal property with this context's `AbortController.signal`
        context.signal = abortController.signal;
        const result = f.apply(this, params);
        // The `abortController` must be shared in the `finally` clause
        // to link up final promise's cancellation with the target
        // function's signal
        return new PromiseCancellable((resolve, reject, signal) => {
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
          signalUpstream.removeEventListener('abort', signalHandler);
        }, abortController);
      }
    };
    // Preserve the name
    Object.defineProperty(descriptor['value'], 'name', {
      value: typeof key === 'symbol' ? `[${key.description}]` : key,
    });
    return descriptor;
  };
}

export default cancellable;
