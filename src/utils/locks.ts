import type { MutexInterface } from 'async-mutex';
import { Mutex } from 'async-mutex';

/**
 * Single threaded write-preferring read write lock
 */
class RWLock {
  protected readersLock: Mutex = new Mutex();
  protected writersLock: Mutex = new Mutex();
  protected readersRelease: MutexInterface.Releaser;
  protected readerCountBlocked: number = 0;
  protected _readerCount: number = 0;
  protected _writerCount: number = 0;

  public get readerCount(): number {
    return this._readerCount + this.readerCountBlocked;
  }

  public get writerCount(): number {
    return this._writerCount;
  }

  public async withRead<T>(f: () => Promise<T>): Promise<T> {
    const release = await this.acquireRead();
    try {
      return await f();
    } finally {
      release();
    }
  }

  public async withWrite<T>(f: () => Promise<T>): Promise<T> {
    const release = await this.acquireWrite();
    try {
      return await f();
    } finally {
      release();
    }
  }

  public async acquireRead(): Promise<() => void> {
    if (this._writerCount > 0) {
      ++this.readerCountBlocked;
      await this.writersLock.waitForUnlock();
      --this.readerCountBlocked;
    }
    const readerCount = ++this._readerCount;
    // The first reader locks
    if (readerCount === 1) {
      this.readersRelease = await this.readersLock.acquire();
    }
    return () => {
      const readerCount = --this._readerCount;
      // The last reader unlocks
      if (readerCount === 0) {
        this.readersRelease();
      }
    };
  }

  public async acquireWrite(): Promise<() => void> {
    ++this._writerCount;
    const writersRelease = await this.writersLock.acquire();
    this.readersRelease = await this.readersLock.acquire();
    return () => {
      this.readersRelease();
      writersRelease();
      --this._writerCount;
    };
  }

  public isLocked(): boolean {
    return this.readersLock.isLocked() || this.writersLock.isLocked();
  }

  public isLockedReader(): boolean {
    return this.readersLock.isLocked();
  }

  public isLockedWriter(): boolean {
    return this.writersLock.isLocked();
  }

  public async waitForUnlock(): Promise<void> {
    await Promise.all([
      this.readersLock.waitForUnlock(),
      this.writersLock.waitForUnlock(),
    ]);
    return;
  }
}

export { RWLock };
