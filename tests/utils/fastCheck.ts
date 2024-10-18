import type { Arbitrary } from 'fast-check';
import { fc } from '@fast-check/jest';
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

/**
 * Creates an ASCII file name
 */
const fileNameArb = () =>
  fc
    .stringMatching(/^[^<>.:"/\\|?* ]{2,10}$/)
    .filter((name) => name.trim().length > 0) // Filter out all-space values
    .noShrink();

/**
 * Creates an array with the file name arbitrary, then returns a tuple
 * containing the array and a random number between 0 and the length of the
 * array of file names. These bounds are modifiable by the min and max offset.
 */
const fileNameLengthSampleArb = (
  filesMinLength = 2,
  filesMaxLength = 10,
  minOffset = 0,
  maxOffset = -2,
): Arbitrary<[Array<string>, number]> =>
  fc
    .array(fileNameArb(), {
      minLength: filesMinLength,
      maxLength: filesMaxLength,
    })
    .chain((value) =>
      fc.tuple(
        fc.constant(value),
        fc.integer({ min: minOffset, max: value.length + maxOffset }),
      ),
    );

/**
 * Creates a valid ASCII vault name
 */
const vaultNameArb = () =>
  fc
    .stringMatching(/^[:\\]{6,10}$/)
    .map((value) => `vault-${value}`)
    .noShrink();

export {
  SleepCommand,
  scheduleCall,
  fileNameArb,
  fileNameLengthSampleArb,
  vaultNameArb,
};
