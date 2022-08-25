import type { PromiseDeconstructed } from '../types';
import { promise } from '../utils';

class Concurrency {
  private concurrentLimit: number;
  private count: number;
  private plug: PromiseDeconstructed<void> | null = null;
  private emptyProm: PromiseDeconstructed<void> | null = null;

  constructor(concurrentLimit: number) {
    this.concurrentLimit = concurrentLimit;
    this.count = 0;
  }

  get activeCount() {
    return this.count;
  }

  /**
   * This will run the function if the limit has not been reached, otherwise it will wait
   */
  public async withConcurrency(f: () => Promise<void>): Promise<void> {
    // Waiting for free slot
    await this.plug?.p;

    // Incrementing and plugging if full
    this.increment();

    // Running function
    f()
      .finally(() => this.decrement())
      .catch();
  }

  /**
   * Increment and plug if full
   */
  private increment() {
    if (this.count < this.concurrentLimit) {
      this.count += 1;
      if (this.emptyProm == null) this.emptyProm = promise();
      if (this.count >= this.concurrentLimit) this.plug = promise();
    }
  }

  /**
   * Decrement and unplugs, resolves emptyProm if empty
   */
  private decrement() {
    this.count -= 1;
    if (this.count < this.concurrentLimit) {
      this.plug?.resolveP();
      this.plug = null;
    }
    if (this.count === 0) {
      this.emptyProm?.resolveP();
      this.emptyProm = null;
    }
  }

  public async awaitEmpty() {
    await this.emptyProm?.p;
  }
}

export default Concurrency;
