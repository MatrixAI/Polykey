import type { ContextCancellable } from '@/contexts/types';
import { PromiseCancellable } from '@matrixai/async-cancellable';
import cancellable from '@/contexts/functions/cancellable';
import { AsyncFunction, sleep } from '@/utils';

describe('context/functions/cancellable', () => {
  test('cancellable syntax', async () => {
    const f = async function (
      ctx: ContextCancellable,
      a: number,
      b: number,
    ): Promise<number> {
      expect(ctx.signal).toBeInstanceOf(AbortSignal);
      return a + b;
    };
    const fCancellable = cancellable(f);
    const pC = fCancellable(undefined, 1, 2);
    expect(pC).toBeInstanceOf(PromiseCancellable);
    await pC;
    await fCancellable({}, 1, 2);
    await fCancellable({ signal: new AbortController().signal }, 1, 2);
    expect(fCancellable).toBeInstanceOf(Function);
    expect(fCancellable).not.toBeInstanceOf(AsyncFunction);
  });
});
