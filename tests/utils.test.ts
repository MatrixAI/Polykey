import type { ResourceAcquire } from '@/utils';
import os from 'os';
import { Mutex } from 'async-mutex';
import * as utils from '@/utils';
import { CancellablePromise, Cancellation } from 'real-cancellable-promise';
import { promise, sleep } from '@/utils';
import { AbortController, AbortSignal } from 'node-abort-controller';
import { once } from 'cluster';

describe('utils', () => {
  test('getting default node path', () => {
    const homeDir = os.homedir();
    const p = utils.getDefaultNodePath();
    if (process.platform === 'linux') {
      expect(p).toBe(`${homeDir}/.local/share/polykey`);
    } else if (process.platform === 'darwin') {
      expect(p).toBe(`${homeDir}/Library/Application Support/polykey`);
    } else if (process.platform === 'win32') {
      expect(p).toBe(`${homeDir}/AppData/Local/polykey`);
    }
  });
  test('withF resource context', async () => {
    // No resources
    const result1 = await utils.withF([], async () => {
      return 'bar';
    });
    expect(result1).toBe('bar');
    // Noop resource
    const result2 = await utils.withF(
      [
        async () => {
          return [async () => {}];
        },
      ],
      async () => {
        return 'foo';
      },
    );
    expect(result2).toBe('foo');
    // Counter resource
    let counter = 1;
    const result3 = await utils.withF(
      [
        async () => {
          counter++;
          return [
            async () => {
              counter--;
            },
            counter,
          ];
        },
      ],
      async ([c]) => {
        expect(c).toBe(2);
        return c / 2;
      },
    );
    expect(result3).toBe(1);
    expect(counter).toBe(1);
    // Multiple resources
    const result4 = await utils.withF(
      [
        async () => {
          return [async () => {}, 123];
        },
        async () => {
          return [async () => {}];
        },
        async () => {
          return [async () => {}, 'hello world'];
        },
      ],
      async ([n, u, s]) => {
        expect(u).toBe(undefined);
        return [n, s];
      },
    );
    expect(result4).toStrictEqual([123, 'hello world']);
    // Multiple resources, but only take the first
    const result5 = await utils.withF(
      [
        async () => {
          return [async () => {}, 123];
        },
        async () => {
          return [async () => {}];
        },
        async () => {
          return [async () => {}, 'hello world'];
        },
      ],
      async ([n]) => {
        return n;
      },
    );
    expect(result5).toBe(123);
    // Multiple resources outside requires type declaration
    const resourceAcquires6: [
      ResourceAcquire<number>,
      ResourceAcquire,
      ResourceAcquire<string>,
    ] = [
      async () => {
        return [async () => {}, 123];
      },
      async () => {
        return [async () => {}];
      },
      async () => {
        return [async () => {}, 'hello world'];
      },
    ];
    const result6 = await utils.withF(resourceAcquires6, async ([n, u, s]) => {
      expect(u).toBe(undefined);
      return [n, s];
    });
    expect(result6).toStrictEqual([123, 'hello world']);
    // Multiple resources outside can also use const
    const resourceAcquires7 = [
      async () => {
        return [async () => {}, 123] as const;
      },
      async () => {
        return [async () => {}] as const;
      },
      async () => {
        return [async () => {}, 'hello world'] as const;
      },
    ] as const;
    const result7 = await utils.withF(resourceAcquires7, async ([n, u, s]) => {
      expect(u).toBe(undefined);
      return [n, s];
    });
    expect(result7).toStrictEqual([123, 'hello world']);
    // It must be given a explicit type, or `as const` can be used internally
    const acquire8: ResourceAcquire<number> = async () => {
      return [async () => {}, 123];
    };
    const result8 = await utils.withF([acquire8], async () => {
      return 'done';
    });
    expect(result8).toBe('done');
    const acquire9 = async () => {
      return [async () => {}, 123] as const;
    };
    const result9 = await utils.withF([acquire9], async () => {
      return 'done';
    });
    expect(result9).toBe('done');
    // Order of acquisition is left to right
    // Order of release is right ot left
    const lock1 = new Mutex();
    const lock2 = new Mutex();
    const acquireOrder: Array<Mutex> = [];
    const releaseOrder: Array<Mutex> = [];
    await utils.withF(
      [
        async () => {
          const release = await lock1.acquire();
          acquireOrder.push(lock1);
          return [
            async () => {
              releaseOrder.push(lock1);
              release();
            },
            lock1,
          ];
        },
        async () => {
          const release = await lock2.acquire();
          acquireOrder.push(lock2);
          return [
            async () => {
              releaseOrder.push(lock2);
              release();
            },
            lock2,
          ];
        },
      ],
      async ([l1, l2]) => {
        expect(l1.isLocked()).toBe(true);
        expect(l2.isLocked()).toBe(true);
      },
    );
    expect(acquireOrder).toStrictEqual([lock1, lock2]);
    expect(releaseOrder).toStrictEqual([lock2, lock1]);
  });
  test('withG resource context', async () => {
    // No resources
    const g1 = utils.withG([], async function* () {
      yield 'first';
      yield 'second';
      return 'last';
    });
    expect(await g1.next()).toStrictEqual({ value: 'first', done: false });
    expect(await g1.next()).toStrictEqual({ value: 'second', done: false });
    expect(await g1.next()).toStrictEqual({ value: 'last', done: true });
    // Noop resource
    const g2 = await utils.withG(
      [
        async () => {
          return [async () => {}];
        },
      ],
      async function* () {
        yield 'first';
        return 'last';
      },
    );
    expect(await g2.next()).toStrictEqual({ value: 'first', done: false });
    expect(await g2.next()).toStrictEqual({ value: 'last', done: true });
    // Order of acquisition is left to right
    // Order of release is right ot left
    const lock1 = new Mutex();
    const lock2 = new Mutex();
    const acquireOrder: Array<Mutex> = [];
    const releaseOrder: Array<Mutex> = [];
    const g3 = utils.withG(
      [
        async () => {
          const release = await lock1.acquire();
          acquireOrder.push(lock1);
          return [
            async () => {
              releaseOrder.push(lock1);
              release();
            },
            lock1,
          ];
        },
        async () => {
          const release = await lock2.acquire();
          acquireOrder.push(lock2);
          return [
            async () => {
              releaseOrder.push(lock2);
              release();
            },
            lock2,
          ];
        },
      ],
      async function* ([l1, l2]) {
        expect(l1.isLocked()).toBe(true);
        expect(l2.isLocked()).toBe(true);
        yield 'first';
        yield 'second';
        return 'last';
      },
    );
    expect(await g3.next()).toStrictEqual({ value: 'first', done: false });
    expect(lock1.isLocked()).toBe(true);
    expect(lock2.isLocked()).toBe(true);
    expect(await g3.next()).toStrictEqual({ value: 'second', done: false });
    expect(lock1.isLocked()).toBe(true);
    expect(lock2.isLocked()).toBe(true);
    expect(await g3.next()).toStrictEqual({ value: 'last', done: true });
    expect(lock1.isLocked()).toBe(false);
    expect(lock2.isLocked()).toBe(false);
    expect(acquireOrder).toStrictEqual([lock1, lock2]);
    expect(releaseOrder).toStrictEqual([lock2, lock1]);
  });
  test('splitting buffers', () => {
    const s1 = '';
    expect(s1.split('')).toStrictEqual([]);
    const b1 = Buffer.from(s1);
    expect(utils.bufferSplit(b1)).toStrictEqual([]);

    const s2 = '!';
    expect(s2.split('!')).toStrictEqual(['', '']);
    const b2 = Buffer.from(s2);
    expect(utils.bufferSplit(b2, Buffer.from('!'))).toStrictEqual([
      Buffer.from(''),
      Buffer.from(''),
    ]);

    const s3 = '!a';
    expect(s3.split('!')).toStrictEqual(['', 'a']);
    const b3 = Buffer.from(s3);
    expect(utils.bufferSplit(b3, Buffer.from('!'))).toStrictEqual([
      Buffer.from(''),
      Buffer.from('a'),
    ]);

    const s4 = 'a!';
    expect(s4.split('!')).toStrictEqual(['a', '']);
    const b4 = Buffer.from(s4);
    expect(utils.bufferSplit(b4, Buffer.from('!'))).toStrictEqual([
      Buffer.from('a'),
      Buffer.from(''),
    ]);

    const s5 = 'a!b';
    expect(s5.split('!')).toStrictEqual(['a', 'b']);
    const b5 = Buffer.from(s5);
    expect(utils.bufferSplit(b5, Buffer.from('!'))).toStrictEqual([
      Buffer.from('a'),
      Buffer.from('b'),
    ]);

    const s6 = '!a!b';
    expect(s6.split('!')).toStrictEqual(['', 'a', 'b']);
    const b6 = Buffer.from(s6);
    expect(utils.bufferSplit(b6, Buffer.from('!'))).toStrictEqual([
      Buffer.from(''),
      Buffer.from('a'),
      Buffer.from('b'),
    ]);

    const s7 = 'a!b!';
    expect(s7.split('!')).toStrictEqual(['a', 'b', '']);
    const b7 = Buffer.from(s7);
    expect(utils.bufferSplit(b7, Buffer.from('!'))).toStrictEqual([
      Buffer.from('a'),
      Buffer.from('b'),
      Buffer.from(''),
    ]);

    const s8 = '!a!b!';
    expect(s8.split('!')).toStrictEqual(['', 'a', 'b', '']);
    const b8 = Buffer.from(s8);
    expect(utils.bufferSplit(b8, Buffer.from('!'))).toStrictEqual([
      Buffer.from(''),
      Buffer.from('a'),
      Buffer.from('b'),
      Buffer.from(''),
    ]);

    const s9 = '!a!b!';
    expect(s8.split('!', 2)).toStrictEqual(['', 'a']);
    expect(s8.split('!', 3)).toStrictEqual(['', 'a', 'b']);
    expect(s8.split('!', 4)).toStrictEqual(['', 'a', 'b', '']);
    const b9 = Buffer.from(s9);
    expect(utils.bufferSplit(b9, Buffer.from('!'), 2)).toStrictEqual([
      Buffer.from(''),
      Buffer.from('a'),
    ]);
    expect(utils.bufferSplit(b9, Buffer.from('!'), 3)).toStrictEqual([
      Buffer.from(''),
      Buffer.from('a'),
      Buffer.from('b'),
    ]);
    expect(utils.bufferSplit(b9, Buffer.from('!'), 4)).toStrictEqual([
      Buffer.from(''),
      Buffer.from('a'),
      Buffer.from('b'),
      Buffer.from(''),
    ]);

    const s10 = 'abcd';
    expect(s10.split('')).toStrictEqual(['a', 'b', 'c', 'd']);
    const b10 = Buffer.from(s10);
    expect(utils.bufferSplit(b10)).toStrictEqual([
      Buffer.from('a'),
      Buffer.from('b'),
      Buffer.from('c'),
      Buffer.from('d'),
    ]);

    // Splitting while concatenating the remaining chunk
    const b11 = Buffer.from('!a!b!');
    expect(utils.bufferSplit(b11, Buffer.from('!'), 3, true)).toStrictEqual([
      Buffer.from(''),
      Buffer.from('a'),
      Buffer.from('b!'),
    ]);
    const b12 = Buffer.from('!ab!cd!e!!!!');
    expect(utils.bufferSplit(b12, Buffer.from('!'), 3, true)).toStrictEqual([
      Buffer.from(''),
      Buffer.from('ab'),
      Buffer.from('cd!e!!!!'),
    ]);
  });
  test('testing abort controller a', async () => {

    let cancel;
    const prom = new Promise((resolve, reject ) => {
      cancel = () => {reject(new Cancellation())}
    })
    const cancellablePromise = new CancellablePromise(prom, cancel)

    cancellablePromise.cancel()

    await cancellablePromise // throws a Cancellation object that subclasses Error


  })
  test('testing abort controller a', async () => {
    // what happens when we don't throw when canceling
    const waitProm = promise<void>();
    const cancel = () => waitProm.resolveP();
    const prom = async () => {
      await waitProm.p;
    }
    const canProm = new CancellablePromise(prom(), cancel);
    canProm.cancel();
    await canProm;
    // the promise is cancelled but will still try to finish in the background
  })
  test('using AbortController', async () => {

    const otherFun = async (timeout: number, options?: { signal?: AbortSignal }) => {
      const { signal } = { ...options };
      if (signal?.aborted === true) throw new Cancellation('aborted otherFun');
      await sleep(timeout);
    }

    const testfun = async (options?: { signal?: AbortSignal }) => {
      const { signal } = { ...options };
      // do thing
      while(true) {
      if (signal?.aborted === true) throw new Cancellation('aborted testfun');
      await otherFun(100, { signal });
      await otherFun(100);
      await otherFun(100, { signal });
      await otherFun(100);
      }
    }

    // Using with just the AbortController
    const controller = new AbortController();
    const funProm = testfun({ signal: controller.signal });
    setTimeout(() => controller.abort(), 1000);
    // await expect(funProm).rejects.toThrow();
    await funProm;

    // If we were to convert to a cancel-able promise
    const controller2 = new AbortController();
    const canProm = new CancellablePromise(testfun({ signal: controller2.signal }), () => controller2.abort())
    setTimeout(() => canProm.cancel(), 1000);
    // await expect(canProm).rejects.toThrow();
    await canProm;

    // if the function was a CancellablePromise then we could

    const testfun2 = async (options?: {signal: AbortSignal}) => {
      const { signal } = { ...options };
      // creating the cancellable promise
      const controller = new AbortController();
      const canProm = new CancellablePromise(testfun({signal: controller.signal}), () => controller.abort());
      const canceller = () => canProm.cancel();
      signal?.addEventListener('abort', canceller, {once: true});
      try {
        await canProm;
      } finally {
        signal?.removeEventListener('abort', canceller);
      }
    }

    // running
    const controller3 = new AbortController();
    const canProm3 = new CancellablePromise(testfun({ signal: controller3.signal }), () => controller3.abort())
    setTimeout(() => canProm3.cancel(), 1000);
    await canProm3;


    // type F = (...params: [...Array<unknown>, { signal: number }]) => unknown;
    type OptionalSignal<A> = A extends {signal?: AbortSignal} ? A : never;
    type testOption = {signal: AbortSignal};
    type B = OptionalSignal<testOption>;
    function testasd<T>(op: T) {
      op
    }
    type F = (...params: [...Array<unknown>, {signal?: AbortSignal}]) => unknown;
    function wrapCancel<T extends (...args: any[]) => Promise<unknown>>(func: T): (...funcArgs: Parameters<T>) => CancellablePromise<ReturnType<T>> {
      return (...args: Parameters<T>) => {
        const controller = new AbortController();
        return new CancellablePromise(func(...args, {signal: controller.signal}), () => controller.abort());
      }
    }
    const a = wrapCancel(testfun);
    const testprom = a();


    function logDuration<T extends (...args: any[]) => any>(func: T): (...funcArgs: Parameters<T>) => ReturnType<T> {
      const funcName = func.name;

      // Return a new function that tracks how long the original took
      return (...args: Parameters<T>): ReturnType<T> => {
        console.time(funcName);
        const results = func(...args);
        console.timeEnd(funcName);
        return results;
      };
    }

  })
});
