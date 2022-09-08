import type { ContextCancellable } from "../types";
import { PromiseCancellable } from '@matrixai/async-cancellable';

function cancellable<P extends Array<any>, R>(
  f: ((...params: [ContextCancellable, ...P]) => PromiseLike<R>),
  lazy: boolean = false,
): (...params: [Partial<ContextCancellable>?, ...P]) => PromiseCancellable<R> {
  return (ctx?: Partial<ContextCancellable>, ...args: P) => {
    if (ctx == null) {
      ctx = {};
    }
    if (ctx.signal === undefined) {
      const abortController = new AbortController();
      ctx.signal = abortController.signal;
      const result = f(ctx as ContextCancellable, ...args);
      return new PromiseCancellable<R>((resolve, reject, signal) => {
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
      const signalUpstream = ctx.signal;
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
      const result = f(ctx as ContextCancellable, ...args);
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
        signalUpstream.removeEventListener('abort', signalHandler);
      }, abortController);
    }
  };
}

export default cancellable;
