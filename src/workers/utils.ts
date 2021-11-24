import type { PolykeyWorkerModule } from './polykeyWorkerModule';
import type { PolykeyWorkerManagerInterface } from './types';

import type Logger from '@matrixai/logger';
import { WorkerManager } from '@matrixai/workers';
import { spawn, Worker } from 'threads';

async function createWorkerManager({
  cores,
  logger,
}: {
  cores?: number;
  logger?: Logger;
}): Promise<PolykeyWorkerManagerInterface> {
  return await WorkerManager.createWorkerManager<PolykeyWorkerModule>({
    workerFactory: () => spawn(new Worker('./polykeyWorker')),
    cores,
    logger,
  });
}

export { createWorkerManager };
