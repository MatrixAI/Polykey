import type { NodeIdString, NodeId } from '../ids/types';
import type { NodeContact } from './types';
import type { Semaphore } from '@matrixai/async-locks';
import type { ContextCancellable } from '@matrixai/contexts';
import * as nodesUtils from './utils';
import * as utils from '../utils';

// Temp utility class for tracking shared queue
export class NodeConnectionQueue {
  protected nodesContacted: Set<NodeIdString> = new Set();
  protected nodesFoundSignal: Set<NodeIdString> = new Set();
  protected nodesFoundDirect: Set<NodeIdString> = new Set();

  protected queueSignal: Array<[NodeId, NodeId | undefined]> = [];
  protected queueDirect: Array<[NodeId, NodeContact]> = [];

  protected nodeDistanceCmp: (
    [nodeId1]: [NodeId, unknown],
    [nodeId2]: [NodeId, unknown],
  ) => 0 | 1 | -1;
  protected connectionMade: boolean = false;
  public nodesRunningSignal: Set<Promise<void>> = new Set();
  public nodesRunningDirect: Set<Promise<void>> = new Set();

  constructor(
    protected nodeIdSelf: NodeId,
    protected nodeIdTarget: NodeId,
    protected limit: number,
    protected rateLimitSignal: Semaphore,
    protected rateLimitDirect: Semaphore,
  ) {
    const nodeDistanceCmp = nodesUtils.nodeDistanceCmpFactory(nodeIdTarget);
    this.nodeDistanceCmp = (
      [nodeId1]: [NodeId, unknown],
      [nodeId2]: [NodeId, unknown],
    ) => nodeDistanceCmp(nodeId1, nodeId2);
  }

  /**
   * Adds the node to the queueSignal and found set.
   * Nodes that are in the found or contacted sets are filtered out.
   * @param nodeIdTarget
   * @param nodeIdSignaller
   */
  public queueNodeSignal(
    nodeIdTarget: NodeId,
    nodeIdSignaller: NodeId | undefined,
  ) {
    const nodeIdTargetString = nodeIdTarget.toString() as NodeIdString;
    // If in the found, contacted or our own nodeId then skip
    if (
      this.nodesContacted.has(nodeIdTargetString) ||
      this.nodesFoundSignal.has(nodeIdTargetString) ||
      this.nodeIdSelf.equals(nodeIdTarget)
    ) {
      return;
    }
    this.nodesFoundSignal.add(nodeIdTargetString);
    // Add to queue
    this.queueSignal.push([nodeIdTarget, nodeIdSignaller]);
    // Sort queue
    this.queueSignal.sort(this.nodeDistanceCmp);
    this.queueSignal.splice(20);
  }

  public queueNodeDirect(nodeIdTarget: NodeId, nodeContact: NodeContact) {
    const nodeIdTargetString = nodeIdTarget.toString() as NodeIdString;
    // If in the found, contacted or our own nodeId then skip
    if (
      this.nodesContacted.has(nodeIdTargetString) ||
      this.nodesFoundDirect.has(nodeIdTargetString) ||
      this.nodeIdSelf.equals(nodeIdTarget)
    ) {
      return;
    }
    this.nodesFoundDirect.add(nodeIdTargetString);
    // Add to queue
    this.queueDirect.push([nodeIdTarget, nodeContact]);
    // Sort queue
    this.queueDirect.sort(this.nodeDistanceCmp);
  }

  /**
   * Uses a bracketing pattern to track the resource
   * will wait for slot in the `rateLimit` to be free and run the function.
   *
   * It will not run the function and return with true under the following conditions
   * 1. The limit is reached.
   * 2. The queue is exausted and there are no pending connections.
   * 3. The function returned true indicating target was connected to
   */
  public async withNodeSignal(
    f: (
      nodeIdTarget: NodeId,
      nodeIdSignaller: NodeId | undefined,
    ) => Promise<boolean>,
    ctx: ContextCancellable,
  ): Promise<boolean> {
    return this.withNode<NodeId | undefined>(
      this.queueSignal,
      this.rateLimitSignal,
      this.nodesRunningSignal,
      f,
      ctx,
    );
  }

  public async withNodeDirect(
    f: (nodeIdTarget: NodeId, nodeIdSignaller: NodeContact) => Promise<boolean>,
    ctx: ContextCancellable,
  ): Promise<boolean> {
    return this.withNode<NodeContact>(
      this.queueDirect,
      this.rateLimitDirect,
      this.nodesRunningDirect,
      f,
      ctx,
    );
  }

  /**
   * Generic with node for shared code between direct and signal queues
   * @protected
   */
  protected async withNode<T>(
    queue: Array<[NodeId, T]>,
    rateLimit: Semaphore,
    nodesRunning: Set<Promise<void>>,
    f: (nodeIdTarget: NodeId, nodeIdSignaller: T) => Promise<boolean>,
    ctx: ContextCancellable,
  ): Promise<boolean> {
    // Checking if hit limit
    if (this.nodesContacted.size >= this.limit) {
      return true;
    }
    // If queue is empty then we need to wait for alternative sources
    await this.waitForQueue(queue, ctx);

    // If queue still empty then we've run out of nodes to contact
    if (queue.length === 0) {
      return true;
    }
    // Wait for a free concurrency slot
    const [rateLimitReleaser] = await rateLimit.lock()();
    if (this.connectionMade) {
      await rateLimitReleaser();
      return true;
    }
    const nextNode = queue.shift();
    // If queue exhausted or target found then end
    if (nextNode == null) {
      await rateLimitReleaser();
      return true;
    }
    const [nodeIdTarget, data] = nextNode;

    // Running the function
    const attempt = f(nodeIdTarget, data)
      .then(
        (result) => {
          if (result) this.connectionMade = true;
        },
        () => {},
      )
      .finally(async () => {
        // Release the rateLimiter lock
        await rateLimitReleaser();
        nodesRunning.delete(attempt);
      });
    nodesRunning.add(attempt);
    return false;
  }

  public contactedNode(nodeIdTarget: NodeId) {
    const nodeIdTargetString = nodeIdTarget.toString() as NodeIdString;
    this.nodesContacted.add(nodeIdTargetString);
    this.nodesFoundSignal.delete(nodeIdTargetString);
    this.nodesFoundDirect.delete(nodeIdTargetString);
  }

  /**
   * Resolves under the following conditions
   * 1. When the queue has an entry
   * 2. When all active and pending attempts have ended
   * 3. When the connection has been found
   */
  protected async waitForQueue(
    queue: Array<unknown>,
    ctx: ContextCancellable,
  ): Promise<void> {
    const abortP = utils.signalPromise(ctx.signal).catch(() => {});
    while (
      !this.connectionMade &&
      queue.length === 0 &&
      (this.nodesRunningSignal.size > 0 ||
        this.nodesRunningDirect.size > 0 ||
        this.queueSignal.length > 0 ||
        this.queueDirect.length > 0)
    ) {
      if (ctx.signal.aborted) return;
      if (this.nodesRunningSignal.size + this.nodesRunningDirect.size === 0) {
        // Yield to the event loop to allow queued attempts to start
        await utils.sleep(0);
        continue;
      }
      const runningPs: Array<Promise<void>> = [];
      for (const P of this.nodesRunningSignal) {
        runningPs.push(P);
      }
      for (const P of this.nodesRunningDirect) {
        runningPs.push(P);
      }
      await Promise.any([...runningPs, abortP]);
    }
  }
}

export default NodeConnectionQueue;
