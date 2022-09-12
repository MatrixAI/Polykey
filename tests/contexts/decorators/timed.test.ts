import type { ContextTimed } from '@/contexts/types';
import { Timer } from '@matrixai/timer';
import context from '@/contexts/decorators/context';
import timed from '@/contexts/decorators/timed';
import * as contextsErrors from '@/contexts/errors';
import {
  AsyncFunction,
  GeneratorFunction,
  AsyncGeneratorFunction,
  sleep,
} from '@/utils';

describe('context/decorators/timed', () => {
  describe('timed decorator runtime validation', () => {
    test('timed decorator requires context decorator', async () => {
      expect(() => {
        class C {
          @timed(50)
          async f(_ctx: ContextTimed): Promise<string> {
            return 'hello world';
          }
        }
        return C;
      }).toThrow(TypeError);
    });
    test('timed decorator fails on invalid context', async () => {
      await expect(async () => {
        class C {
          @timed(50)
          async f(@context _ctx: ContextTimed): Promise<string> {
            return 'hello world';
          }
        }
        const c = new C();
        // @ts-ignore invalid context timer
        await c.f({ timer: 1 });
      }).rejects.toThrow(TypeError);
      await expect(async () => {
        class C {
          @timed(50)
          async f(@context _ctx: ContextTimed): Promise<string> {
            return 'hello world';
          }
        }
        const c = new C();
        // @ts-ignore invalid context signal
        await c.f({ signal: 'lol' });
      }).rejects.toThrow(TypeError);
    });
  });
  describe('timed decorator syntax', () => {
    // Decorators cannot change type signatures
    // use overloading to change required context parameter to optional context parameter
    const symbolFunction = Symbol('sym');
    class X {
      functionValue(
        ctx?: Partial<ContextTimed>,
        check?: (t: Timer) => any,
      ): string;
      @timed(1000)
      functionValue(
        @context ctx: ContextTimed,
        check?: (t: Timer) => any,
      ): string {
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        expect(ctx.timer).toBeInstanceOf(Timer);
        if (check != null) check(ctx.timer);
        return 'hello world';
      }

      functionValueArray(
        ctx?: Partial<ContextTimed>,
        check?: (t: Timer) => any,
      ): Array<number>;
      @timed(1000)
      functionValueArray(
        @context ctx: ContextTimed,
        check?: (t: Timer) => any,
      ): Array<number> {
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        expect(ctx.timer).toBeInstanceOf(Timer);
        if (check != null) check(ctx.timer);
        return [1, 2, 3, 4];
      }

      functionPromise(
        ctx?: Partial<ContextTimed>,
        check?: (t: Timer) => any,
      ): Promise<void>;
      @timed(1000)
      functionPromise(
        @context ctx: ContextTimed,
        check?: (t: Timer) => any,
      ): Promise<void> {
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        expect(ctx.timer).toBeInstanceOf(Timer);
        if (check != null) check(ctx.timer);
        return new Promise((resolve) => void resolve());
      }

      asyncFunction(
        ctx?: Partial<ContextTimed>,
        check?: (t: Timer) => any,
      ): Promise<void>;
      @timed(Infinity)
      async asyncFunction(
        @context ctx: ContextTimed,
        check?: (t: Timer) => any,
      ): Promise<void> {
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        expect(ctx.timer).toBeInstanceOf(Timer);
        if (check != null) check(ctx.timer);
      }

      generator(
        ctx?: Partial<ContextTimed>,
        check?: (t: Timer) => any,
      ): Generator<void>;
      @timed(0)
      *generator(
        @context ctx: ContextTimed,
        check?: (t: Timer) => any,
      ): Generator<void> {
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        expect(ctx.timer).toBeInstanceOf(Timer);
        if (check != null) check(ctx.timer);
      }

      functionGenerator(
        ctx?: Partial<ContextTimed>,
        check?: (t: Timer) => any,
      ): Generator<void>;
      @timed(0)
      functionGenerator(
        @context ctx: ContextTimed,
        check?: (t: Timer) => any,
      ): Generator<void> {
        return this.generator(ctx, check);
      }

      asyncGenerator(
        ctx?: Partial<ContextTimed>,
        check?: (t: Timer) => any,
      ): AsyncGenerator<void>;
      @timed(NaN)
      async *asyncGenerator(
        @context ctx: ContextTimed,
        check?: (t: Timer) => any,
      ): AsyncGenerator<void> {
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        expect(ctx.timer).toBeInstanceOf(Timer);
        if (check != null) check(ctx.timer);
      }

      functionAsyncGenerator(
        ctx?: Partial<ContextTimed>,
        check?: (t: Timer) => any,
      ): AsyncGenerator<void>;
      @timed(NaN)
      functionAsyncGenerator(
        @context ctx: ContextTimed,
        check?: (t: Timer) => any,
      ): AsyncGenerator<void> {
        return this.asyncGenerator(ctx, check);
      }

      [symbolFunction](
        ctx?: Partial<ContextTimed>,
        check?: (t: Timer) => any,
      ): Promise<void>;
      @timed()
      [symbolFunction](
        @context ctx: ContextTimed,
        check?: (t: Timer) => any,
      ): Promise<void> {
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        expect(ctx.timer).toBeInstanceOf(Timer);
        if (check != null) check(ctx.timer);
        return new Promise((resolve) => void resolve());
      }
    }
    const x = new X();
    test('functionValue', () => {
      expect(x.functionValue()).toBe('hello world');
      expect(x.functionValue({})).toBe('hello world');
      expect(
        x.functionValue({ timer: new Timer({ delay: 100 }) }, (t) => {
          expect(t.delay).toBe(100);
        }),
      ).toBe('hello world');
      expect(x.functionValue).toBeInstanceOf(Function);
      expect(x.functionValue.name).toBe('functionValue');
    });
    test('functionValueArray', () => {
      expect(x.functionValueArray()).toStrictEqual([1, 2, 3, 4]);
      expect(x.functionValueArray({})).toStrictEqual([1, 2, 3, 4]);
      expect(
        x.functionValueArray({ timer: new Timer({ delay: 100 }) }, (t) => {
          expect(t.delay).toBe(100);
        }),
      ).toStrictEqual([1, 2, 3, 4]);
      expect(x.functionValueArray).toBeInstanceOf(Function);
      expect(x.functionValueArray.name).toBe('functionValueArray');
    });
    test('functionPromise', async () => {
      await x.functionPromise();
      await x.functionPromise({});
      await x.functionPromise({ timer: new Timer({ delay: 100 }) }, (t) => {
        expect(t.delay).toBe(100);
      });
      expect(x.functionPromise).toBeInstanceOf(Function);
      expect(x.functionPromise.name).toBe('functionPromise');
    });
    test('asyncFunction', async () => {
      await x.asyncFunction();
      await x.asyncFunction({});
      await x.asyncFunction({ timer: new Timer({ delay: 50 }) }, (t) => {
        expect(t.delay).toBe(50);
      });
      expect(x.asyncFunction).toBeInstanceOf(AsyncFunction);
      expect(x.asyncFunction.name).toBe('asyncFunction');
    });
    test('generator', () => {
      for (const _ of x.generator()) {
        // NOOP
      }
      for (const _ of x.generator({})) {
        // NOOP
      }
      for (const _ of x.generator({ timer: new Timer({ delay: 150 }) }, (t) => {
        expect(t.delay).toBe(150);
      })) {
        // NOOP
      }
      expect(x.generator).toBeInstanceOf(GeneratorFunction);
      expect(x.generator.name).toBe('generator');
    });
    test('functionGenerator', () => {
      for (const _ of x.functionGenerator()) {
        // NOOP
      }
      for (const _ of x.functionGenerator({})) {
        // NOOP
      }
      for (const _ of x.functionGenerator(
        { timer: new Timer({ delay: 150 }) },
        (t) => {
          expect(t.delay).toBe(150);
        },
      )) {
        // NOOP
      }
      expect(x.functionGenerator).toBeInstanceOf(Function);
      expect(x.functionGenerator.name).toBe('functionGenerator');
    });
    test('asyncGenerator', async () => {
      for await (const _ of x.asyncGenerator()) {
        // NOOP
      }
      for await (const _ of x.asyncGenerator({})) {
        // NOOP
      }
      for await (const _ of x.asyncGenerator(
        { timer: new Timer({ delay: 200 }) },
        (t) => {
          expect(t.delay).toBe(200);
        },
      )) {
        // NOOP
      }
      expect(x.asyncGenerator).toBeInstanceOf(AsyncGeneratorFunction);
      expect(x.asyncGenerator.name).toBe('asyncGenerator');
    });
    test('functionAsyncGenerator', async () => {
      for await (const _ of x.functionAsyncGenerator()) {
        // NOOP
      }
      for await (const _ of x.functionAsyncGenerator({})) {
        // NOOP
      }
      for await (const _ of x.functionAsyncGenerator(
        { timer: new Timer({ delay: 200 }) },
        (t) => {
          expect(t.delay).toBe(200);
        },
      )) {
        // NOOP
      }
      expect(x.functionAsyncGenerator).toBeInstanceOf(Function);
      expect(x.functionAsyncGenerator.name).toBe('functionAsyncGenerator');
    });
    test('symbolFunction', async () => {
      await x[symbolFunction]();
      await x[symbolFunction]({});
      await x[symbolFunction]({ timer: new Timer({ delay: 250 }) }, (t) => {
        expect(t.delay).toBe(250);
      });
      expect(x[symbolFunction]).toBeInstanceOf(Function);
      expect(x[symbolFunction].name).toBe('[sym]');
    });
  });
  describe('timed decorator expiry', () => {
    // Timed decorator does not automatically reject the promise
    // it only signals that it is aborted
    // it is up to the function to decide how to reject
    test('async function expiry', async () => {
      class C {
        /**
         * Async function
         */
        f(ctx?: Partial<ContextTimed>): Promise<string>;
        @timed(50)
        async f(@context ctx: ContextTimed): Promise<string> {
          expect(ctx.signal.aborted).toBe(false);
          await sleep(15);
          expect(ctx.signal.aborted).toBe(false);
          await sleep(40);
          expect(ctx.signal.aborted).toBe(true);
          expect(ctx.signal.reason).toBeInstanceOf(
            contextsErrors.ErrorContextsTimedTimeOut,
          );
          return 'hello world';
        }
      }
      const c = new C();
      await expect(c.f()).resolves.toBe('hello world');
    });
    test('async function expiry with custom error', async () => {
      class ErrorCustom extends Error {}
      class C {
        /**
         * Async function
         */
        f(ctx?: Partial<ContextTimed>): Promise<string>;
        @timed(50, ErrorCustom)
        async f(@context ctx: ContextTimed): Promise<string> {
          expect(ctx.signal.aborted).toBe(false);
          await sleep(15);
          expect(ctx.signal.aborted).toBe(false);
          await sleep(40);
          expect(ctx.signal.aborted).toBe(true);
          expect(ctx.signal.reason).toBeInstanceOf(ErrorCustom);
          throw ctx.signal.reason;
        }
      }
      const c = new C();
      await expect(c.f()).rejects.toBeInstanceOf(ErrorCustom);
    });
    test('promise function expiry', async () => {
      class C {
        /**
         * Regular function returning promise
         */
        f(ctx?: Partial<ContextTimed>): Promise<string>;
        @timed(50)
        f(@context ctx: ContextTimed): Promise<string> {
          expect(ctx.signal.aborted).toBe(false);
          return sleep(15)
            .then(() => {
              expect(ctx.signal.aborted).toBe(false);
            })
            .then(() => sleep(40))
            .then(() => {
              expect(ctx.signal.aborted).toBe(true);
              expect(ctx.signal.reason).toBeInstanceOf(
                contextsErrors.ErrorContextsTimedTimeOut,
              );
            })
            .then(() => {
              return 'hello world';
            });
        }
      }
      const c = new C();
      await expect(c.f()).resolves.toBe('hello world');
    });
    test('promise function expiry and late rejection', async () => {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      class C {
        /**
         * Regular function that actually rejects
         * when the signal is aborted
         */
        f(ctx?: Partial<ContextTimed>): Promise<string>;
        @timed(50)
        f(@context ctx: ContextTimed): Promise<string> {
          return new Promise((resolve, reject) => {
            if (ctx.signal.aborted) {
              reject(ctx.signal.reason);
            }
            timeout = setTimeout(() => {
              resolve('hello world');
            }, 50000);
            ctx.signal.onabort = () => {
              clearTimeout(timeout);
              timeout = undefined;
              reject(ctx.signal.reason);
            };
          });
        }
      }
      const c = new C();
      await expect(c.f()).rejects.toBeInstanceOf(
        contextsErrors.ErrorContextsTimedTimeOut,
      );
      expect(timeout).toBeUndefined();
    });
    test('promise function expiry and early rejection', async () => {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      class C {
        /**
         * Regular function that actually rejects immediately
         */
        f(ctx?: Partial<ContextTimed>): Promise<string>;
        @timed(0)
        f(@context ctx: ContextTimed): Promise<string> {
          return new Promise((resolve, reject) => {
            if (ctx.signal.aborted) {
              reject(ctx.signal.reason);
            }
            timeout = setTimeout(() => {
              resolve('hello world');
            }, 50000);
            ctx.signal.onabort = () => {
              clearTimeout(timeout);
              timeout = undefined;
              reject(ctx.signal.reason);
            };
          });
        }
      }
      const c = new C();
      await expect(c.f()).rejects.toBeInstanceOf(
        contextsErrors.ErrorContextsTimedTimeOut,
      );
      expect(timeout).toBeUndefined();
    });
    test('async generator expiry', async () => {
      class C {
        f(ctx?: Partial<ContextTimed>): AsyncGenerator<string>;
        @timed(50)
        async *f(@context ctx: ContextTimed): AsyncGenerator<string> {
          while (true) {
            if (ctx.signal.aborted) {
              throw ctx.signal.reason;
            }
            yield 'hello world';
          }
        }
      }
      const c = new C();
      const g = c.f();
      await expect(g.next()).resolves.toEqual({
        value: 'hello world',
        done: false,
      });
      await expect(g.next()).resolves.toEqual({
        value: 'hello world',
        done: false,
      });
      await sleep(50);
      await expect(g.next()).rejects.toThrow(
        contextsErrors.ErrorContextsTimedTimeOut,
      );
    });
    test('generator expiry', async () => {
      class C {
        f(ctx?: Partial<ContextTimed>): Generator<string>;
        @timed(50)
        *f(@context ctx: ContextTimed): Generator<string> {
          while (true) {
            if (ctx.signal.aborted) {
              throw ctx.signal.reason;
            }
            yield 'hello world';
          }
        }
      }
      const c = new C();
      const g = c.f();
      expect(g.next()).toEqual({ value: 'hello world', done: false });
      expect(g.next()).toEqual({ value: 'hello world', done: false });
      await sleep(50);
      expect(() => g.next()).toThrow(contextsErrors.ErrorContextsTimedTimeOut);
    });
  });
  describe('timed decorator propagation', () => {
    test('propagate timer and signal', async () => {
      let timer: Timer;
      let signal: AbortSignal;
      class C {
        f(ctx?: Partial<ContextTimed>): Promise<string>;
        @timed(50)
        async f(@context ctx: ContextTimed): Promise<string> {
          expect(ctx.timer).toBeInstanceOf(Timer);
          expect(ctx.signal).toBeInstanceOf(AbortSignal);
          timer = ctx.timer;
          signal = ctx.signal;
          expect(timer.getTimeout()).toBeGreaterThan(0);
          expect(signal.aborted).toBe(false);
          return await this.g(ctx);
        }

        g(ctx?: Partial<ContextTimed>): Promise<string>;
        @timed(25)
        async g(@context ctx: ContextTimed): Promise<string> {
          expect(ctx.timer).toBeInstanceOf(Timer);
          expect(ctx.signal).toBeInstanceOf(AbortSignal);
          // Timer and signal will be propagated
          expect(timer).toBe(ctx.timer);
          expect(signal).toBe(ctx.signal);
          expect(ctx.timer.getTimeout()).toBeGreaterThan(0);
          expect(ctx.timer.delay).toBe(50);
          expect(ctx.signal.aborted).toBe(false);
          return 'g';
        }
      }
      const c = new C();
      await expect(c.f()).resolves.toBe('g');
    });
    test('propagate timer only', async () => {
      let timer: Timer;
      let signal: AbortSignal;
      class C {
        f(ctx?: Partial<ContextTimed>): Promise<string>;
        @timed(50)
        async f(@context ctx: ContextTimed): Promise<string> {
          expect(ctx.timer).toBeInstanceOf(Timer);
          expect(ctx.signal).toBeInstanceOf(AbortSignal);
          timer = ctx.timer;
          signal = ctx.signal;
          expect(timer.getTimeout()).toBeGreaterThan(0);
          expect(signal.aborted).toBe(false);
          return await this.g({ timer: ctx.timer });
        }

        g(ctx?: Partial<ContextTimed>): Promise<string>;
        @timed(25)
        async g(@context ctx: ContextTimed): Promise<string> {
          expect(ctx.timer).toBeInstanceOf(Timer);
          expect(ctx.signal).toBeInstanceOf(AbortSignal);
          expect(timer).toBe(ctx.timer);
          expect(signal).not.toBe(ctx.signal);
          expect(ctx.timer.getTimeout()).toBeGreaterThan(0);
          expect(ctx.timer.delay).toBe(50);
          expect(ctx.signal.aborted).toBe(false);
          return 'g';
        }
      }
      const c = new C();
      await expect(c.f()).resolves.toBe('g');
    });
    test('propagate signal only', async () => {
      let timer: Timer;
      let signal: AbortSignal;
      class C {
        f(ctx?: Partial<ContextTimed>): Promise<string>;
        @timed(50)
        async f(@context ctx: ContextTimed): Promise<string> {
          expect(ctx.timer).toBeInstanceOf(Timer);
          expect(ctx.signal).toBeInstanceOf(AbortSignal);
          timer = ctx.timer;
          signal = ctx.signal;
          expect(timer.getTimeout()).toBeGreaterThan(0);
          expect(signal.aborted).toBe(false);
          return await this.g({ signal: ctx.signal });
        }

        g(ctx?: Partial<ContextTimed>): Promise<string>;
        @timed(25)
        async g(@context ctx: ContextTimed): Promise<string> {
          expect(ctx.timer).toBeInstanceOf(Timer);
          expect(ctx.signal).toBeInstanceOf(AbortSignal);
          // Even though signal is propagated
          // because the timer isn't, the signal here is chained
          expect(timer).not.toBe(ctx.timer);
          expect(signal).not.toBe(ctx.signal);
          expect(ctx.timer.getTimeout()).toBeGreaterThan(0);
          expect(ctx.timer.delay).toBe(25);
          expect(ctx.signal.aborted).toBe(false);
          return 'g';
        }
      }
      const c = new C();
      await expect(c.f()).resolves.toBe('g');
    });
    test('propagate nothing', async () => {
      let timer: Timer;
      let signal: AbortSignal;
      class C {
        f(ctx?: Partial<ContextTimed>): Promise<string>;
        @timed(50)
        async f(@context ctx: ContextTimed): Promise<string> {
          expect(ctx.timer).toBeInstanceOf(Timer);
          expect(ctx.signal).toBeInstanceOf(AbortSignal);
          timer = ctx.timer;
          signal = ctx.signal;
          expect(timer.getTimeout()).toBeGreaterThan(0);
          expect(signal.aborted).toBe(false);
          return await this.g();
        }

        g(ctx?: Partial<ContextTimed>): Promise<string>;
        @timed(25)
        async g(@context ctx: ContextTimed): Promise<string> {
          expect(ctx.timer).toBeInstanceOf(Timer);
          expect(ctx.signal).toBeInstanceOf(AbortSignal);
          expect(timer).not.toBe(ctx.timer);
          expect(signal).not.toBe(ctx.signal);
          expect(ctx.timer.getTimeout()).toBeGreaterThan(0);
          expect(ctx.timer.delay).toBe(25);
          expect(ctx.signal.aborted).toBe(false);
          return 'g';
        }
      }
      const c = new C();
      await expect(c.f()).resolves.toBe('g');
    });
    test('propagated expiry', async () => {
      class C {
        f(ctx?: Partial<ContextTimed>): Promise<string>;
        @timed(25)
        async f(@context ctx: ContextTimed): Promise<string> {
          // The `g` will use up all the remaining time
          const counter = await this.g(ctx.timer.getTimeout());
          expect(counter).toBeGreaterThan(0);
          // The `h` will reject eventually
          // it may reject immediately
          // it may reject after some time
          await this.h(ctx);
          return 'hello world';
        }

        async g(timeout: number): Promise<number> {
          const start = performance.now();
          let counter = 0;
          while (true) {
            if (performance.now() - start > timeout) {
              break;
            }
            await sleep(1);
            counter++;
          }
          return counter;
        }

        h(ctx?: Partial<ContextTimed>): Promise<string>;
        @timed(25)
        async h(@context ctx: ContextTimed): Promise<string> {
          return new Promise((resolve, reject) => {
            if (ctx.signal.aborted) {
              reject(ctx.signal.reason);
              return;
            }
            const timeout = setTimeout(() => {
              resolve('hello world');
            }, 25);
            ctx.signal.addEventListener('abort', () => {
              clearTimeout(timeout);
              reject(ctx.signal.reason);
            });
          });
        }
      }
      const c = new C();
      await expect(c.f()).rejects.toThrow(
        contextsErrors.ErrorContextsTimedTimeOut,
      );
    });
  });
  describe('timed decorator explicit timer cancellation or signal abortion', () => {
    // If the timer is cancelled
    // there will be no timeout error
    let ctx_: ContextTimed | undefined;
    class C {
      f(ctx?: Partial<ContextTimed>): Promise<string>;
      @timed(50)
      f(@context ctx: ContextTimed): Promise<string> {
        ctx_ = ctx;
        return new Promise((resolve, reject) => {
          if (ctx.signal.aborted) {
            reject(ctx.signal.reason + ' begin');
            return;
          }
          const timeout = setTimeout(() => {
            resolve('hello world');
          }, 25);
          ctx.signal.addEventListener('abort', () => {
            clearTimeout(timeout);
            reject(ctx.signal.reason + ' during');
          });
        });
      }
    }
    const c = new C();
    beforeEach(() => {
      ctx_ = undefined;
    });
    test('explicit timer cancellation - begin', async () => {
      const timer = new Timer({ delay: 100 });
      timer.cancel('reason');
      const p = c.f({ timer });
      await expect(p).resolves.toBe('hello world');
      expect(ctx_!.signal.aborted).toBe(false);
    });
    test('explicit timer cancellation - during', async () => {
      const timer = new Timer({ delay: 100 });
      const p = c.f({ timer });
      timer.cancel('reason');
      await expect(p).resolves.toBe('hello world');
      expect(ctx_!.signal.aborted).toBe(false);
    });
    test('explicit timer cancellation - during after sleep', async () => {
      const timer = new Timer({ delay: 20 });
      const p = c.f({ timer });
      await sleep(1);
      timer.cancel('reason');
      await expect(p).resolves.toBe('hello world');
      expect(ctx_!.signal.aborted).toBe(false);
    });
    test('explicit signal abortion - begin', async () => {
      const abortController = new AbortController();
      abortController.abort('reason');
      const p = c.f({ signal: abortController.signal });
      expect(ctx_!.timer.status).toBe('settled');
      await expect(p).rejects.toBe('reason begin');
    });
    test('explicit signal abortion - during', async () => {
      const abortController = new AbortController();
      const p = c.f({ signal: abortController.signal });
      abortController.abort('reason');
      // Timer is also cancelled immediately
      expect(ctx_!.timer.status).toBe('settled');
      await expect(p).rejects.toBe('reason during');
    });
    test('explicit signal signal abortion with passed in timer - during', async () => {
      const timer = new Timer({ delay: 100 });
      const abortController = new AbortController();
      const p = c.f({ timer, signal: abortController.signal });
      abortController.abort('abort reason');
      expect(ctx_!.timer.status).toBe('settled');
      expect(timer.status).toBe('settled');
      expect(ctx_!.signal.aborted).toBe(true);
      await expect(p).rejects.toBe('abort reason during');
    });
    test('explicit timer cancellation and signal abortion - begin', async () => {
      const timer = new Timer({ delay: 100 });
      timer.cancel('timer reason');
      const abortController = new AbortController();
      abortController.abort('abort reason');
      const p = c.f({ timer, signal: abortController.signal });
      expect(ctx_!.timer.status).toBe('settled');
      expect(ctx_!.signal.aborted).toBe(true);
      await expect(p).rejects.toBe('abort reason begin');
    });
  });
});
