import type { PolykeyWorker } from './polykeyWorkerModule';
import { expose } from 'threads/worker';

import polykeyWorker from './polykeyWorkerModule';

expose(polykeyWorker);

export type { PolykeyWorker };
