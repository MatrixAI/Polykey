import type Timer from '../timer/Timer';

type ContextCancellable = {
  signal: AbortSignal;
};

type ContextTimed = ContextCancellable & {
  timer: Timer;
};

export type { ContextCancellable, ContextTimed };
