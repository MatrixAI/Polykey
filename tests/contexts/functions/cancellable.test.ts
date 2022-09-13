import type { ContextCancellable } from '@/contexts/types';
import { PromiseCancellable } from '@matrixai/async-cancellable';
import cancellable from '@/contexts/functions/cancellable';
import { AsyncFunction, sleep } from '@/utils';

describe('context/functions/cancellable', () => {
  describe('cancellable decorator syntax', () => {
    test('async function', async () => {
      const f = async function (
        ctx: ContextCancellable,
        a: number,
        b: number,
      ): Promise<number> {
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        return a + b;
      };
      const fCancellable = cancellable(f);
      const pC = fCancellable(undefined, 1, 2);
      expect(pC).toBeInstanceOf(PromiseCancellable);
      await pC;
      await fCancellable({}, 1, 2);
      await fCancellable({ signal: new AbortController().signal }, 1, 2);
      expect(fCancellable).toBeInstanceOf(Function);
      expect(fCancellable).not.toBeInstanceOf(AsyncFunction);
    });
  });
  describe('cancellable cancellation', () => {
    test('async function cancel - eager', async () => {
      const f = async (ctx: ContextCancellable): Promise<string> => {
        expect(ctx.signal.aborted).toBe(false);
        while (true) {
          if (ctx.signal.aborted) break;
          await sleep(1);
        }
        return 'hello world';
      };
      const fCancellable = cancellable(f);
      const pC = fCancellable();
      await sleep(1);
      pC.cancel();
      await expect(pC).rejects.toBeUndefined();
    });
    test('async function cancel - lazy', async () => {
      const f = async (ctx: ContextCancellable): Promise<string> => {
        expect(ctx.signal.aborted).toBe(false);
        while (true) {
          if (ctx.signal.aborted) break;
          await sleep(1);
        }
        return 'hello world';
      };
      const fCancellable = cancellable(f, true);
      const pC = fCancellable();
      await sleep(1);
      pC.cancel();
      await expect(pC).resolves.toBe('hello world');
    });
    test('async function cancel with custom error and eager rejection', async () => {
      const f = async (ctx: ContextCancellable): Promise<string> => {
        expect(ctx.signal.aborted).toBe(false);
        while (true) {
          if (ctx.signal.aborted) break;
          await sleep(1);
        }
        return 'hello world';
      };
      const fCancellable = cancellable(f, false);
      const pC = fCancellable();
      await sleep(1);
      pC.cancel('cancel reason');
      await expect(pC).rejects.toBe('cancel reason');
    });
    test('async function cancel with custom error and lazy rejection', async () => {
      const f = async (ctx: ContextCancellable): Promise<string> => {
        expect(ctx.signal.aborted).toBe(false);
        while (true) {
          if (ctx.signal.aborted) {
            throw ctx.signal.reason;
          }
          await sleep(1);
        }
      };
      const fCancellable = cancellable(f, true);
      const pC = fCancellable();
      await sleep(1);
      pC.cancel('cancel reason');
      await expect(pC).rejects.toBe('cancel reason');
    });
    test('promise cancellable function - eager rejection', async () => {
      const f = (ctx: ContextCancellable): PromiseCancellable<string> => {
        const pC = new PromiseCancellable<string>((resolve, reject, signal) => {
          if (signal.aborted) {
            reject('eager 2:' + signal.reason);
          } else {
            signal.onabort = () => {
              reject('lazy 2:' + signal.reason);
            };
          }
          void sleep(10).then(() => {
            resolve('hello world');
          });
        });
        if (ctx.signal.aborted) {
          pC.cancel('eager 1:' + ctx.signal.reason);
        } else {
          ctx.signal.onabort = () => {
            pC.cancel('lazy 1:' + ctx.signal.reason);
          };
        }
        return pC;
      };
      const fCancellable = cancellable(f);
      // Signal is aborted afterwards
      const pC1 = fCancellable();
      pC1.cancel('cancel reason');
      await expect(pC1).rejects.toBe('cancel reason');
      // Signal is already aborted
      const abortController = new AbortController();
      abortController.abort('cancel reason');
      const pC2 = fCancellable({ signal: abortController.signal });
      await expect(pC2).rejects.toBe('cancel reason');
    });
    test('promise cancellable function - lazy rejection', async () => {
      const f = (ctx: ContextCancellable): PromiseCancellable<string> => {
        const pC = new PromiseCancellable<string>((resolve, reject, signal) => {
          if (signal.aborted) {
            reject('eager 2:' + signal.reason);
          } else {
            signal.onabort = () => {
              reject('lazy 2:' + signal.reason);
            };
          }
          void sleep(10).then(() => {
            resolve('hello world');
          });
        });
        if (ctx.signal.aborted) {
          pC.cancel('eager 1:' + ctx.signal.reason);
        } else {
          ctx.signal.onabort = () => {
            pC.cancel('lazy 1:' + ctx.signal.reason);
          };
        }
        return pC;
      };
      const fCancellable = cancellable(f, true);
      // Signal is aborted afterwards
      const pC1 = fCancellable();
      pC1.cancel('cancel reason');
      await expect(pC1).rejects.toBe('lazy 2:lazy 1:cancel reason');
      // Signal is already aborted
      const abortController = new AbortController();
      abortController.abort('cancel reason');
      const pC2 = fCancellable({ signal: abortController.signal });
      await expect(pC2).rejects.toBe('lazy 2:eager 1:cancel reason');
    });
  });
  describe('cancellable propagation', () => {
    test('propagate signal', async () => {
      let signal: AbortSignal;
      const g = async (ctx: ContextCancellable): Promise<string> => {
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        // The signal is actually not the same
        // it is chained instead
        expect(signal).not.toBe(ctx.signal);
        return new Promise((resolve, reject) => {
          if (ctx.signal.aborted) {
            reject('early:' + ctx.signal.reason);
          } else {
            const timeout = setTimeout(() => {
              resolve('g');
            }, 10);
            ctx.signal.addEventListener('abort', () => {
              clearTimeout(timeout);
              reject('during:' + ctx.signal.reason);
            });
          }
        });
      };
      const gCancellable = cancellable(g, true);
      const f = async (ctx: ContextCancellable): Promise<string> => {
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        signal = ctx.signal;
        return await gCancellable(ctx);
      };
      const fCancellable = cancellable(f, true);
      const pC1 = fCancellable();
      await expect(pC1).resolves.toBe('g');
      expect(signal!.aborted).toBe(false);
      const pC2 = fCancellable();
      pC2.cancel('cancel reason');
      await expect(pC2).rejects.toBe('during:cancel reason');
      expect(signal!.aborted).toBe(true);
      const abortController = new AbortController();
      abortController.abort('cancel reason');
      const pC3 = fCancellable({ signal: abortController.signal });
      await expect(pC3).rejects.toBe('early:cancel reason');
      expect(signal!.aborted).toBe(true);
    });
    test('nested cancellable - lazy then lazy', async () => {
      const f = async (ctx: ContextCancellable): Promise<string> => {
        expect(ctx.signal.aborted).toBe(false);
        while (true) {
          if (ctx.signal.aborted) {
            throw 'throw:' + ctx.signal.reason;
          }
          await sleep(1);
        }
      };
      const fCancellable = cancellable(cancellable(f, true), true);
      const pC = fCancellable();
      await sleep(1);
      pC.cancel('cancel reason');
      await expect(pC).rejects.toBe('throw:cancel reason');
    });
    test('nested cancellable - lazy then eager', async () => {
      const f = async (ctx: ContextCancellable): Promise<string> => {
        expect(ctx.signal.aborted).toBe(false);
        while (true) {
          if (ctx.signal.aborted) {
            throw 'throw:' + ctx.signal.reason;
          }
          await sleep(1);
        }
      };
      const fCancellable = cancellable(cancellable(f, true), false);
      const pC = fCancellable();
      await sleep(1);
      pC.cancel('cancel reason');
      await expect(pC).rejects.toBe('cancel reason');
    });
    test('nested cancellable - eager then lazy', async () => {
      const f = async (ctx: ContextCancellable): Promise<string> => {
        expect(ctx.signal.aborted).toBe(false);
        while (true) {
          if (ctx.signal.aborted) {
            throw 'throw:' + ctx.signal.reason;
          }
          await sleep(1);
        }
      };
      const fCancellable = cancellable(cancellable(f, false), true);
      const pC = fCancellable();
      await sleep(1);
      pC.cancel('cancel reason');
      await expect(pC).rejects.toBe('cancel reason');
    });
    test('signal event listeners are removed', async () => {
      const f = async (_ctx: ContextCancellable): Promise<string> => {
        return 'hello world';
      };
      const abortController = new AbortController();
      let listenerCount = 0;
      const signal = new Proxy(abortController.signal, {
        get(target, prop, receiver) {
          if (prop === 'addEventListener') {
            return function addEventListener(...args) {
              listenerCount++;
              return target[prop].apply(this, args);
            };
          } else if (prop === 'removeEventListener') {
            return function addEventListener(...args) {
              listenerCount--;
              return target[prop].apply(this, args);
            };
          } else {
            return Reflect.get(target, prop, receiver);
          }
        },
      });
      const fCancellable = cancellable(f);
      await fCancellable({ signal });
      await fCancellable({ signal });
      const pC = fCancellable({ signal });
      pC.cancel();
      await expect(pC).rejects.toBe(undefined);
      expect(listenerCount).toBe(0);
    });
  });
});
