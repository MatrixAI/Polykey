import type { fc } from '@fast-check/jest';
import * as utils from '@/utils';

class SleepCommand implements fc.AsyncCommand<any, any> {
  constructor(public readonly ms: number) {}

  check() {
    return true;
  }

  async run() {
    await utils.sleep(this.ms);
  }

  toString() {
    return `SleepCommand(${this.ms})`;
  }
}

/**
 * Used with fast-check to schedule calling of a function.
 * This enables the `f` call to be randomly delayed by the fast check scheduler.
 * You must still await the result of this call if you want to see the results.
 */
const scheduleCall = <T>(s: fc.Scheduler, f: () => Promise<T>) =>
  s.schedule(Promise.resolve()).then(() => f());

export { SleepCommand, scheduleCall };
