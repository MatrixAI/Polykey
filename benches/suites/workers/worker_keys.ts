import type { Summary } from 'benny/lib/internal/common-types';
import b from 'benny';
import crypto from 'crypto';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { Transfer } from 'threads';
import { WorkerManager, PolykeyWorkerModule, utils as workersUtils } from '@/workers';
import { summaryName, suiteCommon } from '../../utils';

async function main() {
  const cores = 1;
  const logger = new Logger(`worker_overhead bench`, LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const workerManager = await workersUtils.createWorkerManager({ cores, logger });
  let summary: Summary;
  try {
    summary = await b.suite(
      summaryName(__filename),
      b.add('hash password', async () => {
        await workerManager.call(async (w) => {
          const [hash, salt] = await w.hashPassword('password');
          return [Buffer.from(hash), Buffer.from(salt)];
        });
      }),
      ...suiteCommon,
    );
  } finally {
    await workerManager.destroy();
  }
  return summary;
}

if (require.main === module) {
  void main();
}

export default main;
