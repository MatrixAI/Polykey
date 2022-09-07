import type { ContextCancellable, ContextTransactional } from '@/contexts/types';
import { PromiseCancellable } from '@matrixai/async-cancellable';
import context from '@/contexts/decorators/context';
import cancellable from '@/contexts/decorators/cancellable';
import { AsyncFunction, sleep } from '@/utils';

describe('context/decorators/cancellable', () => {
  describe('cancellable decorator runtime validation', () => {
    test('cancellable decorator requires context decorator', async () => {
      expect(() => {
        class C {
          @cancellable()
          async f(_ctx: ContextCancellable): Promise<string> {
            return 'hello world';
          }
        }
        return C;
      }).toThrow(TypeError);
    });
    test('cancellable decorator fails on invalid context', async () => {
      await expect(async () => {
        class C {
          @cancellable()
          async f(@context _ctx: ContextCancellable): Promise<string> {
            return 'hello world';
          }
        }
        const c = new C();
        // @ts-ignore invalid context signal
        await c.f({ signal: 'lol' });
      }).rejects.toThrow(TypeError);
    });
  });
  describe('cancellable decorator syntax', () => {
    // Decorators cannot change type signatures
    // use overloading to change required context parameter to optional context parameter
    const symbolFunction = Symbol('sym');
    class X {
      functionPromise(
        ctx?: Partial<ContextCancellable>,
      ): PromiseCancellable<void>;
      @cancellable()
      functionPromise(@context ctx: ContextCancellable): Promise<void> {
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        return new Promise((resolve) => void resolve());
      }

      asyncFunction(
        ctx?: Partial<ContextCancellable>,
      ): PromiseCancellable<void>;
      @cancellable(true)
      async asyncFunction(@context ctx: ContextCancellable): Promise<void> {
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
      }

      [symbolFunction](
        ctx?: Partial<ContextCancellable>,
      ): PromiseCancellable<void>;
      @cancellable(false)
      [symbolFunction](@context ctx: ContextCancellable): Promise<void> {
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        return new Promise((resolve) => void resolve());
      }
    }
    const x = new X();
    test('functionPromise', async () => {
      const pC = x.functionPromise();
      expect(pC).toBeInstanceOf(PromiseCancellable);
      await pC;
      await x.functionPromise({});
      await x.functionPromise({ signal: new AbortController().signal });
      expect(x.functionPromise).toBeInstanceOf(Function);
      expect(x.functionPromise.name).toBe('functionPromise');
    });
    test('asyncFunction', async () => {
      const pC = x.asyncFunction();
      expect(pC).toBeInstanceOf(PromiseCancellable);
      await x.asyncFunction({});
      await x.asyncFunction({ signal: new AbortController().signal });
      expect(x.asyncFunction).toBeInstanceOf(Function);
      expect(x.asyncFunction).not.toBeInstanceOf(AsyncFunction);
      expect(x.asyncFunction.name).toBe('asyncFunction');
    });
    test('symbolFunction', async () => {
      const pC = x[symbolFunction]();
      expect(pC).toBeInstanceOf(PromiseCancellable);
      await x[symbolFunction]({});
      await x[symbolFunction]({ signal: new AbortController().signal });
      expect(x[symbolFunction]).toBeInstanceOf(Function);
      expect(x[symbolFunction].name).toBe('[sym]');
    });
  });
  describe('cancellable decorator cancellation', () => {
    test('async function cancel and eager rejection', async () => {
      class C {
        f(ctx?: Partial<ContextCancellable>): PromiseCancellable<string>;
        @cancellable()
        async f(@context ctx: ContextCancellable): Promise<string> {
          expect(ctx.signal.aborted).toBe(false);
          while (true) {
            if (ctx.signal.aborted) break;
            await sleep(1);
          }
          return 'hello world';
        }
      }
      const c = new C();
      const pC = c.f();
      await sleep(1);
      pC.cancel();
      await expect(pC).rejects.toBeUndefined();
    });
    test('async function cancel and lazy rejection', async () => {
      class C {
        f(ctx?: Partial<ContextCancellable>): PromiseCancellable<string>;
        @cancellable(true)
        async f(@context ctx: ContextCancellable): Promise<string> {
          expect(ctx.signal.aborted).toBe(false);
          while (true) {
            if (ctx.signal.aborted) break;
            await sleep(1);
          }
          return 'hello world';
        }
      }
      const c = new C();
      const pC = c.f();
      await sleep(1);
      pC.cancel();
      await expect(pC).resolves.toBe('hello world');
    });
    test('async function cancel with custom error and eager rejection', async () => {
      class C {
        f(ctx?: Partial<ContextCancellable>): PromiseCancellable<string>;
        @cancellable()
        async f(@context ctx: ContextCancellable): Promise<string> {
          expect(ctx.signal.aborted).toBe(false);
          while (true) {
            if (ctx.signal.aborted) break;
            await sleep(1);
          }
          return 'hello world';
        }
      }
      const c = new C();
      const pC = c.f();
      await sleep(1);
      pC.cancel('cancel reason');
      await expect(pC).rejects.toBe('cancel reason');
    });
    test('async function cancel with custom error and lazy rejection', async () => {
      class C {
        f(ctx?: Partial<ContextCancellable>): PromiseCancellable<string>;
        @cancellable(true)
        async f(@context ctx: ContextCancellable): Promise<string> {
          expect(ctx.signal.aborted).toBe(false);
          while (true) {
            if (ctx.signal.aborted) {
              throw ctx.signal.reason;
            }
            await sleep(1);
          }
        }
      }
      const c = new C();
      const pC = c.f();
      await sleep(1);
      pC.cancel('cancel reason');
      await expect(pC).rejects.toBe('cancel reason');
    });
    test('promise cancellable function', async () => {
      class C {
        f(ctx?: Partial<ContextCancellable>): PromiseCancellable<string>;
        @cancellable(true)
        f(@context ctx: ContextCancellable): PromiseCancellable<string> {
          const pC = new PromiseCancellable<string>((resolve, reject, signal) => {
            if (signal.aborted) {
              reject('eager 2:' + signal.reason);
            } else {
              signal.onabort = () => {
                reject('lazy 2:' + signal.reason);
              };
            }
            sleep(10).then(() => {
              resolve('hello world');
            });
          });
          if (ctx.signal.aborted) {
            pC.cancel('eager 1:' + ctx.signal.reason);
          } else {
            ctx.signal.onabort = () => {
              pC.cancel('lazy 1:' + ctx.signal.reason);
            }
          }
          return pC;
        }
      }
      const c = new C();
      // Signal is aborted afterwards
      const pC1 = c.f();
      pC1.cancel('cancel reason');
      await expect(pC1).rejects.toBe('lazy 2:lazy 1:cancel reason');
      // Signal is already aborted
      const abortController = new AbortController();
      abortController.abort('cancel reason');
      const pC2 = c.f({ signal: abortController.signal });
      await expect(pC2).rejects.toBe('lazy 2:eager 1:cancel reason');
    });


    // test('cancelling an existing PromiseCancellable', async () => {

    // });
  });
  describe('cancellable decorator propagation', () => {
    test('nested cancellable', async () => {
      class C {
        f(ctx?: Partial<ContextCancellable>): PromiseCancellable<string>;
        @cancellable(true)
        @cancellable(true)
        async f(@context ctx: ContextCancellable): Promise<string> {
          expect(ctx.signal.aborted).toBe(false);
          while (true) {
            if (ctx.signal.aborted) {
              throw ctx.signal.reason;
            }
            await sleep(1);
          }
        }
      }
      const c = new C();
      const pC = c.f();
      await sleep(1);
      pC.cancel('cancel reason');
      await expect(pC).rejects.toBe('cancel reason');
    });


  });
});
