import type { MutexInterface } from 'async-mutex';
import { Mutex } from 'async-mutex';

class RWLock {
  protected readerCount: number = 0;
  protected lock: Mutex = new Mutex();
  protected release: MutexInterface.Releaser;

  public async read<T>(f: () => Promise<T>): Promise<T> {
    let readerCount = ++this.readerCount;
    // The first reader locks
    if (readerCount === 1) {
      this.release = await this.lock.acquire();
    }
    try {
      return await f();
    } finally {
      readerCount = --this.readerCount;
      // The last reader unlocks
      if (readerCount === 0) {
        this.release();
      }
    }
  }

  public async write<T>(f: () => Promise<T>): Promise<T> {
    this.release = await this.lock.acquire();
    try {
      return await f();
    } finally {
      this.release();
    }
  }
}

export { RWLock };
