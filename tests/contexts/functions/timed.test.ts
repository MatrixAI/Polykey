import type { ContextTimed } from '@/contexts/types';
import timed from '@/contexts/functions/timed';
import Timer from '@/timer/Timer';
import { AsyncFunction, GeneratorFunction, AsyncGeneratorFunction, sleep } from '@/utils';

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
      fTimed(undefined);
      fTimed({});
      fTimed({ timer: new Timer({ delay: 50 }) }, (t) => {
        expect(t.delay).toBe(50);
      });
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
      await fTimed(undefined);
      await fTimed({});
      await fTimed({ timer: new Timer({ delay: 50 }) }, (t) => {
        expect(t.delay).toBe(50);
      });
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
});
