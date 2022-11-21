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
  strict: boolean = true,
): asserts data is BufferLocked<T> {
  try {
    // There's a limit to how much data can be locked
    sodium.sodium_mlock(data);
  } catch {
    // If strict, we will throw an exception for being unable to lock
    if (strict) {
      throw new keysErrors.ErrorBufferLock();
    }
    // Otherwise we will ignore and continue
  }
}

/**
 * Unlocks locked buffer.
 * This will zero out the data.
 * TS does not allow unbranding of `BufferLocked`.
 * If the buffer is not locked, it will just zero out the data.
 */
function bufferUnlock(data: BufferLocked<Buffer>): void {
  sodium.sodium_munlock(data);
}

export { bufferLock, bufferUnlock };
