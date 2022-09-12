import type { ContextTimed } from '@/contexts/types';
import { Timer } from '@matrixai/timer';
import timed from '@/contexts/functions/timed';
import * as contextsErrors from '@/contexts/errors';
import {
  AsyncFunction,
  GeneratorFunction,
  AsyncGeneratorFunction,
  sleep,
} from '@/utils';

describe('context/functions/timed', () => {
  describe('timed syntax', () => {
    test('function value', () => {
      const f = function (
        ctx: ContextTimed,
        check?: (t: Timer) => any,
      ): string {
        expect(ctx.timer).toBeInstanceOf(Timer);
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        if (check != null) check(ctx.timer);
        return 'hello world';
      };
      const fTimed = timed(f);
      expect(fTimed(undefined)).toBe('hello world');
      expect(fTimed({})).toBe('hello world');
      expect(
        fTimed({ timer: new Timer({ delay: 50 }) }, (t) => {
          expect(t.delay).toBe(50);
        }),
      ).toBe('hello world');
      expect(fTimed).toBeInstanceOf(Function);
    });
    test('function value array', () => {
      const f = function (
        ctx: ContextTimed,
        check?: (t: Timer) => any,
      ): Array<number> {
        expect(ctx.timer).toBeInstanceOf(Timer);
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        if (check != null) check(ctx.timer);
        return [1, 2, 3, 4];
      };
      const fTimed = timed(f);
      expect(fTimed(undefined)).toStrictEqual([1, 2, 3, 4]);
      expect(fTimed({})).toStrictEqual([1, 2, 3, 4]);
      expect(
        fTimed({ timer: new Timer({ delay: 50 }) }, (t) => {
          expect(t.delay).toBe(50);
        }),
      ).toStrictEqual([1, 2, 3, 4]);
      expect(fTimed).toBeInstanceOf(Function);
    });
    test('function promise', async () => {
      const f = function (
        ctx: ContextTimed,
        check?: (t: Timer) => any,
      ): Promise<void> {
        expect(ctx.timer).toBeInstanceOf(Timer);
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        if (check != null) check(ctx.timer);
        return new Promise((resolve) => void resolve());
      };
      const fTimed = timed(f);
      expect(await fTimed(undefined)).toBeUndefined();
      expect(await fTimed({})).toBeUndefined();
      expect(
        await fTimed({ timer: new Timer({ delay: 50 }) }, (t) => {
          expect(t.delay).toBe(50);
        }),
      ).toBeUndefined();
      expect(fTimed).toBeInstanceOf(Function);
    });
    test('async function', async () => {
      const f = async function (
        ctx: ContextTimed,
        check?: (t: Timer) => any,
      ): Promise<void> {
        expect(ctx.timer).toBeInstanceOf(Timer);
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        if (check != null) check(ctx.timer);
        return;
      };
      const fTimed = timed(f);
      await fTimed(undefined);
      await fTimed({});
      await fTimed({ timer: new Timer({ delay: 50 }) }, (t) => {
        expect(t.delay).toBe(50);
      });
      expect(fTimed).toBeInstanceOf(AsyncFunction);
    });
    test('generator', () => {
      const f = function* (
        ctx: ContextTimed,
        check?: (t: Timer) => any,
      ): Generator<void> {
        expect(ctx.timer).toBeInstanceOf(Timer);
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        if (check != null) check(ctx.timer);
        return;
      };
      const fTimed = timed(f);
      for (const _ of fTimed()) {
        // NOOP
      }
      for (const _ of fTimed({})) {
        // NOOP
      }
      for (const _ of fTimed({ timer: new Timer({ delay: 150 }) }, (t) => {
        expect(t.delay).toBe(150);
      })) {
        // NOOP
      }
      expect(fTimed).toBeInstanceOf(GeneratorFunction);
      const g = (ctx: ContextTimed, check?: (t: Timer) => any) => f(ctx, check);
      const gTimed = timed(g);
      for (const _ of gTimed()) {
        // NOOP
      }
      for (const _ of gTimed({})) {
        // NOOP
      }
      for (const _ of gTimed({ timer: new Timer({ delay: 150 }) }, (t) => {
        expect(t.delay).toBe(150);
      })) {
        // NOOP
      }
      expect(gTimed).not.toBeInstanceOf(GeneratorFunction);
    });
    test('async generator', async () => {
      const f = async function* (
        ctx: ContextTimed,
        check?: (t: Timer) => any,
      ): AsyncGenerator<void> {
        expect(ctx.timer).toBeInstanceOf(Timer);
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        if (check != null) check(ctx.timer);
        return;
      };
      const fTimed = timed(f);
      for await (const _ of fTimed()) {
        // NOOP
      }
      for await (const _ of fTimed({})) {
        // NOOP
      }
      for await (const _ of fTimed(
        { timer: new Timer({ delay: 200 }) },
        (t) => {
          expect(t.delay).toBe(200);
        },
      )) {
        // NOOP
      }
      expect(fTimed).toBeInstanceOf(AsyncGeneratorFunction);
      const g = (ctx: ContextTimed, check?: (t: Timer) => any) => f(ctx, check);
      const gTimed = timed(g);
      for await (const _ of gTimed()) {
        // NOOP
      }
      for await (const _ of gTimed({})) {
        // NOOP
      }
      for await (const _ of gTimed(
        { timer: new Timer({ delay: 200 }) },
        (t) => {
          expect(t.delay).toBe(200);
        },
      )) {
        // NOOP
      }
      expect(gTimed).not.toBeInstanceOf(AsyncGeneratorFunction);
    });
  });
  describe('timed expiry', () => {
    // Timed decorator does not automatically reject the promise
    // it only signals that it is aborted
    // it is up to the function to decide how to reject
    test('async function expiry', async () => {
      const f = async (ctx: ContextTimed): Promise<string> => {
        expect(ctx.signal.aborted).toBe(false);
        await sleep(15);
        expect(ctx.signal.aborted).toBe(false);
        await sleep(40);
        expect(ctx.signal.aborted).toBe(true);
        expect(ctx.signal.reason).toBeInstanceOf(
          contextsErrors.ErrorContextsTimedTimeOut,
        );
        return 'hello world';
      };
      const fTimed = timed(f, 50);
      await expect(fTimed()).resolves.toBe('hello world');
    });
    test('async function expiry with custom error', async () => {
      class ErrorCustom extends Error {}
      /**
       * Async function
       */
      const f = async (ctx: ContextTimed): Promise<string> => {
        expect(ctx.signal.aborted).toBe(false);
        await sleep(15);
        expect(ctx.signal.aborted).toBe(false);
        await sleep(40);
        expect(ctx.signal.aborted).toBe(true);
        expect(ctx.signal.reason).toBeInstanceOf(ErrorCustom);
        throw ctx.signal.reason;
      };
      const fTimed = timed(f, 50, ErrorCustom);
      await expect(fTimed()).rejects.toBeInstanceOf(ErrorCustom);
    });
    test('promise function expiry', async () => {
      /**
       * Regular function returning promise
       */
      const f = (ctx: ContextTimed): Promise<string> => {
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
      };
      const fTimed = timed(f, 50);
      // Const c = new C();
      await expect(fTimed()).resolves.toBe('hello world');
    });
    test('promise function expiry and late rejection', async () => {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      /**
       * Regular function that actually rejects
       * when the signal is aborted
       */
      const f = (ctx: ContextTimed): Promise<string> => {
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
      };
      const fTimed = timed(f, 50);
      await expect(fTimed()).rejects.toBeInstanceOf(
        contextsErrors.ErrorContextsTimedTimeOut,
      );
      expect(timeout).toBeUndefined();
    });
    test('promise function expiry and early rejection', async () => {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      /**
       * Regular function that actually rejects immediately
       */
      const f = (ctx: ContextTimed): Promise<string> => {
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
      };
      const fTimed = timed(f, 0);
      await expect(fTimed()).rejects.toBeInstanceOf(
        contextsErrors.ErrorContextsTimedTimeOut,
      );
      expect(timeout).toBeUndefined();
    });
    test('async generator expiry', async () => {
      const f = async function* (ctx: ContextTimed): AsyncGenerator<string> {
        while (true) {
          if (ctx.signal.aborted) {
            throw ctx.signal.reason;
          }
          yield 'hello world';
        }
      };
      const fTimed = timed(f, 50);
      const g = fTimed();
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
      const f = function* (ctx: ContextTimed): Generator<string> {
        while (true) {
          if (ctx.signal.aborted) {
            throw ctx.signal.reason;
          }
          yield 'hello world';
        }
      };
      const fTimed = timed(f, 50);
      const g = fTimed();
      expect(g.next()).toEqual({ value: 'hello world', done: false });
      expect(g.next()).toEqual({ value: 'hello world', done: false });
      await sleep(50);
      expect(() => g.next()).toThrow(contextsErrors.ErrorContextsTimedTimeOut);
    });
  });
  describe('timed propagation', () => {
    test('propagate timer and signal', async () => {
      let timer: Timer;
      let signal: AbortSignal;
      const g = async (ctx: ContextTimed): Promise<string> => {
        expect(ctx.timer).toBeInstanceOf(Timer);
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        // Timer and signal will be propagated
        expect(timer).toBe(ctx.timer);
        expect(signal).toBe(ctx.signal);
        expect(ctx.timer.getTimeout()).toBeGreaterThan(0);
        expect(ctx.timer.delay).toBe(50);
        expect(ctx.signal.aborted).toBe(false);
        return 'g';
      };
      const gTimed = timed(g, 25);
      const f = async (ctx: ContextTimed): Promise<string> => {
        expect(ctx.timer).toBeInstanceOf(Timer);
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        timer = ctx.timer;
        signal = ctx.signal;
        expect(timer.getTimeout()).toBeGreaterThan(0);
        expect(signal.aborted).toBe(false);
        return await gTimed(ctx);
      };
      const fTimed = timed(f, 50);
      await expect(fTimed()).resolves.toBe('g');
    });
    test('propagate timer only', async () => {
      let timer: Timer;
      let signal: AbortSignal;
      const g = async (ctx: ContextTimed): Promise<string> => {
        expect(ctx.timer).toBeInstanceOf(Timer);
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        expect(timer).toBe(ctx.timer);
        expect(signal).not.toBe(ctx.signal);
        expect(ctx.timer.getTimeout()).toBeGreaterThan(0);
        expect(ctx.timer.delay).toBe(50);
        expect(ctx.signal.aborted).toBe(false);
        return 'g';
      };
      const gTimed = timed(g, 25);
      const f = async (ctx: ContextTimed): Promise<string> => {
        expect(ctx.timer).toBeInstanceOf(Timer);
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        timer = ctx.timer;
        signal = ctx.signal;
        expect(timer.getTimeout()).toBeGreaterThan(0);
        expect(signal.aborted).toBe(false);
        return await gTimed({ timer: ctx.timer });
      };
      const fTimed = timed(f, 50);
      await expect(fTimed()).resolves.toBe('g');
    });
    test('propagate signal only', async () => {
      let timer: Timer;
      let signal: AbortSignal;
      const g = async (ctx: ContextTimed): Promise<string> => {
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
      };
      const gTimed = timed(g, 25);
      const f = async (ctx: ContextTimed): Promise<string> => {
        expect(ctx.timer).toBeInstanceOf(Timer);
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        timer = ctx.timer;
        signal = ctx.signal;
        expect(timer.getTimeout()).toBeGreaterThan(0);
        expect(signal.aborted).toBe(false);
        return await gTimed({ signal: ctx.signal });
      };
      const fTimed = timed(f, 50);
      await expect(fTimed()).resolves.toBe('g');
    });
    test('propagate nothing', async () => {
      let timer: Timer;
      let signal: AbortSignal;
      const g = async (ctx: ContextTimed): Promise<string> => {
        expect(ctx.timer).toBeInstanceOf(Timer);
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        expect(timer).not.toBe(ctx.timer);
        expect(signal).not.toBe(ctx.signal);
        expect(ctx.timer.getTimeout()).toBeGreaterThan(0);
        expect(ctx.timer.delay).toBe(25);
        expect(ctx.signal.aborted).toBe(false);
        return 'g';
      };
      const gTimed = timed(g, 25);
      const f = async (ctx: ContextTimed): Promise<string> => {
        expect(ctx.timer).toBeInstanceOf(Timer);
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        timer = ctx.timer;
        signal = ctx.signal;
        expect(timer.getTimeout()).toBeGreaterThan(0);
        expect(signal.aborted).toBe(false);
        return await gTimed();
      };
      const fTimed = timed(f, 50);
      await expect(fTimed()).resolves.toBe('g');
    });
    test('propagated expiry', async () => {
      const g = async (timeout: number): Promise<number> => {
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
      };
      const h = async (ctx: ContextTimed): Promise<string> => {
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
      };
      const hTimed = timed(h, 25);
      const f = async (ctx: ContextTimed): Promise<string> => {
        // The `g` will use up all the remaining time
        const counter = await g(ctx.timer.getTimeout());
        expect(counter).toBeGreaterThan(0);
        // The `h` will reject eventually
        // it may reject immediately
        // it may reject after some time
        await hTimed(ctx);
        return 'hello world';
      };
      const fTimed = timed(f, 25);
      await expect(fTimed()).rejects.toThrow(
        contextsErrors.ErrorContextsTimedTimeOut,
      );
    });
  });
  describe('timed explicit timer cancellation or signal abortion', () => {
    // If the timer is cancelled
    // there will be no timeout error
    let ctx_: ContextTimed | undefined;
    const f = (ctx: ContextTimed): Promise<string> => {
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
    };
    const fTimed = timed(f, 50);
    beforeEach(() => {
      ctx_ = undefined;
    });
    test('explicit timer cancellation - begin', async () => {
      const timer = new Timer({ delay: 100 });
      timer.cancel('reason');
      const p = fTimed({ timer });
      await expect(p).resolves.toBe('hello world');
      expect(ctx_!.signal.aborted).toBe(false);
    });
    test('explicit timer cancellation - during', async () => {
      const timer = new Timer({ delay: 100 });
      const p = fTimed({ timer });
      timer.cancel('reason');
      await expect(p).resolves.toBe('hello world');
      expect(ctx_!.signal.aborted).toBe(false);
    });
    test('explicit timer cancellation - during after sleep', async () => {
      const timer = new Timer({ delay: 20 });
      const p = fTimed({ timer });
      await sleep(1);
      timer.cancel('reason');
      await expect(p).resolves.toBe('hello world');
      expect(ctx_!.signal.aborted).toBe(false);
    });
    test('explicit signal abortion - begin', async () => {
      const abortController = new AbortController();
      abortController.abort('reason');
      const p = fTimed({ signal: abortController.signal });
      expect(ctx_!.timer.status).toBe('settled');
      await expect(p).rejects.toBe('reason begin');
    });
    test('explicit signal abortion - during', async () => {
      const abortController = new AbortController();
      const p = fTimed({ signal: abortController.signal });
      abortController.abort('reason');
      // Timer is also cancelled immediately
      expect(ctx_!.timer.status).toBe('settled');
      await expect(p).rejects.toBe('reason during');
    });
    test('explicit signal signal abortion with passed in timer - during', async () => {
      const timer = new Timer({ delay: 100 });
      const abortController = new AbortController();
      const p = fTimed({ timer, signal: abortController.signal });
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
      const p = fTimed({ timer, signal: abortController.signal });
      expect(ctx_!.timer.status).toBe('settled');
      expect(ctx_!.signal.aborted).toBe(true);
      await expect(p).rejects.toBe('abort reason begin');
    });
  });
});
