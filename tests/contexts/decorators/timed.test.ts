import context from '@/contexts/decorators/context';
import timed from '@/contexts/decorators/timed';
import * as contextsErrors from '@/contexts/errors';
import Timer from '@/timer/Timer';
import {
  sleep,
  AsyncFunction,
  GeneratorFunction,
  AsyncGeneratorFunction,
} from '@/utils';

describe('context/decorators/timed', () => {
  test('timed decorator syntax for functions returning promises, async functions, generators, and async generators', async () => {
    // Decorators cannot change type signatures
    // use overloading to change required context parameter to optional context parameter
    const s = Symbol('sym');
    class X {
      a(
        ctx?: { signal?: AbortSignal; timer?: Timer },
        check?: (t: Timer) => any,
      ): Promise<void>;
      @timed(1000)
      a(
        @context ctx: { signal: AbortSignal; timer: Timer },
        check?: (t: Timer) => any,
      ): Promise<void> {
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        expect(ctx.timer).toBeInstanceOf(Timer);
        if (check != null) check(ctx.timer);
        return new Promise((resolve) => void resolve());
      }

      b(
        ctx?: { signal?: AbortSignal; timer?: Timer },
        check?: (t: Timer) => any,
      ): Promise<void>;
      @timed(Infinity)
      async b(
        @context ctx: { signal: AbortSignal; timer: Timer },
        check?: (t: Timer) => any,
      ): Promise<void> {
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        expect(ctx.timer).toBeInstanceOf(Timer);
        if (check != null) check(ctx.timer);
      }

      c(
        ctx?: { signal?: AbortSignal; timer?: Timer },
        check?: (t: Timer) => any,
      ): Generator<void>;
      @timed(0)
      *c(
        @context ctx: { signal: AbortSignal; timer: Timer },
        check?: (t: Timer) => any,
      ): Generator<void> {
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        expect(ctx.timer).toBeInstanceOf(Timer);
        if (check != null) check(ctx.timer);
      }

      d(
        ctx?: { signal?: AbortSignal; timer?: Timer },
        check?: (t: Timer) => any,
      ): AsyncGenerator<void>;
      @timed(NaN)
      async *d(
        @context ctx: { signal: AbortSignal; timer: Timer },
        check?: (t: Timer) => any,
      ): AsyncGenerator<void> {
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        expect(ctx.timer).toBeInstanceOf(Timer);
        if (check != null) check(ctx.timer);
      }

      [s](
        ctx?: { signal?: AbortSignal; timer?: Timer },
        check?: (t: Timer) => any,
      ): Promise<void>;
      @timed()
      [s](
        @context ctx: { signal: AbortSignal; timer: Timer },
        check?: (t: Timer) => any,
      ): Promise<void> {
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        expect(ctx.timer).toBeInstanceOf(Timer);
        if (check != null) check(ctx.timer);
        return new Promise((resolve) => void resolve());
      }
    }
    const x = new X();
    await x.a();
    await x.a({});
    await x.a({ timer: new Timer({ delay: 100 }) }, (t) => {
      expect(t.delay).toBe(100);
    });
    expect(x.a).toBeInstanceOf(Function);
    expect(x.a.name).toBe('a');
    await x.b();
    await x.b({});
    await x.b({ timer: new Timer({ delay: 50 }) }, (t) => {
      expect(t.delay).toBe(50);
    });
    expect(x.b).toBeInstanceOf(AsyncFunction);
    expect(x.b.name).toBe('b');
    for (const _ of x.c()) {
    }
    for (const _ of x.c({})) {
    }
    for (const _ of x.c({ timer: new Timer({ delay: 150 }) }, (t) => {
      expect(t.delay).toBe(150);
    })) {
    }
    expect(x.c).toBeInstanceOf(GeneratorFunction);
    expect(x.c.name).toBe('c');
    for await (const _ of x.d()) {
    }
    for await (const _ of x.d({})) {
    }
    for await (const _ of x.d({ timer: new Timer({ delay: 200 }) }, (t) => {
      expect(t.delay).toBe(200);
    })) {
    }
    expect(x.d).toBeInstanceOf(AsyncGeneratorFunction);
    expect(x.d.name).toBe('d');
    await x[s]();
    await x[s]({});
    await x[s]({ timer: new Timer({ delay: 250 }) }, (t) => {
      expect(t.delay).toBe(250);
    });
    expect(x[s]).toBeInstanceOf(Function);
    expect(x[s].name).toBe('[sym]');
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
        @timed(50)
        async f(
          @context ctx?: { timer: Timer; signal: AbortSignal },
        ): Promise<string> {
          expect(ctx!.signal.aborted).toBe(false);
          await sleep(15);
          expect(ctx!.signal.aborted).toBe(false);
          await sleep(40);
          expect(ctx!.signal.aborted).toBe(true);
          expect(ctx!.signal.reason).toBeInstanceOf(
            contextsErrors.ErrorContextsTimedExpiry,
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
        @timed(50, ErrorCustom)
        async f(
          @context ctx?: { timer: Timer; signal: AbortSignal },
        ): Promise<string> {
          expect(ctx!.signal.aborted).toBe(false);
          await sleep(15);
          expect(ctx!.signal.aborted).toBe(false);
          await sleep(40);
          expect(ctx!.signal.aborted).toBe(true);
          expect(ctx!.signal.reason).toBeInstanceOf(ErrorCustom);
          throw ctx!.signal.reason;
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
        @timed(50)
        f(
          @context ctx?: { timer: Timer; signal: AbortSignal },
        ): Promise<string> {
          expect(ctx!.signal.aborted).toBe(false);
          return sleep(15)
            .then(() => {
              expect(ctx!.signal.aborted).toBe(false);
            })
            .then(() => sleep(40))
            .then(() => {
              expect(ctx!.signal.aborted).toBe(true);
              expect(ctx!.signal.reason).toBeInstanceOf(
                contextsErrors.ErrorContextsTimedExpiry,
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
        @timed(50)
        f(
          @context ctx?: { timer: Timer; signal: AbortSignal },
        ): Promise<string> {
          return new Promise((resolve, reject) => {
            if (ctx!.signal.aborted) {
              reject(ctx!.signal.reason);
            }
            timeout = setTimeout(() => {
              resolve('hello world');
            }, 50000);
            ctx!.signal.onabort = () => {
              clearTimeout(timeout);
              timeout = undefined;
              reject(ctx!.signal.reason);
            };
          });
        }
      }
      const c = new C();
      await expect(c.f()).rejects.toBeInstanceOf(
        contextsErrors.ErrorContextsTimedExpiry,
      );
    });
    test('promise function expiry and early rejection', async () => {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      class C {
        /**
         * Regular function that actually rejects immediately
         */
        @timed(0)
        f(
          @context ctx?: { timer: Timer; signal: AbortSignal },
        ): Promise<string> {
          return new Promise((resolve, reject) => {
            if (ctx!.signal.aborted) {
              reject(ctx!.signal.reason);
            }
            timeout = setTimeout(() => {
              resolve('hello world');
            }, 50000);
            ctx!.signal.onabort = () => {
              clearTimeout(timeout);
              timeout = undefined;
              reject(ctx!.signal.reason);
            };
          });
        }
      }
      const c = new C();
      await expect(c.f()).rejects.toBeInstanceOf(
        contextsErrors.ErrorContextsTimedExpiry,
      );
      expect(timeout).toBeUndefined();
    });
  });
  test.todo('timed decorator requires context decorator');
  test.todo('timed decorator fails on invalid context');
});
