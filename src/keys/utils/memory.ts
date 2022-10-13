import type { BufferLocked } from '../types';
import sodium from 'sodium-native';
import * as keysErrors from '../errors';

/**
 * Locks a buffer so that it cannot be swapped.
 * On systems that support it, the data will not be included in core dumps.
 * Calling this is idempotent.
 */
function bufferLock<T extends Buffer>(
  data: T,
  safeLock: boolean,
): asserts data is BufferLocked<T> {
  try {
    if (safeLock && sodium.sodium_mlock(data) === -1) {
      throw new keysErrors.ErrorBufferLock();
    }
  } catch {
    throw new keysErrors.ErrorBufferLock();
  }

}

/**
 * Unlocks locked buffer. This will zero out the data.
 * TS does not allow unbranding of `BufferLocked`.
 */
function bufferUnlock(data: BufferLocked<Buffer>): void {
  sodium.sodium_munlock(data);
}

export { bufferLock, bufferUnlock };
