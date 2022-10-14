import { fc } from '@fast-check/jest';
import * as utils from '@/utils';

class SleepCommand implements fc.AsyncCommand<any, any> {
  constructor(
    public readonly ms: number,
  ) {}

  check() {
    return true;
  }

  async run () {
    await utils.sleep(this.ms);
  }

  toString() {
    return `SleepCommand(${this.ms})`;
  }
}

/**
 * Used with fast-check to schedule calling of a function
 */
const scheduleCall = <T>(
  s: fc.Scheduler,
  f: () => Promise<T>,
  label: string = 'scheduled call',
) => s.schedule(Promise.resolve(label)).then(() => f());

export {
  SleepCommand,
  scheduleCall
};
