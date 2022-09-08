import type { ContextTimed } from '@/contexts/types';
import timed from '@/contexts/functions/timed';
import Timer from '@/timer/Timer';
import { AsyncFunction, sleep } from '@/utils';

describe('context/functions/timed', () => {
  describe('timed syntax', () => {
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
  });
});
