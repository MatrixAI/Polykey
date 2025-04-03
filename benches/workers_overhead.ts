import url from 'node:url';
import path from 'node:path';
import b from 'benny';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { suiteCommon } from './utils/utils.js';
import * as workersUtils from '#workers/utils.js';

const filename = url.fileURLToPath(new URL(import.meta.url));

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
    path.basename(filename, path.extname(filename)),
    b.add('call overhead', async () => {
      // This calls a noop, this will show the overhead costs
      // All parallelised operation can never be faster than this
      // Therefore any call that takes less time than the overhead cost
      // e.g. 1.5ms is not worth parallelising
      await workerManager.methods.sleep({ delay: 0 });
    }),
    b.add('parallel call overhead', async () => {
      // Assuming core count is 1
      // the performance should be half of `call overhead`
      await Promise.all([
        await workerManager.methods.sleep({ delay: 0 }),
        await workerManager.methods.sleep({ delay: 0 }),
      ]);
    }),
    ...suiteCommon,
  );
  await workerManager.destroy();
  return summary;
}

if (import.meta.url.startsWith('file:')) {
  const modulePath = url.fileURLToPath(import.meta.url);
  if (process.argv[1] === modulePath) {
    void main();
  }
}

export default main;
