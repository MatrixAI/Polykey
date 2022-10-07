import type { ContextCancellable } from '../types';
import { PromiseCancellable } from '@matrixai/async-cancellable';

type ContextRemaining<C> = Omit<C, keyof ContextCancellable>;

type ContextAndParameters<
  C,
  P extends Array<any>,
> = keyof ContextRemaining<C> extends never
  ? [Partial<ContextCancellable>?, ...P]
  : [Partial<ContextCancellable> & ContextRemaining<C>, ...P];

function setupCancellable<
  C extends ContextCancellable,
  P extends Array<any>,
  R,
>(
  f: (ctx: C, ...params: P) => PromiseLike<R>,
  lazy: boolean,
  ctx: Partial<ContextCancellable>,
  args: P,
): PromiseCancellable<R> {
  if (ctx.signal === undefined) {
    const abortController = new AbortController();
    ctx.signal = abortController.signal;
    const result = f(ctx as C, ...args);
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
    const result = f(ctx as C, ...args);
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
}

function cancellable<C extends ContextCancellable, P extends Array<any>, R>(
  f: (ctx: C, ...params: P) => PromiseLike<R>,
  lazy: boolean = false,
): (...params: ContextAndParameters<C, P>) => PromiseCancellable<R> {
  return (...params) => {
    const ctx = params[0] != null ? { ...params[0] } : {};
    const args = params.slice(1) as P;
    return setupCancellable(f, lazy, ctx, args);
  };
}

export default cancellable;

export { setupCancellable };
