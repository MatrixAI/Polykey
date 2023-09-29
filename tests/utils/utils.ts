import type { NodeId } from '@/ids/types';
import { IdInternal } from '@matrixai/id';
import * as keysUtils from '@/keys/utils';
import * as rpcErrors from '@/rpc/errors';
import { promise } from '@/utils';

function generateRandomNodeId(): NodeId {
  const random = keysUtils.getRandomBytes(16).toString('hex');
  return IdInternal.fromString<NodeId>(random);
}

const expectRemoteError = async <T>(
  promise: Promise<T>,
  error,
): Promise<T | undefined> => {
  await expect(promise).rejects.toThrow(rpcErrors.ErrorPolykeyRemote);
  try {
    return await promise;
  } catch (e) {
    expect(e.cause).toBeInstanceOf(error);
  }
};

function testIf(condition: boolean) {
  return condition ? test : test.skip;
}

function describeIf(condition: boolean) {
  return condition ? describe : describe.skip;
}

function trackTimers() {
  const timerMap: Map<any, any> = new Map();
  const oldClearTimeout = globalThis.clearTimeout;
  const newClearTimeout = (...args) => {
    timerMap.delete(args[0]);
    // @ts-ignore: slight type mismatch
    oldClearTimeout(...args);
  };
  globalThis.clearTimeout = newClearTimeout;

  const oldSetTimeout = globalThis.setTimeout;
  const newSetTimeout = (handler: TimerHandler, timeout?: number) => {
    const prom = promise();
    const stack = Error();
    const newCallback = async (...args) => {
      // @ts-ignore: only expecting functions
      await handler(...args);
      prom.resolveP();
    };
    const result = oldSetTimeout(newCallback, timeout);
    timerMap.set(result, { timeout, stack });
    void prom.p.finally(() => {
      timerMap.delete(result);
    });
    return result;
  };
  // @ts-ignore: slight type mismatch
  globalThis.setTimeout = newSetTimeout;

  // Setting up interval
  const oldSetInterval = globalThis.setInterval;
  const newSetInterval = (...args) => {
    // @ts-ignore: slight type mismatch
    const result = oldSetInterval(...args);
    timerMap.set(result, { timeout: args[0], error: Error() });
    return result;
  };
  // @ts-ignore: slight type mismatch
  globalThis.setInterval = newSetInterval;

  const oldClearInterval = globalThis.clearInterval;
  const newClearInterval = (timer) => {
    timerMap.delete(timer);
    return oldClearInterval(timer);
  };
  // @ts-ignore: slight type mismatch
  globalThis.clearInterval = newClearInterval();

  return timerMap;
}

/**
 * Utility for creating a promise that resolves or rejects based on events from a target.
 */
function promFromEvent<
  EResolve extends Event = Event,
  EReject extends Event = Event,
  T extends EventTarget = EventTarget
>(target: T, resolveEvent: new () => EResolve, rejectEvent?: new () => EReject) {
  const handleResolveEvent = (evt: EResolve) => prom.resolveP(evt);
  const handleRejectEvent = (evt: EReject) => prom.rejectP(evt);
  const prom = promise<EResolve>();
  target.addEventListener(resolveEvent.name, handleResolveEvent);
  if (rejectEvent != null) target.addEventListener(rejectEvent.name, handleRejectEvent);
  // Prevent unhandled rejection errors
  void prom.p.then(
    () => {},
    () => {},
  ).finally(() => {
    // clean up
    target.removeEventListener(resolveEvent.name, handleResolveEvent);
    if (rejectEvent != null) target.removeEventListener(rejectEvent.name, handleRejectEvent);
  })
  return prom;
}

export {
  generateRandomNodeId,
  expectRemoteError,
  testIf,
  describeIf,
  trackTimers,
  promFromEvent,
};
