import type { DB, DBTransaction } from '@matrixai/db';
import type { PromiseCancellable } from '@matrixai/async-cancellable';
import type { NodeId, NodeInfo } from '../nodes/types';
import type NodeManager from '../nodes/NodeManager';
import type GestaltGraph from '../gestalts/GestaltGraph';
import type { GestaltKey } from '../gestalts/types';
import type Provider from '../identities/Provider';
import type IdentitiesManager from '../identities/IdentitiesManager';
import type {
  IdentityInfo,
  ProviderId,
  IdentityId,
  IdentityClaimId,
  IdentityClaims,
} from '../identities/types';
import type Sigchain from '../sigchain/Sigchain';
import type KeyManager from '../keys/KeyManager';
import type { ClaimIdEncoded, Claim, ClaimLinkIdentity } from '../claims/types';
import type { ChainData } from '../sigchain/types';
import type TaskManager from '../tasks/TaskManager';
import type { ContextTimed } from '../contexts/types';
import type { TaskHandler, TaskHandlerId } from '../tasks/types';
import Logger from '@matrixai/logger';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import * as discoveryErrors from './errors';
import * as tasksErrors from '../tasks/errors';
import * as nodesErrors from '../nodes/errors';
import * as networkErrors from '../network/errors';
import * as gestaltsUtils from '../gestalts/utils';
import * as claimsUtils from '../claims/utils';
import * as nodesUtils from '../nodes/utils';
import { never } from '../utils';
import { context } from '../contexts/index';
import TimedCancellable from '../contexts/decorators/timedCancellable';

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
    keyManager,
    gestaltGraph,
    identitiesManager,
    nodeManager,
    sigchain,
    taskManager,
    logger = new Logger(this.name),
    fresh = false,
  }: {
    db: DB;
    keyManager: KeyManager;
    gestaltGraph: GestaltGraph;
    identitiesManager: IdentitiesManager;
    nodeManager: NodeManager;
    sigchain: Sigchain;
    taskManager: TaskManager;
    logger?: Logger;
    fresh?: boolean;
  }): Promise<Discovery> {
    logger.info(`Creating ${this.name}`);
    const discovery = new this({
      db,
      keyManager,
      gestaltGraph,
      identitiesManager,
      nodeManager,
      sigchain,
      taskManager,
      logger,
    });
    await discovery.start({ fresh });
    logger.info(`Created ${this.name}`);
    return discovery;
  }

  protected logger: Logger;
  protected db: DB;
  protected sigchain: Sigchain;
  protected keyManager: KeyManager;
  protected gestaltGraph: GestaltGraph;
  protected identitiesManager: IdentitiesManager;
  protected nodeManager: NodeManager;
  protected taskManager: TaskManager;

  protected visitedVertices = new Set<GestaltKey>();
  protected discoverVertexHandler: TaskHandler = async (
    ctx,
    _taskInfo,
    vertex: GestaltKey,
  ) => {
    try {
      await this.processVertex(vertex, ctx);
    } catch (e) {
      if (
        e instanceof tasksErrors.ErrorTaskStop ||
        e === discoveryStoppingTaskReason
      ) {
        // We need to recreate the task for the vertex
        await this.scheduleDiscoveryForVertex(vertex);
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
    keyManager,
    db,
    gestaltGraph,
    identitiesManager,
    nodeManager,
    sigchain,
    taskManager,
    logger,
  }: {
    db: DB;
    keyManager: KeyManager;
    gestaltGraph: GestaltGraph;
    identitiesManager: IdentitiesManager;
    nodeManager: NodeManager;
    sigchain: Sigchain;
    taskManager: TaskManager;
    logger: Logger;
  }) {
    this.db = db;
    this.keyManager = keyManager;
    this.gestaltGraph = gestaltGraph;
    this.identitiesManager = identitiesManager;
    this.nodeManager = nodeManager;
    this.sigchain = sigchain;
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
    const nodeKey = gestaltsUtils.keyFromNode(nodeId);
    await this.scheduleDiscoveryForVertex(nodeKey);
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
    const identityKey = gestaltsUtils.keyFromIdentity(providerId, identityId);
    await this.scheduleDiscoveryForVertex(identityKey);
  }

  protected processVertex(
    vertex: GestaltKey,
    ctx?: ContextTimed,
  ): PromiseCancellable<void>;
  @TimedCancellable(true, 20000)
  protected async processVertex(
    vertex: GestaltKey,
    @context ctx: ContextTimed,
  ): Promise<void> {
    this.logger.debug(`Processing vertex: ${vertex}`);
    const vertexGId = gestaltsUtils.ungestaltKey(vertex);
    switch (vertexGId.type) {
      case 'node':
        {
          // The sigChain data of the vertex (containing all cryptolinks)
          let vertexChainData: ChainData = {};
          // If the vertex we've found is our own node, we simply get our own chain
          const nodeId = nodesUtils.decodeNodeId(vertexGId.nodeId)!;
          if (nodeId.equals(this.keyManager.getNodeId())) {
            const vertexChainDataEncoded = await this.sigchain.getChainData();
            // Decode all our claims - no need to verify (on our own sigChain)
            for (const c in vertexChainDataEncoded) {
              const claimId = c as ClaimIdEncoded;
              vertexChainData[claimId] = claimsUtils.decodeClaim(
                vertexChainDataEncoded[claimId],
              );
            }
            // Otherwise, request the verified chain data from the node
          } else {
            try {
              vertexChainData = await this.nodeManager.requestChainData(nodeId);
            } catch (e) {
              this.visitedVertices.add(vertex);
              this.logger.error(
                `Failed to discover ${vertexGId.nodeId} - ${e.toString()}`,
              );
              return;
            }
          }
          // TODO: for now, the chain data is treated as a 'disjoint' set of
          //  cryptolink claims from a node to another node/identity
          //  That is, we have no notion of revocations, or multiple claims to
          //  the same node/identity. Thus, we simply iterate over this chain
          //  of cryptolinks.
          // Now have the NodeInfo of this vertex
          const vertexNodeInfo: NodeInfo = {
            id: nodesUtils.encodeNodeId(nodeId),
            chain: vertexChainData,
          };
          // Iterate over each of the claims in the chain (already verified)
          // TODO: because we're iterating over keys in a record, I don't believe
          //  that this will iterate in lexicographical order of keys. For now,
          //  this doesn't matter though (because of the previous comment).
          for (const claimId in vertexChainData) {
            if (ctx.signal.aborted) throw ctx.signal.reason;
            const claim: Claim = vertexChainData[claimId as ClaimIdEncoded];
            // If the claim is to a node
            if (claim.payload.data.type === 'node') {
              // Get the chain data of the linked node
              // Could be node1 or node2 in the claim so get the one that's
              // not equal to nodeId from above
              const node1Id = nodesUtils.decodeNodeId(
                claim.payload.data.node1,
              )!;
              const node2Id = nodesUtils.decodeNodeId(
                claim.payload.data.node2,
              )!;
              const linkedVertexNodeId = node1Id.equals(nodeId)
                ? node2Id
                : node1Id;
              const linkedVertexGK =
                gestaltsUtils.keyFromNode(linkedVertexNodeId);
              let linkedVertexChainData: ChainData;
              try {
                // TODO: this needs to be cancelable
                linkedVertexChainData = await this.nodeManager.requestChainData(
                  linkedVertexNodeId,
                );
              } catch (e) {
                if (
                  e instanceof nodesErrors.ErrorNodeConnectionDestroyed ||
                  e instanceof nodesErrors.ErrorNodeConnectionTimeout
                ) {
                  if (!this.visitedVertices.has(linkedVertexGK)) {
                    await this.scheduleDiscoveryForVertex(linkedVertexGK);
                  }
                  this.logger.error(
                    `Failed to discover ${nodesUtils.encodeNodeId(
                      linkedVertexNodeId,
                    )} - ${e.toString()}`,
                  );
                  continue;
                } else {
                  throw e;
                }
              }
              // With this verified chain, we can link
              const linkedVertexNodeInfo: NodeInfo = {
                id: nodesUtils.encodeNodeId(linkedVertexNodeId),
                chain: linkedVertexChainData,
              };
              await this.gestaltGraph.linkNodeAndNode(
                vertexNodeInfo,
                linkedVertexNodeInfo,
              );
              // Add this vertex to the queue if it hasn't already been visited
              if (!this.visitedVertices.has(linkedVertexGK)) {
                await this.scheduleDiscoveryForVertex(linkedVertexGK);
              }
            }
            // Else the claim is to an identity
            if (claim.payload.data.type === 'identity') {
              // Attempt to get the identity info on the identity provider
              // TODO: this needs to be cancellable
              const identityInfo = await this.getIdentityInfo(
                claim.payload.data.provider,
                claim.payload.data.identity,
              );
              // If we can't get identity info, simply skip this claim
              if (identityInfo == null) {
                continue;
              }
              // Link the node to the found identity info
              await this.gestaltGraph.linkNodeAndIdentity(
                vertexNodeInfo,
                identityInfo,
              );
              // Add this identity vertex to the queue if it is not present
              const linkedIdentityGK = gestaltsUtils.keyFromIdentity(
                claim.payload.data.provider,
                claim.payload.data.identity,
              );
              if (!this.visitedVertices.has(linkedIdentityGK)) {
                await this.scheduleDiscoveryForVertex(linkedIdentityGK);
              }
            }
          }
        }
        break;
      case 'identity':
        {
          // If the next vertex is an identity, perform a social discovery
          // Firstly get the identity info of this identity
          // TODO: this needs to be cancellable
          const vertexIdentityInfo = await this.getIdentityInfo(
            vertexGId.providerId,
            vertexGId.identityId,
          );
          // If we don't have identity info, simply skip this vertex
          if (vertexIdentityInfo == null) {
            return;
          }
          // Link the identity with each node from its claims on the provider
          // Iterate over each of the claims
          for (const id in vertexIdentityInfo.claims) {
            if (ctx.signal.aborted) throw ctx.signal.reason;
            const identityClaimId = id as IdentityClaimId;
            const claim = vertexIdentityInfo.claims[identityClaimId];
            // Claims on an identity provider will always be node -> identity
            // So just cast payload data as such
            const data = claim.payload.data as ClaimLinkIdentity;
            const linkedVertexNodeId = nodesUtils.decodeNodeId(data.node)!;
            const linkedVertexGK =
              gestaltsUtils.keyFromNode(linkedVertexNodeId);
            // Get the chain data of this claimed node (so that we can link in GG)
            let linkedVertexChainData: ChainData;
            try {
              linkedVertexChainData = await this.nodeManager.requestChainData(
                linkedVertexNodeId,
              );
            } catch (e) {
              if (
                e instanceof nodesErrors.ErrorNodeConnectionDestroyed ||
                e instanceof nodesErrors.ErrorNodeConnectionTimeout ||
                e instanceof networkErrors.ErrorConnectionNotRunning
              ) {
                if (!this.visitedVertices.has(linkedVertexGK)) {
                  await this.scheduleDiscoveryForVertex(linkedVertexGK);
                }
                this.logger.error(
                  `Failed to discover ${data.node} - ${e.toString()}`,
                );
                continue;
              } else {
                throw e;
              }
            }
            // With this verified chain, we can link
            const linkedVertexNodeInfo: NodeInfo = {
              id: nodesUtils.encodeNodeId(linkedVertexNodeId),
              chain: linkedVertexChainData,
            };
            await this.gestaltGraph.linkNodeAndIdentity(
              linkedVertexNodeInfo,
              vertexIdentityInfo,
            );
            // Add this vertex to the queue if it is not present
            if (!this.visitedVertices.has(linkedVertexGK)) {
              await this.scheduleDiscoveryForVertex(linkedVertexGK);
            }
          }
        }
        break;
      default:
        never();
    }
    this.visitedVertices.add(vertex);
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
    vertex: GestaltKey,
    tran?: DBTransaction,
  ) {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.scheduleDiscoveryForVertex(vertex, tran),
      );
    }

    // Locking on vertex to avoid duplicates
    await tran.lock(
      [this.constructor.name, this.discoverVertexHandlerId, vertex].join(''),
    );
    // Check if task exists
    let taskExists = false;
    for await (const task of this.taskManager.getTasks(
      'asc',
      true,
      [this.constructor.name, this.discoverVertexHandlerId, vertex],
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
        parameters: [vertex],
        path: [this.constructor.name, this.discoverVertexHandlerId, vertex],
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
  protected async getIdentityInfo(
    providerId: ProviderId,
    identityId: IdentityId,
  ): Promise<IdentityInfo | undefined> {
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
    // Get the identity data
    const identityData = await provider.getIdentityData(
      authIdentityId,
      identityId,
    );
    // If we don't have identity data, no identity info to find
    if (identityData == null) {
      return undefined;
    }
    // Get and verify the identity claims
    const identityClaims = await this.verifyIdentityClaims(
      provider,
      identityId,
      authIdentityId,
    );
    // With this verified set of claims, we can now link
    return {
      ...identityData,
      claims: identityClaims,
    } as IdentityInfo;
  }

  /**
   * Helper function to retrieve and verify the claims of an identity on a given
   * provider. Connects with each node the identity claims to be linked with,
   * and verifies the claim with the public key of the node.
   */
  protected async verifyIdentityClaims(
    provider: Provider,
    identityId: IdentityId,
    authIdentityId: IdentityId,
  ): Promise<IdentityClaims> {
    const identityClaims: IdentityClaims = {};
    for await (const claim of provider.getClaims(authIdentityId, identityId)) {
      const decodedClaim: Claim = {
        payload: claim.payload,
        signatures: claim.signatures,
      };
      // Claims on an identity provider will always be node -> identity
      // So just cast payload data as such
      const data = claim.payload.data as ClaimLinkIdentity;
      const encoded = await claimsUtils.encodeClaim(decodedClaim);
      // Verify the claim with the public key of the node
      const verified = await claimsUtils.verifyClaimSignature(
        encoded,
        await this.nodeManager.getPublicKey(
          nodesUtils.decodeNodeId(data.node)!,
        ),
      );
      // If verified, add to the record
      if (verified) {
        identityClaims[claim.id] = claim;
      }
    }
    return identityClaims;
  }
}

export default Discovery;
