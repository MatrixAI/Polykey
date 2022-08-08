import { performance } from 'perf_hooks';
import { Timer } from '@/timer';
import * as timerErrors from '@/timer/errors';
import { sleep } from '@/utils';

describe(Timer.name, () => {
  test('timer is thenable and awaitable', async () => {
    const t1 = new Timer();
    expect(await t1).toBeUndefined();
    expect(t1.status).toBe('resolved');
    const t2 = new Timer();
    await expect(t2).resolves.toBeUndefined();
    expect(t2.status).toBe('resolved');
  });
  test('timer delays', async () => {
    const t1 = new Timer({ delay: 20, handler: () => 1 });
    const t2 = new Timer({ delay: 10, handler: () => 2 });
    const result = await Promise.any([t1, t2]);
    expect(result).toBe(2);
  });
  test('timer handlers', async () => {
    const t1 = new Timer({ handler: () => 123 });
    expect(await t1).toBe(123);
    expect(t1.status).toBe('resolved');
    const t2 = new Timer({ delay: 100, handler: () => '123' });
    expect(await t2).toBe('123');
    expect(t2.status).toBe('resolved');
  });
  test('timer cancellation', async () => {
    const t1 = new Timer({ delay: 100 });
    t1.cancel();
    await expect(t1).rejects.toThrow(timerErrors.ErrorTimerCancelled);
    expect(t1.status).toBe('rejected');
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
        t2.cancel();
      })()
    ]);
    expect(results[0]).toBeInstanceOf(timerErrors.ErrorTimerCancelled);
    expect(t2.status).toBe('rejected');
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
    t1.cancel();
    await expect(t1).rejects.toThrow(timerErrors.ErrorTimerCancelled);
  });
  test('timer does not keep event loop alive', async () => {
    const f = async (timer: Timer | number = globalThis.maxTimeout) => {
      timer = (timer instanceof Timer) ? timer : new Timer({ delay: timer });
    };
    const g = async (timer: Timer | number = Infinity) => {
      timer = (timer instanceof Timer) ? timer : new Timer({ delay: timer });
    };
    await f();
    await f();
    await f();
    await g();
    await g();
    await g();
  });
  test('timer lifecycle', async () => {
    const t1 = Timer.createTimer<number>({ delay: 1000 });
    await t1.destroy('resolve');
    expect(t1.status).toBe('resolved');
    await expect(t1).resolves.toBeUndefined();
    const t2 = Timer.createTimer({ delay: 1000 });
    await t2.destroy('reject');
    expect(t2.status).toBe('rejected');
    await expect(t2).rejects.toThrow(timerErrors.ErrorTimerCancelled);
  });
});
