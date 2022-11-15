import type { DB, DBTransaction } from '@matrixai/db';
import type { PromiseCancellable } from '@matrixai/async-cancellable';
import type { NodeId } from '../nodes/types';
import type NodeManager from '../nodes/NodeManager';
import type GestaltGraph from '../gestalts/GestaltGraph';
import type { GestaltId, GestaltNodeInfo, GestaltIdEncoded } from '../gestalts/types';
import type IdentitiesManager from '../identities/IdentitiesManager';
import type {
  IdentityData,
  IdentityId,
  ProviderId,
  ProviderIdentityClaimId,
  ProviderIdentityId,
} from '../identities/types';
import type KeyRing from '../keys/KeyRing';
import type { ClaimId, ClaimIdEncoded, SignedClaim } from '../claims/types';
import type TaskManager from '../tasks/TaskManager';
import type { ContextTimed } from '../contexts/types';
import type { TaskHandler, TaskHandlerId } from '../tasks/types';
import Logger from '@matrixai/logger';
import { CreateDestroyStartStop, ready } from '@matrixai/async-init/dist/CreateDestroyStartStop';
import { Timer } from '@matrixai/timer';
import * as discoveryErrors from './errors';
import * as tasksErrors from '../tasks/errors';
import * as gestaltsUtils from '../gestalts/utils';
import * as nodesUtils from '../nodes/utils';
import * as keysUtils from '../keys/utils';
import { never } from '../utils';
import { context } from '../contexts/index';
import TimedCancellable from '../contexts/decorators/timedCancellable';
import { ClaimLinkIdentity, ClaimLinkNode } from '../claims/payloads/index';
import Token from '../tokens/Token';
import { decodeClaimId } from '../ids/index';
import { utils as idUtils } from '@matrixai/id';

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
)
class Discovery {
  static async createDiscovery({
    db,
    keyRing,
    gestaltGraph,
    identitiesManager,
    nodeManager,
    taskManager,
    logger = new Logger(this.name),
    fresh = false,
  }: {
    db: DB;
    keyRing: KeyRing;
    gestaltGraph: GestaltGraph;
    identitiesManager: IdentitiesManager;
    nodeManager: NodeManager;
    taskManager: TaskManager;
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

  protected visitedVertices = new Set<GestaltIdEncoded>();
  protected discoverVertexHandler: TaskHandler = async (
    ctx,
    _taskInfo,
    vertex: GestaltIdEncoded,
  ) => {
    try {
      await this.processVertex(vertex, 2000, ctx);
    } catch (e) {
      if (
        e instanceof tasksErrors.ErrorTaskStop ||
        e === discoveryStoppingTaskReason
      ) {
        // We need to recreate the task for the vertex
        await this.scheduleDiscoveryForVertex(gestaltsUtils.decodeGestaltId(vertex)!);
        return;
      }
      // Aborting a duplicate task is not an error
      if (e === abortSingletonTaskReason) return;
      // Destroying tasks is not an error
      if (e === discoveryDestroyedTaskReason) return;
      throw e;
    }
  };
  public readonly discoverVertexHandlerId =
    `${this.constructor.name}.${this.discoverVertexHandler.name}.discoverVertexHandlerId` as TaskHandlerId;

  public constructor({
    keyRing,
    db,
    gestaltGraph,
    identitiesManager,
    nodeManager,
    taskManager,
    logger,
  }: {
    db: DB;
    keyRing: KeyRing;
    gestaltGraph: GestaltGraph;
    identitiesManager: IdentitiesManager;
    nodeManager: NodeManager;
    taskManager: TaskManager;
    logger: Logger;
  }) {
    this.db = db;
    this.keyRing = keyRing;
    this.gestaltGraph = gestaltGraph;
    this.identitiesManager = identitiesManager;
    this.nodeManager = nodeManager;
    this.taskManager = taskManager;
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
  public async queueDiscoveryByNode(nodeId: NodeId): Promise<void> {
    await this.scheduleDiscoveryForVertex(['node', nodeId]);
  }

  /**
   * Queues an identity for discovery. Internally calls
   * `pushKeyToDiscoveryQueue`.
   */
  @ready(new discoveryErrors.ErrorDiscoveryNotRunning())
  public async queueDiscoveryByIdentity(
    providerId: ProviderId,
    identityId: IdentityId,
  ): Promise<void> {
    await this.scheduleDiscoveryForVertex(['identity', [providerId, identityId]]);
  }

  // Fixme, when processing a vertex, we need to check existing links in the
  //  GestaltGraph and ask for claims newer than that
  protected processVertex(
    vertex: GestaltIdEncoded,
    connectionTimeout?: number,
    ctx?: Partial<ContextTimed>,
  ): PromiseCancellable<void>;
  @TimedCancellable(true)
  protected async processVertex(
    vertex: GestaltIdEncoded,
    connectionTimeout: number | undefined,
    @context ctx: ContextTimed,
  ): Promise<void> {
    this.logger.debug(`Processing vertex: ${vertex}`);
    const [type, id] = gestaltsUtils.decodeGestaltId(vertex)!;
    switch (type) {
      case 'node':
        return await this.processNode(id, connectionTimeout, ctx);
      case 'identity':
        return await this.processIdentity(id, connectionTimeout, ctx);
      default:
        never();
    }
    this.visitedVertices.add(vertex);
  }

  protected async processNode(id: NodeId, connectionTimeout: number | undefined, ctx: ContextTimed) {

    // If the vertex we've found is our own node, we simply get our own chain
    const nodeId = nodesUtils.decodeNodeId(id)!;
    const encodedGestaltNodeId = gestaltsUtils.encodeGestaltNodeId(['node', nodeId])
    if (nodeId.equals(this.keyRing.getNodeId())) {
      // Skip our own nodeId, we actively add this information when it changes,
      // so there is no need to scan it.
      this.visitedVertices.add(encodedGestaltNodeId);
      return;
    }
    // Get the oldest known claim for this node
    const gestaltLinks = await this.gestaltGraph.getLinks(['node', nodeId]);
    // get the oldest one
    let newestClaimId: ClaimId | undefined = undefined;
    for (let [,gestaltLink] of gestaltLinks) {
      const claimIdEncoded = gestaltLink[1].claim.payload.jti;
      const claimId = decodeClaimId(claimIdEncoded)!;
      if (newestClaimId == null) newestClaimId = claimId
      else if (Buffer.compare(newestClaimId, claimId) == -1) {
        newestClaimId = claimId;
      }
    }

    // The sigChain data of the vertex (containing all cryptolinks)
    let vertexChainData: Record<ClaimIdEncoded, SignedClaim> = {};
    try {
      vertexChainData = await this.nodeManager.requestChainData(
        nodeId,
        connectionTimeout,
        newestClaimId,
        ctx,
      );
    } catch (e) {
      this.visitedVertices.add(encodedGestaltNodeId);
      this.logger.error(
        `Failed to discover ${id} - ${e.toString()}`,
      );
      return;
    }
    // TODO: for now, the chain data is treated as a 'disjoint' set of
    //  cryptolink claims from a node to another node/identity.
    //  That is, we have no notion of revocations, or multiple claims to
    //  the same node/identity. Thus, we simply iterate over this chain
    //  of cryptolinks.
    // Now have the NodeInfo of this vertex
    const vertexNodeInfo: GestaltNodeInfo = {
      nodeId: nodeId,
    };
    // Iterate over each of the claims in the chain (already verified).
    // TODO: there is no deterministic iteration order of keys in a record.
    //  When we change to iterating over ordered sigchain claims,
    //  this must change into array iteration.
    for (const signedClaim of Object.values(vertexChainData)) {
      if (ctx.signal.aborted) throw ctx.signal.reason;
      switch (signedClaim.payload.typ) {
        case 'node': {
          // Get the chain data of the linked node
          // Could be node1 or node2 in the claim so get the one that's
          // not equal to nodeId from above
          const node1Id = nodesUtils.decodeNodeId(
            signedClaim.payload.iss,
          )!;
          const node2Id = nodesUtils.decodeNodeId(
            signedClaim.payload.sub,
          )!;
          // Verify the claim
          const node1PublicKey = keysUtils.publicKeyFromNodeId(node1Id);
          const node2PublicKey = keysUtils.publicKeyFromNodeId(node2Id);
          const token = Token.fromSigned(signedClaim);
          if (
            !token.verifyWithPublicKey(node1PublicKey) ||
            !token.verifyWithPublicKey(node2PublicKey)
          ) {
            this.logger.warn(`Failed to verify node claim between ${signedClaim.payload.iss} and ${signedClaim.payload.sub}`);
            continue;
          }
          const linkedVertexNodeId = node1Id.equals(nodeId)
            ? node2Id
            : node1Id;
          const linkedVertexNodeInfo: GestaltNodeInfo = {
            nodeId: linkedVertexNodeId,
          };
          await this.gestaltGraph.linkNodeAndNode(
            vertexNodeInfo,
            linkedVertexNodeInfo,
            {
              claim: signedClaim as SignedClaim<ClaimLinkNode>,
              meta: {},
            }
          );
          // Add this vertex to the queue if it hasn't already been visited
          if (!this.visitedVertices.has(gestaltsUtils.encodeGestaltNodeId(['node', linkedVertexNodeId]))) {
            await this.scheduleDiscoveryForVertex(['node', linkedVertexNodeId]);
          }
        }
        break;
        case 'identity': {
          // Checking the claim is valid
          const publicKey = keysUtils.publicKeyFromNodeId(nodeId);
          const token = Token.fromSigned(signedClaim);
          if (!token.verifyWithPublicKey(publicKey)) {
            this.logger.warn(`Failed to verify identity claim between ${nodesUtils.encodeNodeId(nodeId)} and ${signedClaim.payload.sub}`);
            continue;
          }
          // Attempt to get the identity info on the identity provider
          const timer =
            connectionTimeout != null
              ? new Timer({ delay: connectionTimeout })
              : undefined;
          const [providerId, identityId] = JSON.parse(signedClaim.payload.sub!);
          const identityInfo = await this.getIdentityInfo(
            providerId,
            identityId,
            { signal: ctx.signal, timer },
          );
          // If we can't get identity info, simply skip this claim
          if (identityInfo == null) {
            this.logger.warn(`Failed to get identity info for ${providerId}:${identityId}`);
            continue;
          }
          // Need to get the corresponding claim for this
          let providerIdentityClaimId: ProviderIdentityClaimId | null = null;
          const identityClaims = await this.verifyIdentityClaims(providerId, identityId)
          for (const [id, claim] of Object.entries(identityClaims)) {
            const issuerNodeId = nodesUtils.decodeNodeId(claim.payload.iss);
            if (issuerNodeId == null) continue;
            if (nodeId.equals(issuerNodeId)){
              providerIdentityClaimId = id as ProviderIdentityClaimId;
              break;
            }
          }
          if (providerIdentityClaimId == null) {
            this.logger.warn(`Failed to get corresponding identity claim for ${providerId}:${identityId}`);
            continue;
          }
          // Link the node to the found identity info
          await this.gestaltGraph.linkNodeAndIdentity(
            vertexNodeInfo,
            identityInfo,
            {
              claim : signedClaim as SignedClaim<ClaimLinkIdentity>,
              meta: {
                providerIdentityClaimId: providerIdentityClaimId,
                url: identityInfo.url
              },
            }
          );
          // Add this identity vertex to the queue if it is not present
          const providerIdentityId = JSON.parse(signedClaim.payload.sub!);
          if (!this.visitedVertices.has(gestaltsUtils.encodeGestaltIdentityId(['identity', providerIdentityId]))) {
            await this.scheduleDiscoveryForVertex(['identity', providerIdentityId]);
          }
        }
        break;
        default:
          never();
      }
    }
    this.visitedVertices.add(encodedGestaltNodeId);
  }

  protected async processIdentity(id: ProviderIdentityId, connectionTimeout: number | undefined, ctx: ContextTimed) {
    // If the next vertex is an identity, perform a social discovery
    // Firstly get the identity info of this identity
    const providerIdentityId = id;
    const [providerId, identityId] = id;
    const timer =
      connectionTimeout != null
        ? new Timer({ delay: connectionTimeout })
        : undefined;
    const vertexIdentityInfo = await this.getIdentityInfo(
      providerId,
      identityId,
      { signal: ctx.signal, timer },
    );
    // If we don't have identity info, simply skip this vertex
    if (vertexIdentityInfo == null) {
      return;
    }
    // Getting and verifying claims
    const claims = await this.verifyIdentityClaims(providerId, identityId);
    // Link the identity with each node from its claims on the provider
    // Iterate over each of the claims
    for (const [claimId, claim] of Object.entries(claims)) {
      if (ctx.signal.aborted) throw ctx.signal.reason;
      // Claims on an identity provider will always be node -> identity
      // So just cast payload data as such
      const linkedVertexNodeId = nodesUtils.decodeNodeId(claim.payload.node)!;
      // With this verified chain, we can link
      const linkedVertexNodeInfo = {
        nodeId: linkedVertexNodeId,
      };
      await this.gestaltGraph.linkNodeAndIdentity(
        linkedVertexNodeInfo,
        vertexIdentityInfo,
        {
          claim: claim,
          meta: {
            providerIdentityClaimId: claimId as ProviderIdentityClaimId,
            url: vertexIdentityInfo.url,
          }
        }
      );
      // Add this vertex to the queue if it is not present
      if (!this.visitedVertices.has(gestaltsUtils.encodeGestaltIdentityId(['identity', providerIdentityId]))) {
        await this.scheduleDiscoveryForVertex(['identity', providerIdentityId]);
      }
    }
    this.visitedVertices.add(gestaltsUtils.encodeGestaltIdentityId(['identity', providerIdentityId]));
  }

  /**
   * Will resolve once all existing discovery tasks have finished.
   * Returns the number of existing tasks that were awaited.
   */
  public async waitForDiscoveryTasks(): Promise<number> {
    const promises: Array<Promise<any>> = [];
    for await (const task of this.taskManager.getTasks('asc', false, [
      this.constructor.name,
      this.discoverVertexHandlerId,
    ])) {
      promises.push(task.promise());
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
   */
  protected async scheduleDiscoveryForVertex(
    vertex: GestaltId,
    tran?: DBTransaction,
  ) {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.scheduleDiscoveryForVertex(vertex, tran),
      );
    }
    const gestaltIdEncoded = gestaltsUtils.encodeGestaltId(vertex);
    // Locking on vertex to avoid duplicates
    await tran.lock(
      [this.constructor.name, this.discoverVertexHandlerId, gestaltIdEncoded].join(''),
    );
    // Check if task exists
    let taskExists = false;
    for await (const task of this.taskManager.getTasks(
      'asc',
      true,
      [this.constructor.name, this.discoverVertexHandlerId, gestaltIdEncoded],
      tran,
    )) {
      if (!taskExists) {
        taskExists = true;
        continue;
      }
      // Any extra tasks should be cancelled, this shouldn't normally happen
      task.cancel(abortSingletonTaskReason);
    }
    // Create a new task if none exists
    await this.taskManager.scheduleTask(
      {
        handlerId: this.discoverVertexHandlerId,
        parameters: [gestaltIdEncoded],
        path: [this.constructor.name, this.discoverVertexHandlerId, gestaltIdEncoded],
        lazy: true,
      },
      tran,
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
    ctx: Partial<ContextTimed>,
  ): Promise<IdentityData | undefined>;
  @TimedCancellable(true, 20000)
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
    return await provider.getIdentityData(
      authIdentityId,
      identityId,
      { signal: ctx.signal },
    );
  }

  /**
   * Helper function to retrieve and verify the claims of an identity on a given
   * provider. Connects with each node the identity claims to be linked with,
   * and verifies the claim with the public key of the node.
   */
  protected async verifyIdentityClaims(
    providerId: ProviderId,
    identityId: IdentityId,
  ): Promise<Record<ProviderIdentityClaimId, SignedClaim<ClaimLinkIdentity>>> {
    const provider = this.identitiesManager.getProvider(providerId);
    // If we don't have this provider, no identity info to find
    if (provider == null) {
      return {};
    }
    // Get our own auth identity id
    const authIdentityIds = await provider.getAuthIdentityIds();
    // If we don't have one then we can't request data so just skip
    if (authIdentityIds.length === 0 || authIdentityIds[0] == null) {
      return {};
    }
    const authIdentityId = authIdentityIds[0];
    const identityClaims: Record<ProviderIdentityClaimId, SignedClaim<ClaimLinkIdentity>> = {};
    for await (const identitySignedClaim of provider.getClaims(authIdentityId, identityId)) {
      identitySignedClaim.claim
      // Claims on an identity provider will always be node -> identity
      const claim = identitySignedClaim.claim;
      const data = claim.payload;
      // Verify the claim with the public key of the node
      const publicKey = keysUtils.publicKeyFromNodeId(nodesUtils.decodeNodeId(data.node)!);
      const token = Token.fromSigned(claim);
      // If verified, add to the record
      if (token.verifyWithPublicKey(publicKey)) {
        identityClaims[identitySignedClaim.id] = claim;
      }
    }
    return identityClaims;
  }
}

export default Discovery;
