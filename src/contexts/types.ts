import type { Timer } from '@matrixai/timer';

type ContextCancellable = {
  signal: AbortSignal;
};

type ContextTimed = ContextCancellable & {
  timer: Timer;
};

export type { ContextCancellable, ContextTimed };
