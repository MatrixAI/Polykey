import { Lock } from '@matrixai/async-locks';

/**
 * Abstraction for using a Lock as a plug for asynchronous pausing of loops
 */
class Plug {
  protected lock: Lock = new Lock();
  protected lockReleaser: (e?: Error) => Promise<void> = async () => {};

  /**
   * Will cause waitForUnplug to block
   */
  public async plug() {
    if (this.lock.isLocked()) return;
    [this.lockReleaser] = await this.lock.lock(0)();
  }
  /**
   * Will release waitForUnplug from blocking
   */
  public async unplug() {
    await this.lockReleaser();
  }

  /**
   * Will block if plugged
   */
  public async waitForUnplug() {
    await this.lock.waitForUnlock();
  }

  public isPlugged() {
    return this.lock.isLocked();
  }
}

export default Plug;
