import type { DBTransaction } from '@matrixai/db';
import type Timer from '../timer/Timer';

type ContextCancellable = {
  signal: AbortSignal;
};

type ContextTimed = ContextCancellable & {
  timer: Timer;
};

type ContextTransactional = {
  tran: DBTransaction;
};

export type { ContextCancellable, ContextTimed, ContextTransactional };
