import context from '@/contexts/decorators/context';
import timed from '@/contexts/decorators/timed';
import Timer from '@/timer/Timer';
import {
  AsyncFunction,
  GeneratorFunction,
  AsyncGeneratorFunction,
} from '@/utils';

describe('context/decorators/timed', () => {
  test('timed decorator', async () => {
    const s = Symbol('sym');
    class X {
      a(
        ctx?: { signal?: AbortSignal; timer?: Timer },
        check?: (t: Timer) => any,
      ): void;
      @timed(1000)
      a(
        @context ctx: { signal: AbortSignal; timer: Timer },
        check?: (t: Timer) => any,
      ): void {
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        expect(ctx.timer).toBeInstanceOf(Timer);
        if (check != null) check(ctx.timer);
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
      ): void;
      @timed()
      [s](
        @context ctx: { signal: AbortSignal; timer: Timer },
        check?: (t: Timer) => any,
      ): void {
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        expect(ctx.timer).toBeInstanceOf(Timer);
        if (check != null) check(ctx.timer);
      }
    }
    const x = new X();
    x.a();
    x.a({});
    x.a({ timer: new Timer({ delay: 100 }) }, (t) => {
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
    x[s]();
    x[s]({});
    x[s]({ timer: new Timer({ delay: 250 }) }, (t) => {
      expect(t.delay).toBe(250);
    });
    expect(x[s]).toBeInstanceOf(Function);
    expect(x[s].name).toBe('[sym]');
  });
});
