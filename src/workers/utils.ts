import type { PolykeyWorkerModule } from './polykeyWorkerModule';
import type { PolykeyWorkerManagerInterface } from './types';
import type Logger from '@matrixai/logger';
import { WorkerManager } from '@matrixai/workers';
import { spawn, Worker } from 'threads';
import * as workerErrors from './errors';

async function createWorkerManager({
  cores,
  logger,
}: {
  cores?: number;
  logger?: Logger;
}): Promise<PolykeyWorkerManagerInterface> {
  if (cores != null && (cores < 0 || isNaN(cores))) {
    throw new workerErrors.ErrorWorkersInvalidCores();
  }
  return await WorkerManager.createWorkerManager<PolykeyWorkerModule>({
    workerFactory: () => spawn(new Worker('./polykeyWorker')),
    cores,
    logger,
  });
}

export { createWorkerManager };
