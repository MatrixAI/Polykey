import type { ContextTimed } from '@/contexts/types';
import { Timer } from '@matrixai/timer';
import { PromiseCancellable } from '@matrixai/async-cancellable';
import context from '@/contexts/decorators/context';
import timedCancellable from '@/contexts/decorators/timedCancellable';
import * as contextsErrors from '@/contexts/errors';
import { AsyncFunction, sleep, promise } from '@/utils';

describe('context/decorators/timedCancellable', () => {
  describe('timedCancellable decorator runtime validation', () => {
    test('timedCancellable decorator requires context decorator', async () => {
      expect(() => {
        class C {
          @timedCancellable()
          async f(_ctx: ContextTimed): Promise<string> {
            return 'hello world';
          }
        }
        return C;
      }).toThrow(TypeError);
    });
    test('cancellable decorator fails on invalid context', async () => {
      await expect(async () => {
        class C {
          @timedCancellable()
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
  describe('timedCancellable decorator syntax', () => {
    // Decorators cannot change type signatures
    // use overloading to change required context parameter to optional context parameter
    const symbolFunction = Symbol('sym');
    class X {
      functionPromise(
        ctx?: Partial<ContextTimed>,
        check?: (t: Timer) => any,
      ): PromiseCancellable<void>;
      @timedCancellable(false, 1000)
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
      ): PromiseCancellable<void>;
      @timedCancellable(true, Infinity)
      async asyncFunction(
        @context ctx: ContextTimed,
        check?: (t: Timer) => any,
      ): Promise<void> {
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        expect(ctx.timer).toBeInstanceOf(Timer);
        if (check != null) check(ctx.timer);
      }

      [symbolFunction](
        ctx?: Partial<ContextTimed>,
        check?: (t: Timer) => any,
      ): PromiseCancellable<void>;
      @timedCancellable()
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
    test('functionPromise', async () => {
      const pC = x.functionPromise();
      expect(pC).toBeInstanceOf(PromiseCancellable);
      await pC;
      await x.functionPromise({});
      await x.functionPromise({ timer: new Timer({ delay: 100 }) }, (t) => {
        expect(t.delay).toBe(100);
      });
      expect(x.functionPromise).toBeInstanceOf(Function);
      expect(x.functionPromise.name).toBe('functionPromise');
    });
    test('asyncFunction', async () => {
      const pC = x.asyncFunction();
      expect(pC).toBeInstanceOf(PromiseCancellable);
      await pC;
      await x.asyncFunction({});
      await x.asyncFunction({ timer: new Timer({ delay: 50 }) }, (t) => {
        expect(t.delay).toBe(50);
      });
      expect(x.functionPromise).toBeInstanceOf(Function);
      // Returning `PromiseCancellable` means it cannot be an async function
      expect(x.asyncFunction).not.toBeInstanceOf(AsyncFunction);
      expect(x.asyncFunction.name).toBe('asyncFunction');
    });
    test('symbolFunction', async () => {
      const pC = x[symbolFunction]();
      expect(pC).toBeInstanceOf(PromiseCancellable);
      await pC;
      await x[symbolFunction]({});
      await x[symbolFunction]({ timer: new Timer({ delay: 250 }) }, (t) => {
        expect(t.delay).toBe(250);
      });
      expect(x[symbolFunction]).toBeInstanceOf(Function);
      expect(x[symbolFunction].name).toBe('[sym]');
    });
  });
  describe('timedCancellable decorator expiry', () => {
    test('async function expiry - eager', async () => {
      const { p: finishedP, resolveP: resolveFinishedP } = promise();
      class C {
        /**
         * Async function
         */
        f(ctx?: Partial<ContextTimed>): PromiseCancellable<string>;
        @timedCancellable(false, 50)
        async f(@context ctx: ContextTimed): Promise<string> {
          expect(ctx.signal.aborted).toBe(false);
          await sleep(15);
          expect(ctx.signal.aborted).toBe(false);
          await sleep(40);
          expect(ctx.signal.aborted).toBe(true);
          expect(ctx.signal.reason).toBeInstanceOf(
            contextsErrors.ErrorContextsTimedTimeOut,
          );
          resolveFinishedP();
          return 'hello world';
        }
      }
      const c = new C();
      await expect(c.f()).rejects.toThrow(
        contextsErrors.ErrorContextsTimedTimeOut,
      );
      // Eager rejection allows the promise finish its side effects
      await expect(finishedP).resolves.toBeUndefined();
    });
    test('async function expiry - lazy', async () => {
      class C {
        /**
         * Async function
         */
        f(ctx?: Partial<ContextTimed>): PromiseCancellable<string>;
        @timedCancellable(true, 50)
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
    test('async function expiry with custom error - eager', async () => {
      class ErrorCustom extends Error {}
      class C {
        /**
         * Async function
         */
        f(ctx?: Partial<ContextTimed>): PromiseCancellable<string>;
        @timedCancellable(false, 50, ErrorCustom)
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
    test('async function expiry with custom error - lazy', async () => {
      class ErrorCustom extends Error {}
      class C {
        /**
         * Async function
         */
        f(ctx?: Partial<ContextTimed>): PromiseCancellable<string>;
        @timedCancellable(true, 50, ErrorCustom)
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
    test('promise function expiry - lazy', async () => {
      class C {
        /**
         * Regular function returning promise
         */
        f(ctx?: Partial<ContextTimed>): PromiseCancellable<string>;
        @timedCancellable(true, 50)
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
    test('promise function expiry and late rejection - lazy', async () => {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      class C {
        /**
         * Regular function that actually rejects
         * when the signal is aborted
         */
        f(ctx?: Partial<ContextTimed>): Promise<string>;
        @timedCancellable(true, 50)
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
    test('promise function expiry and early rejection - lazy', async () => {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      class C {
        /**
         * Regular function that actually rejects immediately
         */
        f(ctx?: Partial<ContextTimed>): Promise<string>;
        @timedCancellable(true, 0)
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
  });
  describe('timedCancellable decorator cancellation', () => {
    test('async function cancel - eager', async () => {
      class C {
        f(ctx?: Partial<ContextTimed>): PromiseCancellable<string>;
        @timedCancellable()
        async f(@context ctx: ContextTimed): Promise<string> {
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
    test('async function cancel - lazy', async () => {
      class C {
        f(ctx?: Partial<ContextTimed>): PromiseCancellable<string>;
        @timedCancellable(true)
        async f(@context ctx: ContextTimed): Promise<string> {
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
        f(ctx?: Partial<ContextTimed>): PromiseCancellable<string>;
        @timedCancellable()
        async f(@context ctx: ContextTimed): Promise<string> {
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
        f(ctx?: Partial<ContextTimed>): PromiseCancellable<string>;
        @timedCancellable(true)
        async f(@context ctx: ContextTimed): Promise<string> {
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
    test('promise timedCancellable function - eager rejection', async () => {
      class C {
        f(ctx?: Partial<ContextTimed>): PromiseCancellable<string>;
        @timedCancellable()
        f(@context ctx: ContextTimed): PromiseCancellable<string> {
          const pC = new PromiseCancellable<string>(
            (resolve, reject, signal) => {
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
            },
          );
          if (ctx.signal.aborted) {
            pC.cancel('eager 1:' + ctx.signal.reason);
          } else {
            ctx.signal.onabort = () => {
              pC.cancel('lazy 1:' + ctx.signal.reason);
            };
          }
          return pC;
        }
      }
      const c = new C();
      // Signal is aborted afterwards
      const pC1 = c.f();
      pC1.cancel('cancel reason');
      await expect(pC1).rejects.toBe('cancel reason');
      // Signal is already aborted
      const abortController = new AbortController();
      abortController.abort('cancel reason');
      const pC2 = c.f({ signal: abortController.signal });
      await expect(pC2).rejects.toBe('cancel reason');
    });
    test('promise timedCancellable function - lazy rejection', async () => {
      class C {
        f(ctx?: Partial<ContextTimed>): PromiseCancellable<string>;
        @timedCancellable(true)
        f(@context ctx: ContextTimed): PromiseCancellable<string> {
          const pC = new PromiseCancellable<string>(
            (resolve, reject, signal) => {
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
            },
          );
          if (ctx.signal.aborted) {
            pC.cancel('eager 1:' + ctx.signal.reason);
          } else {
            ctx.signal.onabort = () => {
              pC.cancel('lazy 1:' + ctx.signal.reason);
            };
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
  });
  describe('timedCancellable decorator propagation', () => {
    test('propagate timer and signal', async () => {
      let timer: Timer;
      let signal: AbortSignal;
      class C {
        f(ctx?: Partial<ContextTimed>): PromiseCancellable<string>;
        @timedCancellable(true, 50)
        async f(@context ctx: ContextTimed): Promise<string> {
          expect(ctx.timer).toBeInstanceOf(Timer);
          expect(ctx.signal).toBeInstanceOf(AbortSignal);
          timer = ctx.timer;
          signal = ctx.signal;
          expect(timer.getTimeout()).toBeGreaterThan(0);
          expect(signal.aborted).toBe(false);
          return await this.g(ctx);
        }

        g(ctx?: Partial<ContextTimed>): PromiseCancellable<string>;
        @timedCancellable(true, 25)
        async g(@context ctx: ContextTimed): Promise<string> {
          expect(ctx.timer).toBeInstanceOf(Timer);
          expect(ctx.signal).toBeInstanceOf(AbortSignal);
          // Timer will be propagated
          expect(timer).toBe(ctx.timer);
          // Signal will be chained
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
    test('propagate timer only', async () => {
      let timer: Timer;
      let signal: AbortSignal;
      class C {
        f(ctx?: Partial<ContextTimed>): PromiseCancellable<string>;
        @timedCancellable(true, 50)
        async f(@context ctx: ContextTimed): Promise<string> {
          expect(ctx.timer).toBeInstanceOf(Timer);
          expect(ctx.signal).toBeInstanceOf(AbortSignal);
          timer = ctx.timer;
          signal = ctx.signal;
          expect(timer.getTimeout()).toBeGreaterThan(0);
          expect(signal.aborted).toBe(false);
          return await this.g({ timer: ctx.timer });
        }

        g(ctx?: Partial<ContextTimed>): PromiseCancellable<string>;
        @timedCancellable(true, 25)
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
        f(ctx?: Partial<ContextTimed>): PromiseCancellable<string>;
        @timedCancellable(true, 50)
        async f(@context ctx: ContextTimed): Promise<string> {
          expect(ctx.timer).toBeInstanceOf(Timer);
          expect(ctx.signal).toBeInstanceOf(AbortSignal);
          timer = ctx.timer;
          signal = ctx.signal;
          if (!signal.aborted) {
            expect(timer.getTimeout()).toBeGreaterThan(0);
          } else {
            expect(timer.getTimeout()).toBe(0);
          }
          return await this.g({ signal: ctx.signal });
        }

        g(ctx?: Partial<ContextTimed>): PromiseCancellable<string>;
        @timedCancellable(true, 25)
        g(@context ctx: ContextTimed): Promise<string> {
          expect(ctx.timer).toBeInstanceOf(Timer);
          expect(ctx.signal).toBeInstanceOf(AbortSignal);
          // Even though signal is propagated
          // because the timer isn't, the signal here is chained
          expect(timer).not.toBe(ctx.timer);
          expect(signal).not.toBe(ctx.signal);
          if (!signal.aborted) {
            expect(timer.getTimeout()).toBeGreaterThan(0);
            expect(ctx.timer.delay).toBe(25);
          } else {
            expect(timer.getTimeout()).toBe(0);
          }
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
        }
      }
      const c = new C();
      const pC1 = c.f();
      await expect(pC1).resolves.toBe('g');
      expect(signal!.aborted).toBe(false);
      const pC2 = c.f();
      pC2.cancel('cancel reason');
      await expect(pC2).rejects.toBe('during:cancel reason');
      expect(signal!.aborted).toBe(true);
      const abortController = new AbortController();
      abortController.abort('cancel reason');
      const pC3 = c.f({ signal: abortController.signal });
      await expect(pC3).rejects.toBe('early:cancel reason');
      expect(signal!.aborted).toBe(true);
    });
    test('propagate nothing', async () => {
      let timer: Timer;
      let signal: AbortSignal;
      class C {
        f(ctx?: Partial<ContextTimed>): Promise<string>;
        @timedCancellable(true, 50)
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
        @timedCancellable(true, 25)
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
        f(ctx?: Partial<ContextTimed>): PromiseCancellable<string>;
        @timedCancellable(true, 25)
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

        h(ctx?: Partial<ContextTimed>): PromiseCancellable<string>;
        @timedCancellable(true, 25)
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
    test('nested cancellable - lazy then lazy', async () => {
      class C {
        f(ctx?: Partial<ContextTimed>): PromiseCancellable<string>;
        @timedCancellable(true)
        @timedCancellable(true)
        async f(@context ctx: ContextTimed): Promise<string> {
          expect(ctx.signal.aborted).toBe(false);
          while (true) {
            if (ctx.signal.aborted) {
              throw 'throw:' + ctx.signal.reason;
            }
            await sleep(1);
          }
        }
      }
      const c = new C();
      const pC = c.f();
      await sleep(1);
      pC.cancel('cancel reason');
      await expect(pC).rejects.toBe('throw:cancel reason');
    });
    test('nested cancellable - lazy then eager', async () => {
      class C {
        f(ctx?: Partial<ContextTimed>): PromiseCancellable<string>;
        @timedCancellable(true)
        @timedCancellable(false)
        async f(@context ctx: ContextTimed): Promise<string> {
          expect(ctx.signal.aborted).toBe(false);
          while (true) {
            if (ctx.signal.aborted) {
              throw 'throw:' + ctx.signal.reason;
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
    test('nested cancellable - eager then lazy', async () => {
      class C {
        f(ctx?: Partial<ContextTimed>): PromiseCancellable<string>;
        @timedCancellable(false)
        @timedCancellable(true)
        async f(@context ctx: ContextTimed): Promise<string> {
          expect(ctx.signal.aborted).toBe(false);
          while (true) {
            if (ctx.signal.aborted) {
              throw 'throw:' + ctx.signal.reason;
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
    test('signal event listeners are removed', async () => {
      class C {
        f(ctx?: Partial<ContextTimed>): PromiseCancellable<string>;
        @timedCancellable()
        async f(@context _ctx: ContextTimed): Promise<string> {
          return 'hello world';
        }
      }
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
      const c = new C();
      await c.f({ signal });
      await c.f({ signal });
      const pC = c.f({ signal });
      pC.cancel();
      await expect(pC).rejects.toBe(undefined);
      expect(listenerCount).toBe(0);
    });
  });
  describe('timedCancellable decorator explicit timer cancellation or signal abortion', () => {
    // If the timer is cancelled
    // there will be no timeout error
    let ctx_: ContextTimed | undefined;
    class C {
      f(ctx?: Partial<ContextTimed>): Promise<string>;
      @timedCancellable(true, 50)
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
      // By passing in the timer and signal explicitly
      // it is expected that the timer and signal handling is already setup
      const abortController = new AbortController();
      const timer = new Timer({
        handler: () => {
          abortController.abort(new contextsErrors.ErrorContextsTimedTimeOut());
        },
        delay: 100,
      });
      abortController.signal.addEventListener('abort', () => {
        timer.cancel();
      });
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
  describe('timedCancellable decorator dynamically setting parameters', () => {
    test('dynamically setting lazy parameter', async () => {
      let waitPromise = promise();
      let finished = false;
      // We should be able to change lazy at any time as see the cancellation
      //  behaviour change accordingly
      let lazy = false;
      class C {
        /**
         * Async function
         */
        f(ctx?: Partial<ContextTimed>): PromiseCancellable<string>;
        @timedCancellable(() => lazy, 10000)
        async f(@context _ctx: ContextTimed): Promise<string> {
          await waitPromise.p;
          finished = true;
          return 'hello world';
        }
      }
      const c = new C();

      // Eager cancellation
      finished = false;
      lazy = false;
      const abortController = new AbortController();
      const prom = c.f({ signal: abortController.signal });
      expect(finished).toBeFalse();
      abortController.abort();
      // Should fast reject and not finish
      await expect(prom).toReject();
      expect(finished).toBeFalse();
      waitPromise.resolveP();

      // Lazy cancellation
      finished = false;
      lazy = true;
      waitPromise = promise();
      const abortController2 = new AbortController();
      const prom2 = c.f({ signal: abortController2.signal });
      expect(finished).toBeFalse();
      abortController.abort();
      expect(finished).toBeFalse();
      waitPromise.resolveP();
      // Should resolve and finish
      await expect(prom2).toResolve();
      expect(finished).toBeTrue();
      waitPromise.resolveP();
    });
    test('dynamically setting delay parameter', async () => {
      let waitPromise = promise();
      // We should be able to change delay at any time as see the cancellation
      //  behaviour change accordingly
      let delay = 100;
      let signal: AbortSignal | undefined;
      class C {
        /**
         * Async function
         */
        f(ctx?: Partial<ContextTimed>): PromiseCancellable<void>;
        @timedCancellable(true, () => delay)
        async f(@context ctx: ContextTimed): Promise<void> {
          signal = ctx.signal;
          await waitPromise.p;
        }
      }
      const c = new C();

      // Short delay
      delay = 50;
      const prom1 = c.f();
      expect(signal!.aborted).toBeFalse();
      await sleep(100);
      expect(signal!.aborted).toBeTrue();
      waitPromise.resolveP();
      await prom1;

      // Long delay
      waitPromise = promise();
      delay = 150;
      const prom2 = c.f();
      expect(signal!.aborted).toBeFalse();
      await sleep(100);
      expect(signal!.aborted).toBeFalse();
      await sleep(100);
      expect(signal!.aborted).toBeTrue();
      waitPromise.resolveP();
      await prom2;
    });
    test('dynamically accessing object property', async () => {
      let kidnappedObject: any;
      class C {
        protected value = 100;
        /**
         * Async function
         */
        f(ctx?: Partial<ContextTimed>): PromiseCancellable<void>;
        @timedCancellable(true, (object) => {
          kidnappedObject = object;
          return object.value;
        })
        async f(@context _ctx: ContextTimed): Promise<void> {}
      }
      const c = new C();

      await c.f();
      expect(kidnappedObject).toBeInstanceOf(C);
      expect(kidnappedObject.value).toEqual(100);
    });
  });
});
