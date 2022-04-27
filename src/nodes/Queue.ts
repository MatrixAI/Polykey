import type { PromiseType } from '../utils';
import Logger from '@matrixai/logger';
import { StartStop, ready } from '@matrixai/async-init/dist/StartStop';
import * as nodesErrors from './errors';
import { promise } from '../utils';

interface Queue extends StartStop {}
@StartStop()
class Queue {
  protected logger: Logger;
  protected end: boolean = false;
  protected queue: Array<() => Promise<void>> = [];
  protected runner: Promise<void>;
  protected plug_: PromiseType<void> = promise();
  protected drained_: PromiseType<void> = promise();

  constructor({ logger }: { logger?: Logger }) {
    this.logger = logger ?? new Logger(this.constructor.name);
  }

  public async start() {
    this.logger.info(`Starting ${this.constructor.name}`);
    const start = async () => {
      this.logger.debug('Starting queue');
      this.plug();
      const pace = async () => {
        await this.plug_.p;
        return !this.end;
      };
      // While queue hasn't ended
      while (await pace()) {
        const job = this.queue.shift();
        if (job == null) {
          // If the queue is empty then we pause the queue
          this.plug();
          continue;
        }
        try {
          await job();
        } catch (e) {
          if (!(e instanceof nodesErrors.ErrorNodeGraphSameNodeId)) throw e;
        }
      }
      this.logger.debug('queue has ended');
    };
    this.runner = start();
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop() {
    this.logger.info(`Stopping ${this.constructor.name}`);
    this.logger.debug('Stopping queue');
    // Tell the queue runner to end
    this.end = true;
    this.unplug();
    // Wait for runner to finish it's current job
    await this.runner;
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  /**
   * This adds a setNode operation to the queue
   */
  public push(f: () => Promise<void>): void {
    this.queue.push(f);
    this.unplug();
  }

  @ready(new nodesErrors.ErrorQueueNotRunning())
  public async drained(): Promise<void> {
    await this.drained_.p;
  }

  private plug(): void {
    this.logger.debug('Plugging queue');
    // Pausing queue
    this.plug_ = promise();
    // Signaling queue is empty
    this.drained_.resolveP();
  }

  private unplug(): void {
    this.logger.debug('Unplugging queue');
    // Starting queue
    this.plug_.resolveP();
    // Signalling queue is running
    this.drained_ = promise();
  }
}

export default Queue;
