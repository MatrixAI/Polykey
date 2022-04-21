import Logger from '@matrixai/logger';
import { StartStop, ready } from '@matrixai/async-init/dist/StartStop';
import * as nodesErrors from './errors';

interface SetNodeQueue extends StartStop {}
@StartStop()
class SetNodeQueue {
  protected logger: Logger;
  protected endQueue: boolean = false;
  protected setNodeQueue: Array<() => Promise<void>> = [];
  protected setNodeQueuePlug: Promise<void>;
  protected setNodeQueueUnplug: (() => void) | undefined;
  protected setNodeQueueRunner: Promise<void>;
  protected setNodeQueueEmpty: Promise<void>;
  protected setNodeQueueDrained: () => void;

  constructor({ logger }: { logger?: Logger }) {
    this.logger = logger ?? new Logger(this.constructor.name);
  }

  public async start() {
    this.logger.info(`Starting ${this.constructor.name}`);
    this.setNodeQueueRunner = this.startSetNodeQueue();
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop() {
    this.logger.info(`Stopping ${this.constructor.name}`);
    await this.stopSetNodeQueue();
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  /**
   * This adds a setNode operation to the queue
   */
  public queueSetNode(f: () => Promise<void>): void {
    this.setNodeQueue.push(f);
    this.unplugQueue();
  }

  /**
   * This starts the process of digesting the queue
   */
  private async startSetNodeQueue(): Promise<void> {
    this.logger.debug('Starting setNodeQueue');
    this.plugQueue();
    // While queue hasn't ended
    while (true) {
      // Wait for queue to be unplugged
      await this.setNodeQueuePlug;
      if (this.endQueue) break;
      const job = this.setNodeQueue.shift();
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
    this.logger.debug('setNodeQueue has ended');
  }

  private async stopSetNodeQueue(): Promise<void> {
    this.logger.debug('Stopping setNodeQueue');
    // Tell the queue runner to end
    this.endQueue = true;
    this.unplugQueue();
    // Wait for runner to finish it's current job
    await this.setNodeQueueRunner;
  }

  private plugQueue(): void {
    if (this.setNodeQueueUnplug == null) {
      this.logger.debug('Plugging setNodeQueue');
      // Pausing queue
      this.setNodeQueuePlug = new Promise((resolve) => {
        this.setNodeQueueUnplug = resolve;
      });
      // Signaling queue is empty
      if (this.setNodeQueueDrained != null) this.setNodeQueueDrained();
    }
  }

  private unplugQueue(): void {
    if (this.setNodeQueueUnplug != null) {
      this.logger.debug('Unplugging setNodeQueue');
      // Starting queue
      this.setNodeQueueUnplug();
      this.setNodeQueueUnplug = undefined;
      // Signalling queue is running
      this.setNodeQueueEmpty = new Promise((resolve) => {
        this.setNodeQueueDrained = resolve;
      });
    }
  }

  @ready(new nodesErrors.ErrorSetNodeQueueNotRunning())
  public async queueDrained(): Promise<void> {
    await this.setNodeQueueEmpty;
  }
}

export default SetNodeQueue;
