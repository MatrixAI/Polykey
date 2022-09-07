import type { ContextCancellable } from '@/contexts/types';
import type { PromiseCancellable } from '@matrixai/async-cancellable';
import context from '@/contexts/decorators/context';
import cancellable from '@/contexts/decorators/cancellable';
import { AsyncFunction } from '@/utils';

describe('context/decorators/cancellable', () => {
  describe('cancellable decorator runtime validation', () => {
    test('cancellable decorator requires context decorator', async () => {
      expect(() => {
        class C {
          @cancellable()
          async f(_ctx: ContextCancellable): Promise<string> {
            return 'hello world';
          }
        }
        return C;
      }).toThrow(TypeError);
    });
    test('cancellable decorator fails on invalid context', async () => {
      await expect(async () => {
        class C {
          @cancellable()
          async f(@context _ctx: ContextCancellable): Promise<string> {
            return 'hello world';
          }
        }
        const c = new C();
        // @ts-ignore invalid context signal
        await c.f({ signal: 'lol' });
      }).rejects.toThrow(TypeError);
    });
  });
  describe('cancellable decorator syntax', () => {
    // Decorators cannot change type signatures
    // use overloading to change required context parameter to optional context parameter
    const symbolFunction = Symbol('sym');
    class X {
      functionPromise(
        ctx?: Partial<ContextCancellable>,
      ): PromiseCancellable<void>;
      @cancellable()
      functionPromise(@context ctx: ContextCancellable): Promise<void> {
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        return new Promise((resolve) => void resolve());
      }

      asyncFunction(
        ctx?: Partial<ContextCancellable>,
      ): PromiseCancellable<void>;
      @cancellable(true)
      async asyncFunction(@context ctx: ContextCancellable): Promise<void> {
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
      }

      [symbolFunction](
        ctx?: Partial<ContextCancellable>,
      ): PromiseCancellable<void>;
      @cancellable(false)
      [symbolFunction](@context ctx: ContextCancellable): Promise<void> {
        expect(ctx.signal).toBeInstanceOf(AbortSignal);
        return new Promise((resolve) => void resolve());
      }
    }
    const x = new X();
    test('functionPromise', async () => {
      await x.functionPromise();
      await x.functionPromise({});
      await x.functionPromise({ signal: new AbortController().signal });
      expect(x.functionPromise).toBeInstanceOf(Function);
      expect(x.functionPromise.name).toBe('functionPromise');
    });
    test('asyncFunction', async () => {
      await x.asyncFunction();
      await x.asyncFunction({});
      await x.asyncFunction({ signal: new AbortController().signal });
      expect(x.asyncFunction).toBeInstanceOf(Function);
      expect(x.asyncFunction).not.toBeInstanceOf(AsyncFunction);
      expect(x.asyncFunction.name).toBe('asyncFunction');
    });
    test('symbolFunction', async () => {
      await x[symbolFunction]();
      await x[symbolFunction]({});
      await x[symbolFunction]({ signal: new AbortController().signal });
      expect(x[symbolFunction]).toBeInstanceOf(Function);
      expect(x[symbolFunction].name).toBe('[sym]');
    });
  });
});
