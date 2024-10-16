import type { DB, DBTransaction } from '@matrixai/db';
import type { PromiseCancellable } from '@matrixai/async-cancellable';
import type { ContextTimed, ContextTimedInput } from '@matrixai/contexts';
import type { NodeId } from '../nodes/types';
import type NodeManager from '../nodes/NodeManager';
import type GestaltGraph from '../gestalts/GestaltGraph';
import type {
  GestaltId,
  GestaltIdEncoded,
  GestaltNodeInfo,
} from '../gestalts/types';
import type IdentitiesManager from '../identities/IdentitiesManager';
import type {
  IdentityData,
  IdentityId,
  IdentitySignedClaim,
  ProviderId,
  ProviderIdentityClaimId,
  ProviderIdentityId,
  ProviderPaginationToken,
} from '../identities/types';
import type KeyRing from '../keys/KeyRing';
import type { ClaimIdEncoded, SignedClaim } from '../claims/types';
import type TaskManager from '../tasks/TaskManager';
import type { Task, TaskHandler, TaskHandlerId } from '../tasks/types';
import type { ClaimLinkIdentity, ClaimLinkNode } from '../claims/payloads';
import type { DiscoveryQueueInfo } from './types';
import Logger from '@matrixai/logger';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import { context, timedCancellable } from '@matrixai/contexts/dist/decorators';
import * as discoveryErrors from './errors';
import * as discoveryEvents from './events';
import * as tasksErrors from '../tasks/errors';
import * as tasksUtils from '../tasks/utils';
import * as gestaltsUtils from '../gestalts/utils';
import * as nodesUtils from '../nodes/utils';
import * as keysUtils from '../keys/utils';
import { never } from '../utils';
import Token from '../tokens/Token';
import { decodeClaimId } from '../ids';

/**
 * This is the reason used to cancel duplicate tasks for vertices
 */
const abortSingletonTaskReason = Symbol('abort singleton task reason');
/**
 * This is the reason used to stop and re-schedule all discovery tasks
 * when stopping.
 */
const discoveryStoppingTaskReason = Symbol('discovery stopping task reason');
/**
 * This is the reason used to cancel all tasks
 * when cleaning up state during destroy or starting fresh
 */
const discoveryDestroyedTaskReason = Symbol('discovery destroyed task reason');

interface Discovery extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new discoveryErrors.ErrorDiscoveryRunning(),
  new discoveryErrors.ErrorDiscoveryDestroyed(),
  {
    eventStart: discoveryEvents.EventDiscoveryStart,
    eventStarted: discoveryEvents.EventDiscoveryStarted,
    eventStop: discoveryEvents.EventDiscoveryStop,
    eventStopped: discoveryEvents.EventDiscoveryStopped,
    eventDestroy: discoveryEvents.EventDiscoveryDestroy,
    eventDestroyed: discoveryEvents.EventDiscoveryDestroyed,
  },
)
class Discovery {
  static async createDiscovery({
    db,
    keyRing,
    gestaltGraph,
    identitiesManager,
    nodeManager,
    taskManager,
    discoverVertexTimeoutTime = 2000,
    rediscoverCheckIntervalTime = 60 * 60 * 1000, // 1 hour
    rediscoverVertexDelayTime = 60 * 60 * 1000, // 1 hour
    rediscoverSkipTime = 60 * 60 * 1000, // 1 hour
    staleVertexThresholdTime = 3 * 24 * 60 * 60 * 1000, // 3 days
    logger = new Logger(this.name),
    fresh = false,
  }: {
    db: DB;
    keyRing: KeyRing;
    gestaltGraph: GestaltGraph;
    identitiesManager: IdentitiesManager;
    nodeManager: NodeManager;
    taskManager: TaskManager;
    discoverVertexTimeoutTime?: number;
    rediscoverCheckIntervalTime?: number;
    rediscoverVertexDelayTime?: number;
    rediscoverSkipTime?: number;
    staleVertexThresholdTime?: number;
    logger?: Logger;
    fresh?: boolean;
  }): Promise<Discovery> {
    logger.info(`Creating ${this.name}`);
    const discovery = new this({
      db,
      keyRing,
      gestaltGraph,
      identitiesManager,
      nodeManager,
      taskManager,
      discoverVertexTimeoutTime,
      rediscoverCheckIntervalTime,
      rediscoverVertexDelayTime,
      rediscoverSkipTime,
      staleVertexThresholdTime,
      logger,
    });
    await discovery.start({ fresh });
    logger.info(`Created ${this.name}`);
    return discovery;
  }

  protected logger: Logger;
  protected db: DB;
  protected keyRing: KeyRing;
  protected gestaltGraph: GestaltGraph;
  protected identitiesManager: IdentitiesManager;
  protected nodeManager: NodeManager;
  protected taskManager: TaskManager;
  protected discoverVertexTimeoutTime: number;
  /**
   * Interval delay used when checking for nodes to rediscover
   */
  protected rediscoverCheckIntervalTime: number;
  /**
   * The threshold used when deciding to rediscover a vertex based on how long ago it was processed
   */
  protected rediscoverVertexThresholdTime: number;
  /**
   * The time since a vertex has been processed where re processing will be skipped
   */
  protected rediscoverSkipTime: number;
  /**
   * The time threshold for
   */
  protected staleVertexThresholdTime: number;

  protected discoverVertexHandler: TaskHandler = async (
    ctx,
    _taskInfo,
    vertex: GestaltIdEncoded,
    lastProcessedCutoffTime: number | null,
    parent: GestaltIdEncoded | null,
  ) => {
    try {
      await this.processVertex(
        vertex,
        lastProcessedCutoffTime ?? undefined,
        ctx,
      );
      this.dispatchEvent(
        new discoveryEvents.EventDiscoveryVertexProcessed({
          detail: {
            vertex,
            parent: parent ?? undefined,
          },
        }),
      );
    } catch (e) {
      // We need to reschedule if the task was cancelled due to discovery domain stopping
      if (e === discoveryStoppingTaskReason) {
        // We need to recreate the task for the vertex
        const vertexId = gestaltsUtils.decodeGestaltId(vertex);
        if (vertexId == null) {
          never(`failed to decode vertex GestaltId "${vertex}"`);
        }
        await this.scheduleDiscoveryForVertex(
          vertexId,
          undefined,
          undefined,
          gestaltsUtils.decodeGestaltId(parent ?? undefined),
          true,
        );
        return;
      }
      // Aborting a duplicate task is not an error
      if (e === abortSingletonTaskReason) return;
      // Destroying tasks is not an error
      if (e === discoveryDestroyedTaskReason) return;
      this.dispatchEvent(
        new discoveryEvents.EventDiscoveryVertexFailed({
          detail: {
            vertex,
            parent: parent ?? undefined,
            message: e.message,
            code: e.code,
          },
        }),
      );
      throw e;
    }
  };
  public readonly discoverVertexHandlerId =
    `${this.constructor.name}.discoverVertexHandler` as TaskHandlerId;

  /**
   * This handler is run periodically to check if nodes are ready to be rediscovered
   */
  protected checkRediscoveryHandler: TaskHandler = async () => {
    await this.checkRediscovery(
      Date.now() - this.rediscoverVertexThresholdTime,
    );
    await this.taskManager.scheduleTask({
      handlerId: this.discoverVertexHandlerId,
      path: [this.constructor.name, this.checkRediscoveryHandlerId],
      lazy: true,
      delay: this.rediscoverCheckIntervalTime,
    });
  };
  public readonly checkRediscoveryHandlerId =
    `${this.constructor.name}.checkForRediscoveryHandler` as TaskHandlerId;

  public constructor({
    keyRing,
    db,
    gestaltGraph,
    identitiesManager,
    nodeManager,
    taskManager,
    discoverVertexTimeoutTime,
    rediscoverCheckIntervalTime,
    rediscoverVertexDelayTime,
    rediscoverSkipTime,
    staleVertexThresholdTime,
    logger,
  }: {
    db: DB;
    keyRing: KeyRing;
    gestaltGraph: GestaltGraph;
    identitiesManager: IdentitiesManager;
    nodeManager: NodeManager;
    taskManager: TaskManager;
    discoverVertexTimeoutTime: number;
    rediscoverCheckIntervalTime: number;
    rediscoverVertexDelayTime: number;
    rediscoverSkipTime: number;
    staleVertexThresholdTime: number;
    logger: Logger;
  }) {
    this.db = db;
    this.keyRing = keyRing;
    this.gestaltGraph = gestaltGraph;
    this.identitiesManager = identitiesManager;
    this.nodeManager = nodeManager;
    this.taskManager = taskManager;
    this.discoverVertexTimeoutTime = discoverVertexTimeoutTime;
    this.rediscoverCheckIntervalTime = rediscoverCheckIntervalTime;
    this.rediscoverVertexThresholdTime = rediscoverVertexDelayTime;
    this.rediscoverSkipTime = rediscoverSkipTime;
    this.staleVertexThresholdTime = staleVertexThresholdTime;
    this.logger = logger;
  }

  public async start({
    fresh = false,
  }: {
    fresh?: boolean;
  } = {}): Promise<void> {
    this.logger.info(`Starting ${this.constructor.name}`);
    if (fresh) {
      // Cancel all tasks for discovery
      for await (const task of this.taskManager.getTasks('asc', true, [
        this.constructor.name,
      ])) {
        task.cancel(discoveryDestroyedTaskReason);
      }
    }
    this.taskManager.registerHandler(
      this.discoverVertexHandlerId,
      this.discoverVertexHandler,
    );
    this.taskManager.registerHandler(
      this.checkRediscoveryHandlerId,
      this.checkRediscoveryHandler,
    );
    // Start up rediscovery task
    await this.taskManager.scheduleTask({
      handlerId: this.discoverVertexHandlerId,
      path: [this.constructor.name, this.checkRediscoveryHandlerId],
      lazy: true,
      delay: this.rediscoverCheckIntervalTime,
    });
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop(): Promise<void> {
    this.logger.info(`Stopping ${this.constructor.name}`);
    // Stopping all tasks for discovery
    if (this.taskManager.isProcessing()) {
      throw new tasksErrors.ErrorTaskManagerProcessing();
    }
    const taskPromises: Array<Promise<any>> = [];
    for await (const task of this.taskManager.getTasks('asc', false, [
      this.constructor.name,
    ])) {
      if (task.status === 'active') {
        taskPromises.push(task.promise());
        task.cancel(discoveryStoppingTaskReason);
      }
    }
    await Promise.all(taskPromises);
    this.taskManager.deregisterHandler(this.discoverVertexHandlerId);
    this.taskManager.deregisterHandler(this.checkRediscoveryHandlerId);
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy(): Promise<void> {
    this.logger.info(`Destroying ${this.constructor.name}`);
    // Cancel all tasks for discovery
    for await (const task of this.taskManager.getTasks('asc', true, [
      this.constructor.name,
    ])) {
      task.cancel(discoveryDestroyedTaskReason);
    }
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  /**
   * Queues a node for discovery. Internally calls `pushKeyToDiscoveryQueue`.
   */
  @ready(new discoveryErrors.ErrorDiscoveryNotRunning())
  public async queueDiscoveryByNode(
    nodeId: NodeId,
    lastProcessedCutoffTime?: number,
  ): Promise<void> {
    await this.scheduleDiscoveryForVertex(
      ['node', nodeId],
      undefined,
      lastProcessedCutoffTime,
    );
  }

  /**
   * Queues an identity for discovery. Internally calls
   * `pushKeyToDiscoveryQueue`.
   */
  @ready(new discoveryErrors.ErrorDiscoveryNotRunning())
  public async queueDiscoveryByIdentity(
    providerId: ProviderId,
    identityId: IdentityId,
    lastProcessedCutoffTime?: number,
  ): Promise<void> {
    await this.scheduleDiscoveryForVertex(
      ['identity', [providerId, identityId]],
      undefined,
      lastProcessedCutoffTime,
    );
  }

  /**
   * This returns the discovery queue
   */
  @ready(new discoveryErrors.ErrorDiscoveryNotRunning())
  public async *getDiscoveryQueue(
    tran?: DBTransaction,
  ): AsyncGenerator<DiscoveryQueueInfo, void, void> {
    if (tran == null) {
      return yield* this.db.withTransactionG((tran) =>
        this.getDiscoveryQueue(tran),
      );
    }
    for await (const task of this.taskManager.getTasks(
      'asc',
      true,
      [this.constructor.name, this.discoverVertexHandlerId],
      tran,
    )) {
      yield {
        id: tasksUtils.encodeTaskId(task.id),
        status: task.status,
        parameters: task.parameters,
        delay: task.delay,
        deadline: task.deadline,
        priority: task.priority,
        created: task.created.getTime(),
        scheduled: task.scheduled.getTime(),
      };
    }
  }

  protected processVertex(
    vertex: GestaltIdEncoded,
    lastProcessedCutoffTime?: number,
    ctx?: Partial<ContextTimed>,
  ): PromiseCancellable<void>;
  @timedCancellable(true)
  protected async processVertex(
    vertex: GestaltIdEncoded,
    lastProcessedCutoffTime: number | undefined,
    @context ctx: ContextTimed,
  ): Promise<void> {
    this.logger.debug(`Processing vertex: ${vertex}`);
    const vertexId = gestaltsUtils.decodeGestaltId(vertex);
    if (vertexId == null) {
      never(`failed to decode vertex GestaltId "${vertex}"`);
    }
    const [type, id] = vertexId;
    switch (type) {
      case 'node':
        return await this.processNode(id, ctx, lastProcessedCutoffTime);
      case 'identity':
        return await this.processIdentity(id, ctx, lastProcessedCutoffTime);
      default:
        never(`type must be either "node" or "identity" got "${type}"`);
    }
  }

  protected async processNode(
    nodeId: NodeId,
    ctx: ContextTimed,
    lastProcessedCutoffTime?: number,
  ) {
    // If the vertex we've found is our own node, we simply get our own chain
    const processedTime = Date.now();
    const gestaltNodeId: GestaltId = ['node', nodeId];
    if (nodeId.equals(this.keyRing.getNodeId())) {
      // Skip our own nodeId, we actively add this information when it changes,
      // so there is no need to scan it.
      await this.gestaltGraph.setVertexProcessedTime(
        gestaltNodeId,
        processedTime,
      );
      return;
    }
    const newestClaimId = await this.gestaltGraph.getClaimIdNewest(nodeId);
    // The sigChain data of the vertex (containing all cryptolinks)
    let vertexChainData: Record<ClaimIdEncoded, SignedClaim> = {};
    try {
      vertexChainData = await this.nodeManager.requestChainData(
        nodeId,
        newestClaimId,
        ctx,
      );
    } catch (e) {
      await this.gestaltGraph.setVertexProcessedTime(
        gestaltNodeId,
        processedTime,
      );
      // Not strictly an error in this case, we can fail to connect
      this.logger.info(
        `Failed to discover ${nodesUtils.encodeNodeId(
          nodeId,
        )} - Reason: ${String(e)}`,
      );
      return;
    }
    // Iterate over each of the claims in the chain (already verified).
    for (const signedClaim of Object.values(vertexChainData)) {
      if (ctx.signal.aborted) throw ctx.signal.reason;
      switch (signedClaim.payload.typ) {
        case 'ClaimLinkNode':
          await this.processClaimLinkNode(
            signedClaim as SignedClaim<ClaimLinkNode>,
            nodeId,
            lastProcessedCutoffTime,
          );
          break;
        case 'ClaimLinkIdentity':
          await this.processClaimLinkIdentity(
            signedClaim as SignedClaim<ClaimLinkIdentity>,
            nodeId,
            ctx,
            lastProcessedCutoffTime,
          );
          break;
        default:
          never(
            `signedClaim.payload.typ must be "ClaimLinkNode" or "ClaimLinkIdentity" got "${signedClaim.payload.typ}"`,
          );
      }
    }
    await this.gestaltGraph.setVertexProcessedTime(
      gestaltNodeId,
      processedTime,
    );
  }

  protected async processClaimLinkNode(
    signedClaim: SignedClaim<ClaimLinkNode>,
    nodeId: NodeId,
    lastProcessedCutoffTime = Date.now() - this.rediscoverSkipTime,
  ): Promise<void> {
    // Get the chain data of the linked node
    // Could be node1 or node2 in the claim so get the one that's
    // not equal to nodeId from above
    const node1Id = nodesUtils.decodeNodeId(signedClaim.payload.iss);
    if (node1Id == null) {
      never(`failed to decode issuer NodeId "${signedClaim.payload.iss}"`);
    }
    const node2Id = nodesUtils.decodeNodeId(signedClaim.payload.sub);
    if (node2Id == null) {
      never(`failed to decode subject NodeId "${signedClaim.payload.sub}"`);
    }
    // Verify the claim
    const node1PublicKey = keysUtils.publicKeyFromNodeId(node1Id);
    const node2PublicKey = keysUtils.publicKeyFromNodeId(node2Id);
    const token = Token.fromSigned(signedClaim);
    if (
      !token.verifyWithPublicKey(node1PublicKey) ||
      !token.verifyWithPublicKey(node2PublicKey)
    ) {
      this.logger.warn(
        `Failed to verify node claim between ${signedClaim.payload.iss} and ${signedClaim.payload.sub}`,
      );
      return;
    }
    const linkedNodeId = node1Id.equals(nodeId) ? node2Id : node1Id;
    const linkedVertexNodeInfo: GestaltNodeInfo = {
      nodeId: linkedNodeId,
    };
    await this.gestaltGraph.linkNodeAndNode(
      {
        nodeId,
      },
      linkedVertexNodeInfo,
      {
        claim: signedClaim,
        meta: {},
      },
    );
    const claimId = decodeClaimId(signedClaim.payload.jti);
    if (claimId == null) {
      never(`failed to decode claimId "${signedClaim.payload.jti}"`);
    }
    await this.gestaltGraph.setClaimIdNewest(nodeId, claimId);
    // Add this vertex to the queue if it hasn't already been visited
    const linkedGestaltId: GestaltId = ['node', linkedNodeId];
    if (
      !(await this.processedTimeGreaterThan(
        linkedGestaltId,
        lastProcessedCutoffTime,
      ))
    ) {
      await this.scheduleDiscoveryForVertex(
        linkedGestaltId,
        undefined,
        lastProcessedCutoffTime,
        ['node', nodeId],
      );
    }
  }

  protected async processClaimLinkIdentity(
    signedClaim: SignedClaim<ClaimLinkIdentity>,
    nodeId: NodeId,
    ctx: ContextTimed,
    lastProcessedCutoffTime = Date.now() - this.rediscoverSkipTime,
  ): Promise<void> {
    // Checking the claim is valid
    const publicKey = keysUtils.publicKeyFromNodeId(nodeId);
    const token = Token.fromSigned(signedClaim);
    if (!token.verifyWithPublicKey(publicKey)) {
      this.logger.warn(
        `Failed to verify identity claim between ${nodesUtils.encodeNodeId(
          nodeId,
        )} and ${signedClaim.payload.sub}`,
      );
      return;
    }
    // Attempt to get the identity info on the identity provider
    if (signedClaim.payload.sub == null) {
      never('signedClaim.payload.sub must be defined');
    }
    const [providerId, identityId] = JSON.parse(signedClaim.payload.sub);
    const identityInfo = await this.getIdentityInfo(
      providerId,
      identityId,
      ctx,
    );
    // If we can't get identity info, simply skip this claim
    if (identityInfo == null) {
      this.logger.warn(
        `Failed to get identity info for ${providerId}:${identityId}`,
      );
      return;
    }
    // Need to get the corresponding claim on provider for this
    let providerIdentityClaimId = signedClaim.payload
      .providerIdentityClaimId as ProviderIdentityClaimId | null;
    // If we cannot get the corresponding claim directly, we will attempt to get it via iterating over the provider
    if (providerIdentityClaimId == null) {
      this.logger.warn(
        `Reverting to legacy identity claim discovery logic for ${providerId}:${identityId}`,
      );
      const verificationResult = await this.verifyIdentityClaims(
        providerId,
        identityId,
        undefined,
        ctx,
      );
      for (const [id, claim] of Object.entries(
        verificationResult.identityClaims,
      )) {
        const issuerNodeId = nodesUtils.decodeNodeId(claim.payload.iss);
        if (issuerNodeId == null) continue;
        if (nodeId.equals(issuerNodeId)) {
          providerIdentityClaimId = id as ProviderIdentityClaimId;
          break;
        }
      }
    }
    // If we cannot find the corresponding claim, skip it instead
    if (providerIdentityClaimId == null) {
      this.logger.warn(
        `Failed to get corresponding identity claim for ${providerId}:${identityId}`,
      );
      return;
    }
    // Link the node to the found identity info
    await this.gestaltGraph.linkNodeAndIdentity(
      {
        nodeId,
      },
      identityInfo,
      {
        claim: signedClaim,
        meta: {
          providerIdentityClaimId: providerIdentityClaimId,
          url: identityInfo.url,
        },
      },
    );
    const claimId = decodeClaimId(signedClaim.payload.jti);
    if (claimId == null) {
      never(`failed to decode ClaimId "${signedClaim.payload.jti}"`);
    }
    await this.gestaltGraph.setClaimIdNewest(nodeId, claimId);
    // Add this identity vertex to the queue if it is not present
    const providerIdentityId = JSON.parse(signedClaim.payload.sub!);
    const identityGestaltId: GestaltId = ['identity', providerIdentityId];
    if (
      !(await this.processedTimeGreaterThan(
        identityGestaltId,
        lastProcessedCutoffTime,
      ))
    ) {
      await this.scheduleDiscoveryForVertex(
        identityGestaltId,
        undefined,
        lastProcessedCutoffTime,
        ['node', nodeId],
      );
    }
  }

  protected async processIdentity(
    id: ProviderIdentityId,
    ctx: ContextTimed,
    lastProcessedCutoffTime = Date.now() - this.rediscoverSkipTime,
  ) {
    // If the next vertex is an identity, perform a social discovery
    // Firstly get the identity info of this identity
    const providerIdentityId = id;
    const [providerId, identityId] = id;
    const vertexIdentityInfo = await this.getIdentityInfo(
      providerId,
      identityId,
      ctx,
    );
    let lastProviderPaginationToken = await this.gestaltGraph
      .getIdentity(providerIdentityId)
      .then((identity) => identity?.lastProviderPaginationToken);
    // If we don't have identity info, simply skip this vertex
    if (vertexIdentityInfo == null) {
      return;
    }
    // Getting and verifying claims
    const {
      identityClaims,
      lastProviderPaginationToken: lastProviderPaginationToken_,
    } = await this.verifyIdentityClaims(
      providerId,
      identityId,
      lastProviderPaginationToken,
      ctx,
    );
    const isAborted = ctx.signal.aborted;
    lastProviderPaginationToken = lastProviderPaginationToken_;
    // Iterate over each of the claims, even if ctx has aborted
    for (const [claimId, claim] of Object.entries(identityClaims)) {
      // Claims on an identity provider will always be node -> identity
      // So just cast payload data as such
      const linkedNodeId = nodesUtils.decodeNodeId(claim.payload.iss);
      if (linkedNodeId == null) {
        never(`failed to decode issuer NodeId "${claim.payload.iss}"`);
      }
      // With this verified chain, we can link
      const linkedVertexNodeInfo = {
        nodeId: linkedNodeId,
      };
      await this.gestaltGraph.linkNodeAndIdentity(
        linkedVertexNodeInfo,
        {
          ...vertexIdentityInfo,
          lastProviderPaginationToken,
        },
        {
          claim: claim,
          meta: {
            providerIdentityClaimId: claimId as ProviderIdentityClaimId,
            url: vertexIdentityInfo.url,
          },
        },
      );
      // Check and schedule node for processing
      const gestaltNodeId: GestaltId = ['node', linkedNodeId];
      if (
        !(await this.processedTimeGreaterThan(
          gestaltNodeId,
          lastProcessedCutoffTime,
        ))
      ) {
        await this.scheduleDiscoveryForVertex(
          gestaltNodeId,
          undefined,
          lastProcessedCutoffTime,
          ['identity', providerIdentityId],
        );
      }
    }
    // Throw after we have processed the node claims if the signal aborted whilst running verifyIdentityClaims
    if (isAborted) {
      throw ctx.signal.reason;
    }
    // Only setVertexProcessedTime if we have succeeded in processing all identities
    await this.gestaltGraph.setVertexProcessedTime(
      ['identity', providerIdentityId],
      Date.now(),
    );
  }

  /**
   * Will resolve once all existing discovery tasks have finished.
   * Returns the number of existing tasks that were awaited.
   */
  public async waitForDiscoveryTasks(
    scheduled: boolean = false,
  ): Promise<number> {
    const promises: Array<Promise<any>> = [];
    for await (const task of this.taskManager.getTasks('asc', false, [
      this.constructor.name,
      this.discoverVertexHandlerId,
    ])) {
      // Only wait for tasks that are not scheduled for later
      if (scheduled || task.scheduled.getTime() < Date.now()) {
        promises.push(task.promise());
      }
    }
    await Promise.all(promises);
    return promises.length;
  }

  /**
   * Simple check for whether there are existing discovery tasks.
   * Returns the number of tasks to avoid boolean blindness.
   */
  protected async hasDiscoveryTasks(): Promise<number> {
    let count = 0;
    for await (const _ of this.taskManager.getTasks('asc', true, [
      this.constructor.name,
      this.discoverVertexHandlerId,
    ])) {
      count += 1;
    }
    return count;
  }

  /**
   * Creates a task that to discover a vertex.
   * Will not create a new task if an existing task for the vertex exists.
   *
   * The task can be scheduled with an optional delay.
   * If the task already exists then the delay will be updated
   */
  protected async scheduleDiscoveryForVertex(
    vertex: GestaltId,
    delay?: number,
    lastProcessedCutoffTime?: number,
    parent?: GestaltId,
    ignoreActive: boolean = false,
    tran?: DBTransaction,
  ) {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.scheduleDiscoveryForVertex(
          vertex,
          delay,
          lastProcessedCutoffTime,
          parent,
          ignoreActive,
          tran,
        ),
      );
    }
    const gestaltIdEncoded = gestaltsUtils.encodeGestaltId(vertex);
    // Locking on vertex to avoid duplicates
    await tran.lock(
      [
        this.constructor.name,
        this.discoverVertexHandlerId,
        gestaltIdEncoded,
      ].join(''),
    );
    // Check if task exists
    let taskExisting: Task | null = null;
    for await (const task of this.taskManager.getTasks(
      'asc',
      true,
      [this.constructor.name, this.discoverVertexHandlerId, gestaltIdEncoded],
      tran,
    )) {
      // Ignore active tasks
      if (ignoreActive && task.status === 'active') continue;
      if (taskExisting == null) {
        taskExisting = task;
        continue;
      }
      // Any extra tasks should be cancelled, this shouldn't normally happen
      task.cancel(abortSingletonTaskReason);
      this.dispatchEvent(
        new discoveryEvents.EventDiscoveryVertexCancelled({
          detail: {
            vertex: task.parameters[0] as GestaltIdEncoded,
            parent: task.parameters[2] as GestaltIdEncoded,
          },
        }),
      );
    }
    // Only create if it doesn't exist
    if (taskExisting != null) return;
    await this.taskManager.scheduleTask(
      {
        handlerId: this.discoverVertexHandlerId,
        parameters: [gestaltIdEncoded, lastProcessedCutoffTime],
        path: [
          this.constructor.name,
          this.discoverVertexHandlerId,
          gestaltIdEncoded,
        ],
        lazy: true,
        deadline: this.discoverVertexTimeoutTime,
        delay,
      },
      tran,
    );
    this.dispatchEvent(
      new discoveryEvents.EventDiscoveryVertexQueued({
        detail: {
          vertex: gestaltIdEncoded,
          parent:
            parent != null ? gestaltsUtils.encodeGestaltId(parent) : undefined,
        },
      }),
    );
  }

  /**
   * Helper function to retrieve the IdentityInfo of an identity on a provider.
   * All claims in the returned IdentityInfo are verified by the node it claims
   * to link to.
   * Returns undefined if no identity info to be retrieved (either no provider
   * or identity data found).
   */
  protected getIdentityInfo(
    providerId: ProviderId,
    identityId: IdentityId,
    ctx: Partial<ContextTimedInput>,
  ): Promise<IdentityData | undefined>;
  @timedCancellable(true, 20000)
  protected async getIdentityInfo(
    providerId: ProviderId,
    identityId: IdentityId,
    @context ctx: ContextTimed,
  ): Promise<IdentityData | undefined> {
    const provider = this.identitiesManager.getProvider(providerId);
    // If we don't have this provider, no identity info to find
    if (provider == null) {
      return undefined;
    }
    // Get our own auth identity id
    const authIdentityIds = await provider.getAuthIdentityIds();
    // If we don't have one then we can't request data so just skip
    if (authIdentityIds.length === 0 || authIdentityIds[0] == null) {
      return undefined;
    }
    const authIdentityId = authIdentityIds[0];
    // Return the identity data
    return await provider.getIdentityData(authIdentityId, identityId, {
      signal: ctx.signal,
    });
  }

  /**
   * Helper function to retrieve and verify the claims of an identity on a given
   * provider. Connects with each node the identity claims to be linked with,
   * and verifies the claim with the public key of the node.
   *
   * This method never throws if ctx has aborted, opting instead to return early
   * with a lastProviderPaginationToken so that the caller can process the partially
   * requested Claims as well as resume progress when calling again.
   */
  protected async verifyIdentityClaims(
    providerId: ProviderId,
    identityId: IdentityId,
    providerPaginationToken: ProviderPaginationToken | undefined,
    ctx: ContextTimed,
  ): Promise<{
    identityClaims: Record<
      ProviderIdentityClaimId,
      SignedClaim<ClaimLinkIdentity>
    >;
    lastProviderPaginationToken?: ProviderPaginationToken;
  }> {
    const provider = this.identitiesManager.getProvider(providerId);
    // If we don't have this provider, no identity info to find
    if (provider == null) {
      return { identityClaims: {} };
    }
    // Get our own auth identity id
    const authIdentityIds = await provider.getAuthIdentityIds();
    // If we don't have one then we can't request data so just skip
    if (authIdentityIds.length === 0 || authIdentityIds[0] == null) {
      return { identityClaims: {} };
    }
    const authIdentityId = authIdentityIds[0];
    const identityClaims: Record<
      ProviderIdentityClaimId,
      SignedClaim<ClaimLinkIdentity>
    > = {};

    const identitySignedClaimDb = (
      identitySignedClaim: IdentitySignedClaim,
    ) => {
      const claim = identitySignedClaim.claim;
      const data = claim.payload;
      // Verify the claim with the public key of the node
      const nodeId = nodesUtils.decodeNodeId(data.iss);
      if (nodeId == null) never(`failed to decode issuer NodeId "${data.iss}"`);
      const publicKey = keysUtils.publicKeyFromNodeId(nodeId);
      const token = Token.fromSigned(claim);
      // If verified, add to the record
      if (token.verifyWithPublicKey(publicKey)) {
        identityClaims[identitySignedClaim.id] = claim;
      }
    };

    let nextPaginationToken: ProviderPaginationToken | undefined =
      providerPaginationToken;
    while (true) {
      let discoveredPaginationToken: ProviderPaginationToken | undefined;
      ctx.timer.refresh();
      if (provider.preferGetClaimsPage) {
        const iterator = provider.getClaimsPage(
          authIdentityId,
          identityId,
          nextPaginationToken,
        );
        for await (const wrapper of iterator) {
          // This will:
          // 1. throw if the getClaimIdsPage takes too much time
          // 2. the rest of this loop iteration takes too much time
          if (ctx.signal.aborted) {
            return {
              identityClaims: identityClaims,
              lastProviderPaginationToken: nextPaginationToken,
            };
          }
          if (wrapper.nextPaginationToken != null) {
            discoveredPaginationToken = wrapper.nextPaginationToken;
          }
          // Claims on an identity provider will always be node -> identity
          identitySignedClaimDb(wrapper.claim);
        }
      } else {
        const iterator = provider.getClaimIdsPage(
          authIdentityId,
          identityId,
          nextPaginationToken,
        );
        for await (const wrapper of iterator) {
          // This will:
          // 1. throw if the getClaimIdsPage takes too much time
          // 2. the rest of this loop iteration takes too much time
          if (ctx.signal.aborted) {
            return {
              identityClaims: identityClaims,
              lastProviderPaginationToken: nextPaginationToken,
            };
          }
          const claimId = wrapper.claimId;
          if (wrapper.nextPaginationToken != null) {
            discoveredPaginationToken = wrapper.nextPaginationToken;
          }
          // Refresh timer in preparation for request
          ctx.timer.refresh();
          const identitySignedClaim = await provider.getClaim(
            authIdentityId,
            claimId,
          );
          if (identitySignedClaim == null) {
            continue;
          }
          // Claims on an identity provider will always be node -> identity
          identitySignedClaimDb(identitySignedClaim);
        }
      }
      // If there are no claims on the current page, or the next pagination token is null, we have finished.
      if (discoveredPaginationToken == null) {
        break;
      }
      nextPaginationToken = discoveredPaginationToken;
    }
    return {
      identityClaims,
    };
  }

  /**
   * Checks previously discovered vertices for ones to be re-added back on to the queue
   */
  public async checkRediscovery(
    lastProcessedCutoffTime: number,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.checkRediscovery(lastProcessedCutoffTime, tran),
      );
    }

    this.dispatchEvent(new discoveryEvents.EventDiscoveryCheckRediscovery());

    const staleVertexCutoff = Date.now() - this.staleVertexThresholdTime;
    const gestaltIds: Array<[GestaltIdEncoded, number]> = [];
    for await (const [
      gestaltId,
      lastProcessedTime,
    ] of this.gestaltGraph.getVertexProcessedTimes(
      {
        order: 'asc',
        seek: lastProcessedCutoffTime,
      },
      tran,
    )) {
      gestaltIds.push([
        gestaltsUtils.encodeGestaltId(gestaltId),
        lastProcessedTime,
      ]);
    }
    // We want to lock all the ids at once before moving ahead
    const locks = gestaltIds.map((gestaltIdEncoded) => {
      return [
        this.constructor.name,
        this.discoverVertexHandlerId,
        gestaltIdEncoded,
      ].join('');
    });
    await tran.lock(...locks);
    // Schedule a new task for each vertex if it doesn't already exist
    for (const [gestaltIdEncoded, lastProcessedTime] of gestaltIds) {
      // If we exceed an age threshold then we just remove the vertex information
      if (lastProcessedTime < staleVertexCutoff) {
        await this.gestaltGraph.unsetVertexProcessedTime(
          gestaltsUtils.decodeGestaltId(gestaltIdEncoded)!,
        );
        this.dispatchEvent(
          new discoveryEvents.EventDiscoveryVertexCulled({
            detail: {
              vertex: gestaltIdEncoded,
            },
          }),
        );
      }
      let taskExisting: Task | null = null;
      for await (const task of this.taskManager.getTasks(
        'asc',
        true,
        [this.constructor.name, this.discoverVertexHandlerId, gestaltIdEncoded],
        tran,
      )) {
        if (taskExisting == null) {
          taskExisting = task;
          continue;
        }
        // Any extra tasks should be cancelled, this shouldn't normally happen
        task.cancel(abortSingletonTaskReason);
      }
      if (taskExisting != null) continue;
      // Schedule a new task
      await this.taskManager.scheduleTask(
        {
          handlerId: this.discoverVertexHandlerId,
          parameters: [gestaltIdEncoded, lastProcessedCutoffTime],
          path: [
            this.constructor.name,
            this.discoverVertexHandlerId,
            gestaltIdEncoded,
          ],
          lazy: true,
          deadline: this.discoverVertexTimeoutTime,
        },
        tran,
      );
    }
  }

  /**
   * Returns true if the vertex was processed after the given time
   */
  protected async processedTimeGreaterThan(
    vertex: GestaltId,
    time: number,
    tran?: DBTransaction,
  ): Promise<boolean> {
    const lastProcessedTime =
      (await this.gestaltGraph.getVertexProcessedTime(vertex, tran)) ?? 0;
    return lastProcessedTime > time;
  }
}

export default Discovery;
