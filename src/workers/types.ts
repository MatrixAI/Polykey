import type { WorkerManagerInterface } from '@matrixai/workers';
import type { PolykeyWorkerModule } from './polykeyWorkerModule';

type PolykeyWorkerManagerInterface =
  WorkerManagerInterface<PolykeyWorkerModule>;

export type { PolykeyWorkerManagerInterface };
