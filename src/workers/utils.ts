import type { PolykeyWorkerModule } from './polykeyWorkerModule';
import type { PolykeyWorkerManagerInterface } from './types';

import { WorkerManager } from '@matrixai/workers';
import Logger from '@matrixai/logger';
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
