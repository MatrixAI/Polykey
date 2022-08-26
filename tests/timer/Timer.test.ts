import { performance } from 'perf_hooks';
import { Timer } from '@/timer';
import { sleep } from '@/utils';

describe(Timer.name, () => {
  test('timer is thenable and awaitable', async () => {
    const t1 = new Timer();
    expect(await t1).toBeUndefined();
    expect(t1.status).toBe('settled');
    const t2 = new Timer();
    await expect(t2).resolves.toBeUndefined();
    expect(t2.status).toBe('settled');
  });
  test('timer delays', async () => {
    const t1 = new Timer({ delay: 20, handler: () => 1 });
    const t2 = new Timer(() => 2, 10);
    const result = await Promise.any([t1, t2]);
    expect(result).toBe(2);
  });
  test('timer handlers', async () => {
    const t1 = new Timer(() => 123);
    expect(await t1).toBe(123);
    expect(t1.status).toBe('settled');
    const t2 = new Timer({ delay: 100, handler: () => '123' });
    expect(await t2).toBe('123');
    expect(t2.status).toBe('settled');
  });
  test('timer cancellation', async () => {
    const t1 = new Timer(undefined, 100);
    t1.cancel();
    await expect(t1).rejects.toBeUndefined();
    expect(t1.status).toBe('settled');
    const t2 = new Timer({ delay: 100 });
    const results = await Promise.all([
      (async () => {
        try {
          await t2;
        } catch (e) {
          return e;
        }
      })(),
      (async () => {
        t2.cancel('Surprise!');
      })(),
    ]);
    expect(results[0]).toBe('Surprise!');
    expect(t2.status).toBe('settled');
  });
  test('timer cancellation early', async () => {
    let resolveHandlerCalledP;
    const handlerCalledP = new Promise<void>((resolve) => {
      resolveHandlerCalledP = resolve;
    });
    let p;
    const handler = jest.fn().mockImplementation((signal: AbortSignal) => {
      resolveHandlerCalledP();
      p = new Promise((resolve, reject) => {
        if (signal.aborted) {
          reject('handler abort start');
          return;
        }
        const timeout = setTimeout(() => resolve('handler result'), 100);
        signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject('handler abort during');
        }, { once: true });
      });
      return p;
    });
    // Lazy means that it will do an early rejection
    const t = new Timer({
      handler,
      delay: 100,
      lazy: false,
    });
    await handlerCalledP;
    expect(handler).toBeCalledWith(expect.any(AbortSignal));
    t.cancel('timer abort');
    await expect(t).rejects.toBe('timer abort');
    await expect(p).rejects.toBe('handler abort during');
  });
  test('timer cancellation lazy', async () => {
    let resolveHandlerCalledP;
    const handlerCalledP = new Promise<void>((resolve) => {
      resolveHandlerCalledP = resolve;
    });
    let p;
    const handler = jest.fn().mockImplementation((signal: AbortSignal) => {
      resolveHandlerCalledP();
      p = new Promise((resolve, reject) => {
        if (signal.aborted) {
          reject('handler abort start');
          return;
        }
        const timeout = setTimeout(() => resolve('handler result'), 100);
        signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject('handler abort during');
        }, { once: true });
      });
      return p;
    });
    // Lazy means that it will not do an early rejection
    const t = new Timer({
      handler,
      delay: 100,
      lazy: true,
    });
    await handlerCalledP;
    expect(handler).toBeCalledWith(expect.any(AbortSignal));
    t.cancel('timer abort');
    await expect(t).rejects.toBe('handler abort during');
    await expect(p).rejects.toBe('handler abort during');
  });
  test('timer timestamps', async () => {
    const start = new Date(performance.timeOrigin + performance.now());
    await sleep(10);
    const t = new Timer({ delay: 100 });
    expect(t.status).toBeNull();
    expect(t.timestamp).toBeAfter(start);
    expect(t.scheduled).toBeAfter(start);
    expect(t.scheduled).toBeAfterOrEqualTo(t.timestamp);
    const delta = t.scheduled!.getTime() - t.timestamp.getTime();
    expect(t.getTimeout()).toBeLessThanOrEqual(delta);
  });
  test('timer primitive string and number', () => {
    const t1 = new Timer();
    expect(t1.valueOf()).toBe(0);
    expect(+t1).toBe(0);
    expect(t1.toString()).toBe('0');
    expect(`${t1}`).toBe('0');
    const t2 = new Timer({ delay: 100 });
    expect(t2.valueOf()).toBePositive();
    expect(+t2).toBePositive();
    expect(t2.toString()).toMatch(/\d+/);
    expect(`${t2}`).toMatch(/\d+/);
  });
  test('timer with infinite delay', async () => {
    const t1 = new Timer({ delay: Infinity });
    expect(t1.delay).toBe(Infinity);
    expect(t1.scheduled).toBeUndefined();
    expect(t1.getTimeout()).toBe(Infinity);
    expect(t1.valueOf()).toBe(Infinity);
    expect(+t1).toBe(Infinity);
    expect(t1.toString()).toBe('Infinity');
    expect(`${t1}`).toBe('Infinity');
    t1.cancel(new Error('Oh No'));
    await expect(t1).rejects.toThrow('Oh No');
  });
  test('timer does not keep event loop alive', async () => {
    const f = async (timer: Timer | number = globalThis.maxTimeout) => {
      timer = timer instanceof Timer ? timer : new Timer({ delay: timer });
    };
    const g = async (timer: Timer | number = Infinity) => {
      timer = timer instanceof Timer ? timer : new Timer({ delay: timer });
    };
    await f();
    await f();
    await f();
    await g();
    await g();
    await g();
  });
  test('custom signal handler ignores default rejection', async () => {
    const onabort = jest.fn();
    const t = new Timer(() => 1, 50, false, (signal) => {
      signal.onabort = onabort;
    });
    t.cancel('abort');
    await expect(t).resolves.toBe(1);
    expect(onabort).toBeCalled();
  });
  test('custom abort controller ignores default rejection', async () => {
    const onabort = jest.fn();
    const abortController = new AbortController();
    abortController.signal.onabort = onabort;
    const t = new Timer(() => 1, 50, false, abortController);
    t.cancel('abort');
    await expect(t).resolves.toBe(1);
    expect(onabort).toBeCalled();
  });
});
