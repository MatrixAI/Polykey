import Logger from '@matrixai/logger';
import { StartStop, ready } from '@matrixai/async-init/dist/StartStop';
import * as nodesErrors from './errors';

interface Queue extends StartStop {}
@StartStop()
class Queue {
  protected logger: Logger;
  protected endQueue: boolean = false;
  protected queue: Array<() => Promise<void>> = [];
  protected queuePlug: Promise<void>;
  protected queueUnplug: (() => void) | undefined;
  protected queueRunner: Promise<void>;
  protected queueEmpty: Promise<void>;
  protected queueDrainedSignal: () => void;

  constructor({ logger }: { logger?: Logger }) {
    this.logger = logger ?? new Logger(this.constructor.name);
  }

  public async start() {
    this.logger.info(`Starting ${this.constructor.name}`);
    this.queueRunner = this.startqueue();
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop() {
    this.logger.info(`Stopping ${this.constructor.name}`);
    await this.stopqueue();
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  /**
   * This adds a setNode operation to the queue
   */
  public queuePush(f: () => Promise<void>): void {
    this.queue.push(f);
    this.unplugQueue();
  }

  /**
   * This starts the process of digesting the queue
   */
  private async startqueue(): Promise<void> {
    this.logger.debug('Starting queue');
    this.plugQueue();
    // While queue hasn't ended
    while (true) {
      // Wait for queue to be unplugged
      await this.queuePlug;
      if (this.endQueue) break;
      const job = this.queue.shift();
      if (job == null) {
        // If the queue is empty then we pause the queue
        this.plugQueue();
        continue;
      }
      try {
        await job();
      } catch (e) {
        if (!(e instanceof nodesErrors.ErrorNodeGraphSameNodeId)) throw e;
      }
    }
    this.logger.debug('queue has ended');
  }

  private async stopqueue(): Promise<void> {
    this.logger.debug('Stopping queue');
    // Tell the queue runner to end
    this.endQueue = true;
    this.unplugQueue();
    // Wait for runner to finish it's current job
    await this.queueRunner;
  }

  private plugQueue(): void {
    if (this.queueUnplug == null) {
      this.logger.debug('Plugging queue');
      // Pausing queue
      this.queuePlug = new Promise((resolve) => {
        this.queueUnplug = resolve;
      });
      // Signaling queue is empty
      if (this.queueDrainedSignal != null) this.queueDrainedSignal();
    }
  }

  private unplugQueue(): void {
    if (this.queueUnplug != null) {
      this.logger.debug('Unplugging queue');
      // Starting queue
      this.queueUnplug();
      this.queueUnplug = undefined;
      // Signalling queue is running
      this.queueEmpty = new Promise((resolve) => {
        this.queueDrainedSignal = resolve;
      });
    }
  }

  @ready(new nodesErrors.ErrorQueueNotRunning())
  public async queueDrained(): Promise<void> {
    await this.queueEmpty;
  }
}

export default Queue;
