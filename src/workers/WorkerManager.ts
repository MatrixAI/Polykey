import { WorkerManager as WorkerManager_ } from '@matrixai/workers';
import { PolykeyWorker } from './polykeyWorkerModule';
import { spawn, Worker } from 'threads';
import Logger from '@matrixai/logger';

/**
 * Type alias for `WorkerManager_<PolykeyWorker>`
 */
class WorkerManager extends WorkerManager_<PolykeyWorker> {
  static createPolykeyWorkerManager({
    cores,
    logger,
  }: {
    cores?: number;
    logger?: Logger;
  }): Promise<WorkerManager> {
    return super.createWorkerManager({
      workerFactory: () => spawn(new Worker('./polykeyWorker.ts')),
      cores,
      logger,
    });
  }
}

export default WorkerManager;
