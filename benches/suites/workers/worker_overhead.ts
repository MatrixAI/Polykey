import b from 'benny';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as workersUtils from '@/workers/utils';
import { summaryName, suiteCommon } from '../../utils';

async function main() {
  const cores = 1;
  const logger = new Logger(`worker_overhead bench`, LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const workerManager = await workersUtils.createWorkerManager({
    cores,
    logger,
  });
  // 1 MiB worth of data is the ballpark range of data to be worth parallelising
  // 1 KiB of data is still too small
  const summary = await b.suite(
    summaryName(__filename),
    b.add('call overhead', async () => {
      // This calls a noop, this will show the overhead costs
      // All parallelised operation can never be faster than this
      // Therefore any call that takes less time than the overhead cost
      // e.g. 1.5ms is not worth parallelising
      await workerManager.call(async (w) => {
        await w.sleep(0);
      });
    }),
    b.add('parallel call overhead', async () => {
      // Assuming core count is 1
      // the performance should be half of `call overhead`
      await Promise.all([
        workerManager.call(async (w) => {
          await w.sleep(0);
        }),
        workerManager.call(async (w) => {
          await w.sleep(0);
        }),
      ]);
    }),
    b.add('parallel queue overhead', async () => {
      // This should be slightly faster than using call
      // This avoids an unnecessary wrapper into Promise
      await Promise.all([
        workerManager.queue(async (w) => {
          await w.sleep(0);
        }),
        workerManager.queue(async (w) => {
          await w.sleep(0);
        }),
      ]);
    }),
    ...suiteCommon,
  );
  await workerManager.destroy();
  return summary;
}

if (require.main === module) {
  void main();
}

export default main;
