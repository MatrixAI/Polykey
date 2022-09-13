import type { ContextTimed } from '@/contexts/types';
import { Timer } from '@matrixai/timer';
import { PromiseCancellable } from '@matrixai/async-cancellable';
import timedCancellable from '@/contexts/functions/timedCancellable';
import * as contextsErrors from '@/contexts/errors';
import { AsyncFunction, sleep, promise } from '@/utils';

describe('context/functions/timedCancellable', () => {
  describe('timedCancellable syntax', () => {
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
      const fTimedCancellable = timedCancellable(f, true);
      const pC = fTimedCancellable(undefined);
      expect(pC).toBeInstanceOf(PromiseCancellable);
      await pC;
      expect(await fTimedCancellable({})).toBeUndefined();
      expect(
        await fTimedCancellable({ timer: new Timer({ delay: 50 }) }, (t) => {
          expect(t.delay).toBe(50);
        }),
      ).toBeUndefined();
      expect(fTimedCancellable).toBeInstanceOf(Function);
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
      const fTimedCancellable = timedCancellable(f, true);
      const pC = fTimedCancellable(undefined);
      expect(pC).toBeInstanceOf(PromiseCancellable);
      await pC;
      await fTimedCancellable({});
      await fTimedCancellable({ timer: new Timer({ delay: 50 }) }, (t) => {
        expect(t.delay).toBe(50);
      });
      expect(fTimedCancellable).not.toBeInstanceOf(AsyncFunction);
    });
  });
  describe('timedCancellable expiry', () => {
    test('async function expiry - eager', async () => {
      const { p: finishedP, resolveP: resolveFinishedP } = promise();
      const f = async (ctx: ContextTimed): Promise<string> => {
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
      };
      const fTimedCancellable = timedCancellable(f, false, 50);
      await expect(fTimedCancellable()).rejects.toThrow(
        contextsErrors.ErrorContextsTimedTimeOut,
      );
      // Eager rejection allows the promise finish its side effects
      await expect(finishedP).resolves.toBeUndefined();
    });
    test('async function expiry - lazy', async () => {
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
      const fTimedCancellable = timedCancellable(f, true, 50);
      await expect(fTimedCancellable()).resolves.toBe('hello world');
    });
    test('async function expiry with custom error - eager', async () => {
      class ErrorCustom extends Error {}
      const f = async (ctx: ContextTimed): Promise<string> => {
        expect(ctx.signal.aborted).toBe(false);
        await sleep(15);
        expect(ctx.signal.aborted).toBe(false);
        await sleep(40);
        expect(ctx.signal.aborted).toBe(true);
        expect(ctx.signal.reason).toBeInstanceOf(ErrorCustom);
        throw ctx.signal.reason;
      };
      const fTimedCancellable = timedCancellable(f, false, 50, ErrorCustom);
      await expect(fTimedCancellable()).rejects.toBeInstanceOf(ErrorCustom);
    });
    test('async function expiry with custom error - lazy', async () => {
      class ErrorCustom extends Error {}
      const f = async (ctx: ContextTimed): Promise<string> => {
        expect(ctx.signal.aborted).toBe(false);
        await sleep(15);
        expect(ctx.signal.aborted).toBe(false);
        await sleep(40);
        expect(ctx.signal.aborted).toBe(true);
        expect(ctx.signal.reason).toBeInstanceOf(ErrorCustom);
        throw ctx.signal.reason;
      };
      const fTimedCancellable = timedCancellable(f, true, 50, ErrorCustom);
      await expect(fTimedCancellable()).rejects.toBeInstanceOf(ErrorCustom);
    });
    test('promise function expiry - lazy', async () => {
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
      const fTimedCancellable = timedCancellable(f, true, 50);
      await expect(fTimedCancellable()).resolves.toBe('hello world');
    });
    test('promise function expiry and late rejection - lazy', async () => {
      let timeout: ReturnType<typeof setTimeout> | undefined;
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
      const fTimedCancellable = timedCancellable(f, true, 50);
      await expect(fTimedCancellable()).rejects.toBeInstanceOf(
        contextsErrors.ErrorContextsTimedTimeOut,
      );
      expect(timeout).toBeUndefined();
    });
    test('promise function expiry and early rejection - lazy', async () => {
      let timeout: ReturnType<typeof setTimeout> | undefined;
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
      const fTimedCancellable = timedCancellable(f, true, 0);
      await expect(fTimedCancellable()).rejects.toBeInstanceOf(
        contextsErrors.ErrorContextsTimedTimeOut,
      );
      expect(timeout).toBeUndefined();
    });
  });
  describe('timedCancellable cancellation', () => {
    test('async function cancel - eager', async () => {
      const f = async (ctx: ContextTimed): Promise<string> => {
        expect(ctx.signal.aborted).toBe(false);
        while (true) {
          if (ctx.signal.aborted) break;
          await sleep(1);
        }
        return 'hello world';
      };
      const fTimedCancellable = timedCancellable(f);
      const pC = fTimedCancellable();
      await sleep(1);
      pC.cancel();
      await expect(pC).rejects.toBeUndefined();
    });
    test('async function cancel - lazy', async () => {
      const f = async (ctx: ContextTimed): Promise<string> => {
        expect(ctx.signal.aborted).toBe(false);
        while (true) {
          if (ctx.signal.aborted) break;
          await sleep(1);
        }
        return 'hello world';
      };
      const fTimedCancellable = timedCancellable(f, true);
      const pC = fTimedCancellable();
      await sleep(1);
      pC.cancel();
      await expect(pC).resolves.toBe('hello world');
    });
    test('async function cancel with custom error and eager rejection', async () => {
      const f = async (ctx: ContextTimed): Promise<string> => {
        expect(ctx.signal.aborted).toBe(false);
        while (true) {
          if (ctx.signal.aborted) break;
          await sleep(1);
        }
        return 'hello world';
      };
      const fTimedCancellable = timedCancellable(f);
      const pC = fTimedCancellable();
      await sleep(1);
      pC.cancel('cancel reason');
      await expect(pC).rejects.toBe('cancel reason');
    });
    test('async function cancel with custom error and lazy rejection', async () => {
      const f = async (ctx: ContextTimed): Promise<string> => {
        expect(ctx.signal.aborted).toBe(false);
        while (true) {
          if (ctx.signal.aborted) {
            throw ctx.signal.reason;
          }
          await sleep(1);
        }
      };
      const fTimedCancellable = timedCancellable(f, true);
      const pC = fTimedCancellable();
      await sleep(1);
      pC.cancel('cancel reason');
      await expect(pC).rejects.toBe('cancel reason');
    });
    test('promise timedCancellable function - eager rejection', async () => {
      const f = (ctx: ContextTimed): PromiseCancellable<string> => {
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
      const fTimedCancellable = timedCancellable(f);
      // Signal is aborted afterwards
      const pC1 = fTimedCancellable();
      pC1.cancel('cancel reason');
      await expect(pC1).rejects.toBe('cancel reason');
      // Signal is already aborted
      const abortController = new AbortController();
      abortController.abort('cancel reason');
      const pC2 = fTimedCancellable({ signal: abortController.signal });
      await expect(pC2).rejects.toBe('cancel reason');
    });
    test('promise timedCancellable function - lazy rejection', async () => {
      const f = (ctx: ContextTimed): PromiseCancellable<string> => {
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
      const fTimedCancellable = timedCancellable(f, true);
      // Signal is aborted afterwards
      const pC1 = fTimedCancellable();
      pC1.cancel('cancel reason');
      await expect(pC1).rejects.toBe('lazy 2:lazy 1:cancel reason');
      // Signal is already aborted
      const abortController = new AbortController();
      abortController.abort('cancel reason');
      const pC2 = fTimedCancellable({ signal: abortController.signal });
      await expect(pC2).rejects.toBe('lazy 2:eager 1:cancel reason');
    });
  });
  describe('timedCancellable propagation', () => {
    test('propagate timer and signal', async () => {
      let timer: Timer;
      let signal: AbortSignal;
      const g = async (ctx: ContextTimed): Promise<string> => {
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
      };
      const gTimedCancellable = timedCancellable(g, true, 25);
      const f = async (ctx: ContextTimed): Promise<string> => {
        expect(ctx.timer).toBeInstanceOf(Timer);
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        timer = ctx.timer;
        signal = ctx.signal;
        expect(timer.getTimeout()).toBeGreaterThan(0);
        expect(signal.aborted).toBe(false);
        return await gTimedCancellable(ctx);
      };
      const fTimedCancellable = timedCancellable(f, true, 50);
      await expect(fTimedCancellable()).resolves.toBe('g');
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
      const gTimedCancellable = timedCancellable(g, true, 25);
      const f = async (ctx: ContextTimed): Promise<string> => {
        expect(ctx.timer).toBeInstanceOf(Timer);
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        timer = ctx.timer;
        signal = ctx.signal;
        expect(timer.getTimeout()).toBeGreaterThan(0);
        expect(signal.aborted).toBe(false);
        return await gTimedCancellable({ timer: ctx.timer });
      };
      const fTimedCancellable = timedCancellable(f, true, 50);
      await expect(fTimedCancellable()).resolves.toBe('g');
    });
    test('propagate signal only', async () => {
      let timer: Timer;
      let signal: AbortSignal;
      const g = (ctx: ContextTimed): Promise<string> => {
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
      };
      const gTimedCancellable = timedCancellable(g, true, 25);
      const f = async (ctx: ContextTimed): Promise<string> => {
        expect(ctx.timer).toBeInstanceOf(Timer);
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        timer = ctx.timer;
        signal = ctx.signal;
        if (!signal.aborted) {
          expect(timer.getTimeout()).toBeGreaterThan(0);
        } else {
          expect(timer.getTimeout()).toBe(0);
        }
        return await gTimedCancellable({ signal: ctx.signal });
      };
      const fTimedCancellable = timedCancellable(f, true, 50);
      const pC1 = fTimedCancellable();
      await expect(pC1).resolves.toBe('g');
      expect(signal!.aborted).toBe(false);
      const pC2 = fTimedCancellable();
      pC2.cancel('cancel reason');
      await expect(pC2).rejects.toBe('during:cancel reason');
      expect(signal!.aborted).toBe(true);
      const abortController = new AbortController();
      abortController.abort('cancel reason');
      const pC3 = fTimedCancellable({ signal: abortController.signal });
      await expect(pC3).rejects.toBe('early:cancel reason');
      expect(signal!.aborted).toBe(true);
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
      const gTimedCancellable = timedCancellable(g, true, 25);
      const f = async (ctx: ContextTimed): Promise<string> => {
        expect(ctx.timer).toBeInstanceOf(Timer);
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        timer = ctx.timer;
        signal = ctx.signal;
        expect(timer.getTimeout()).toBeGreaterThan(0);
        expect(signal.aborted).toBe(false);
        return await gTimedCancellable();
      };
      const fTimedCancellable = timedCancellable(f, true, 50);
      await expect(fTimedCancellable()).resolves.toBe('g');
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
      const hTimedCancellable = timedCancellable(h, true, 25);
      const f = async (ctx: ContextTimed): Promise<string> => {
        // The `g` will use up all the remaining time
        const counter = await g(ctx.timer.getTimeout());
        expect(counter).toBeGreaterThan(0);
        // The `h` will reject eventually
        // it may reject immediately
        // it may reject after some time
        await hTimedCancellable(ctx);
        return 'hello world';
      };
      const fTimedCancellable = timedCancellable(f, true, 25);
      await expect(fTimedCancellable()).rejects.toThrow(
        contextsErrors.ErrorContextsTimedTimeOut,
      );
    });
    test('nested cancellable - lazy then lazy', async () => {
      const f = async (ctx: ContextTimed): Promise<string> => {
        expect(ctx.signal.aborted).toBe(false);
        while (true) {
          if (ctx.signal.aborted) {
            throw 'throw:' + ctx.signal.reason;
          }
          await sleep(1);
        }
      };
      const fTimedCancellable = timedCancellable(
        timedCancellable(f, true),
        true,
      );
      const pC = fTimedCancellable();
      await sleep(1);
      pC.cancel('cancel reason');
      await expect(pC).rejects.toBe('throw:cancel reason');
    });
    test('nested cancellable - lazy then eager', async () => {
      const f = async (ctx: ContextTimed): Promise<string> => {
        expect(ctx.signal.aborted).toBe(false);
        while (true) {
          if (ctx.signal.aborted) {
            throw 'throw:' + ctx.signal.reason;
          }
          await sleep(1);
        }
      };
      const fCancellable = timedCancellable(timedCancellable(f, true), false);
      const pC = fCancellable();
      await sleep(1);
      pC.cancel('cancel reason');
      await expect(pC).rejects.toBe('cancel reason');
    });
    test('nested cancellable - eager then lazy', async () => {
      const f = async (ctx: ContextTimed): Promise<string> => {
        expect(ctx.signal.aborted).toBe(false);
        while (true) {
          if (ctx.signal.aborted) {
            throw 'throw:' + ctx.signal.reason;
          }
          await sleep(1);
        }
      };
      const fCancellable = timedCancellable(timedCancellable(f, false), true);
      const pC = fCancellable();
      await sleep(1);
      pC.cancel('cancel reason');
      await expect(pC).rejects.toBe('cancel reason');
    });
    test('signal event listeners are removed', async () => {
      const f = async (_ctx: ContextTimed): Promise<string> => {
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
      const fTimedCancellable = timedCancellable(f);
      await fTimedCancellable({ signal });
      await fTimedCancellable({ signal });
      const pC = fTimedCancellable({ signal });
      pC.cancel();
      await expect(pC).rejects.toBe(undefined);
      expect(listenerCount).toBe(0);
    });
  });
  describe('timedCancellable explicit timer cancellation or signal abortion', () => {
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
    const fTimedCancellable = timedCancellable(f, true, 50);
    beforeEach(() => {
      ctx_ = undefined;
    });
    test('explicit timer cancellation - begin', async () => {
      const timer = new Timer({ delay: 100 });
      timer.cancel('reason');
      const p = fTimedCancellable({ timer });
      await expect(p).resolves.toBe('hello world');
      expect(ctx_!.signal.aborted).toBe(false);
    });
    test('explicit timer cancellation - during', async () => {
      const timer = new Timer({ delay: 100 });
      const p = fTimedCancellable({ timer });
      timer.cancel('reason');
      await expect(p).resolves.toBe('hello world');
      expect(ctx_!.signal.aborted).toBe(false);
    });
    test('explicit timer cancellation - during after sleep', async () => {
      const timer = new Timer({ delay: 20 });
      const p = fTimedCancellable({ timer });
      await sleep(1);
      timer.cancel('reason');
      await expect(p).resolves.toBe('hello world');
      expect(ctx_!.signal.aborted).toBe(false);
    });
    test('explicit signal abortion - begin', async () => {
      const abortController = new AbortController();
      abortController.abort('reason');
      const p = fTimedCancellable({ signal: abortController.signal });
      expect(ctx_!.timer.status).toBe('settled');
      await expect(p).rejects.toBe('reason begin');
    });
    test('explicit signal abortion - during', async () => {
      const abortController = new AbortController();
      const p = fTimedCancellable({ signal: abortController.signal });
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
      const p = fTimedCancellable({ timer, signal: abortController.signal });
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
      const p = fTimedCancellable({ timer, signal: abortController.signal });
      expect(ctx_!.timer.status).toBe('settled');
      expect(ctx_!.signal.aborted).toBe(true);
      await expect(p).rejects.toBe('abort reason begin');
    });
  });
});
