import type { ContextCancellable } from '@/contexts/types';
import context from '@/contexts/decorators/context';
import cancellable from '@/contexts/decorators/cancellable';

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
});
