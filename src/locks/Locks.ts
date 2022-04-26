import type { ResourceAcquire, ResourceRelease } from '@matrixai/resources';
import type { NonEmptyArray } from '../types';
import { RWLockWriter } from '@matrixai/async-locks';

/**
 * Generic dynamic read-write lock collection
 * This enables advisory-locking across all domains
 */
class Locks {
  protected _locks: Map<string, RWLockWriter>;

  get locks(): ReadonlyMap<string, RWLockWriter> {
    return this._locks;
  }

  /**
   * Read-lock a sequence of ids
   * The ids will be sorted before locking to ensure lock-hierarchy
   * in order to prevent deadlocks
   */
  public lockRead(
    ...ids: NonEmptyArray<string>
  ): ResourceAcquire<NonEmptyArray<RWLockWriter>> {
    return async () => {
      ids.sort();
      const locks: Array<[string, ResourceRelease, RWLockWriter]> = [];
      for (const id of ids) {
        let lock = this._locks.get(id);
        if (lock == null) {
          lock = new RWLockWriter();
          this._locks.set(id, lock);
        }
        let lockRelease: ResourceRelease;
        try {
          [lockRelease] = await lock.acquireRead();
        } catch (e) {
          // Release all intermediate locks in reverse order
          locks.reverse();
          for (const [id, lockRelease, lock] of locks) {
            await lockRelease();
            if (!lock!.isLocked()) {
              this._locks.delete(id);
            }
          }
          throw e;
        }
        locks.push([id, lockRelease, lock]);
      }
      return [
        async () => {
          // Release all locks in reverse order
          locks.reverse();
          for (const [id, lockRelease, lock] of locks) {
            await lockRelease();
            if (!lock!.isLocked()) {
              this._locks.delete(id);
            }
          }
        },
        locks.map(([, , lock]) => lock) as NonEmptyArray<RWLockWriter>,
      ];
    };
  }

  /**
   * Write-lock a sequence of ids
   * The ids will be sorted before locking to ensure lock-hierarchy
   * in order to prevent deadlocks
   */
  public lockWrite(
    ...ids: NonEmptyArray<string>
  ): ResourceAcquire<NonEmptyArray<RWLockWriter>> {
    return async () => {
      ids.sort();
      const locks: Array<[string, ResourceRelease, RWLockWriter]> = [];
      for (const id of ids) {
        let lock = this._locks.get(id);
        if (lock == null) {
          lock = new RWLockWriter();
          this._locks.set(id, lock);
        }
        let lockRelease: ResourceRelease;
        try {
          [lockRelease] = await lock.acquireWrite();
        } catch (e) {
          // Release all intermediate locks in reverse order
          locks.reverse();
          for (const [id, lockRelease, lock] of locks) {
            await lockRelease();
            if (!lock!.isLocked()) {
              this._locks.delete(id);
            }
          }
          throw e;
        }
        locks.push([id, lockRelease, lock]);
      }
      return [
        async () => {
          // Release all locks in reverse order
          locks.reverse();
          for (const [id, lockRelease, lock] of locks) {
            await lockRelease();
            if (!lock!.isLocked()) {
              this._locks.delete(id);
            }
          }
        },
        locks.map(([, , lock]) => lock) as NonEmptyArray<RWLockWriter>,
      ];
    };
  }
}

export default Locks;
