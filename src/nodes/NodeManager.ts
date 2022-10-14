import type { DB, DBTransaction } from '@matrixai/db';
import type NodeConnectionManager from './NodeConnectionManager';
import type NodeGraph from './NodeGraph';
import type KeyRing from '../keys/KeyRing';
import type { PublicKey } from '../keys/types';
import type Sigchain from '../sigchain/Sigchain';
import type { ChainData, ChainDataEncoded } from '../sigchain/types';
import type {
  NodeId,
  NodeAddress,
  NodeBucket,
  NodeBucketIndex,
  NodeData,
} from './types';
import type { ClaimEncoded } from '../claims/types';
import type TaskManager from '../tasks/TaskManager';
import type { TaskHandler, TaskHandlerId, Task } from '../tasks/types';
import type { ContextTimed } from 'contexts/types';
import type { PromiseCancellable } from '@matrixai/async-cancellable';
import type { Host, Port } from '../network/types';
import Logger from '@matrixai/logger';
import { StartStop, ready } from '@matrixai/async-init/dist/StartStop';
import { Semaphore, Lock } from '@matrixai/async-locks';
import { IdInternal } from '@matrixai/id';
import { Timer } from '@matrixai/timer';
import * as nodesErrors from './errors';
import * as nodesUtils from './utils';
import * as tasksErrors from '../tasks/errors';
import { timedCancellable, context } from '../contexts';
import * as validationUtils from '../validation/utils';
import * as utilsPB from '../proto/js/polykey/v1/utils/utils_pb';
import * as claimsErrors from '../claims/errors';
import * as sigchainUtils from '../sigchain/utils';
import * as claimsUtils from '../claims/utils';
import * as keysUtils from '../keys/utils';
import { never } from '../utils/utils';

const abortEphemeralTaskReason = Symbol('abort ephemeral task reason');
const abortSingletonTaskReason = Symbol('abort singleton task reason');

interface NodeManager extends StartStop {}
@StartStop()
class NodeManager {
  protected db: DB;
  protected logger: Logger;
  protected sigchain: Sigchain;
  protected keyRing: KeyRing;
  protected nodeConnectionManager: NodeConnectionManager;
  protected nodeGraph: NodeGraph;
  protected taskManager: TaskManager;
  protected refreshBucketDelay: number;
  protected refreshBucketDelayJitter: number;
  protected retrySeedConnectionsDelay: number;
  protected pendingNodes: Map<number, Map<string, NodeAddress>> = new Map();

  public readonly basePath = this.constructor.name;
  protected refreshBucketHandler: TaskHandler = async (
    ctx,
    _taskInfo,
    bucketIndex,
  ) => {
    await this.refreshBucket(
      bucketIndex,
      this.nodeConnectionManager.pingTimeout,
      ctx,
    );
    // When completed reschedule the task
    const jitter = nodesUtils.refreshBucketsDelayJitter(
      this.refreshBucketDelay,
      this.refreshBucketDelayJitter,
    );
    await this.taskManager.scheduleTask({
      delay: this.refreshBucketDelay + jitter,
      handlerId: this.refreshBucketHandlerId,
      lazy: true,
      parameters: [bucketIndex],
      path: [this.basePath, this.refreshBucketHandlerId, `${bucketIndex}`],
      priority: 0,
    });
  };
  public readonly refreshBucketHandlerId =
    `${this.basePath}.${this.refreshBucketHandler.name}.refreshBucketHandlerId` as TaskHandlerId;
  protected gcBucketHandler: TaskHandler = async (
    ctx,
    _taskInfo,
    bucketIndex: number,
  ) => {
    await this.garbageCollectBucket(
      bucketIndex,
      this.nodeConnectionManager.pingTimeout,
      ctx,
    );
    // Checking for any new pending tasks
    const pendingNodesRemaining = this.pendingNodes.get(bucketIndex);
    if (pendingNodesRemaining == null || pendingNodesRemaining.size === 0) {
      return;
    }
    // Re-schedule the task
    await this.setupGCTask(bucketIndex);
  };
  public readonly gcBucketHandlerId =
    `${this.basePath}.${this.gcBucketHandler.name}.gcBucketHandlerId` as TaskHandlerId;
  protected pingAndSetNodeHandler: TaskHandler = async (
    ctx,
    _taskInfo,
    nodeIdEncoded: string,
    host: Host,
    port: Port,
  ) => {
    const nodeId = nodesUtils.decodeNodeId(nodeIdEncoded);
    if (nodeId == null) {
      this.logger.error(
        `pingAndSetNodeHandler received invalid NodeId: ${nodeIdEncoded}`,
      );
      never();
    }
    if (await this.pingNode(nodeId, { host, port }, { signal: ctx.signal })) {
      await this.setNode(nodeId, { host, port }, false, false, 2000, ctx);
    }
  };
  public readonly pingAndSetNodeHandlerId: TaskHandlerId =
    `${this.basePath}.${this.pingAndSetNodeHandler.name}.pingAndSetNodeHandlerId` as TaskHandlerId;
  protected checkSeedConnectionsHandler: TaskHandler = async (
    ctx,
    taskInfo,
  ) => {
    this.logger.debug('Checking seed connections');
    // Check for existing seed node connections
    const seedNodes = this.nodeConnectionManager.getSeedNodes();
    const allInactive = !seedNodes
      .map((nodeId) => this.nodeConnectionManager.hasConnection(nodeId))
      .reduce((a, b) => a || b);
    try {
      if (allInactive) {
        this.logger.debug(
          'No active seed connections were found, retrying network entry',
        );
        // If no seed node connections exist then we redo syncNodeGraph
        await this.syncNodeGraph(true, undefined, ctx);
      } else {
        // Doing this concurrently, we don't care about the results
        await Promise.allSettled(
          seedNodes.map((nodeId) => {
            // Retry any failed seed node connections
            if (!this.nodeConnectionManager.hasConnection(nodeId)) {
              this.logger.debug(
                `Re-establishing seed connection for ${nodesUtils.encodeNodeId(
                  nodeId,
                )}`,
              );
              return this.nodeConnectionManager.withConnF(
                nodeId,
                async () => {
                  // Do nothing, we just want to establish a connection
                },
                ctx,
              );
            }
          }),
        );
      }
    } finally {
      this.logger.debug('Checked seed connections');
      // Re-schedule this task
      await this.taskManager.scheduleTask({
        delay: taskInfo.delay,
        deadline: taskInfo.deadline,
        handlerId: this.checkSeedConnectionsHandlerId,
        lazy: true,
        path: [this.basePath, this.checkSeedConnectionsHandlerId],
        priority: taskInfo.priority,
      });
    }
  };
  public readonly checkSeedConnectionsHandlerId: TaskHandlerId =
    `${this.basePath}.${this.checkSeedConnectionsHandler.name}.checkSeedConnectionsHandler` as TaskHandlerId;

  constructor({
    db,
    keyRing,
    sigchain,
    nodeConnectionManager,
    nodeGraph,
    taskManager,
    refreshBucketDelay = 3600000, // 1 hour in milliseconds
    refreshBucketDelayJitter = 0.5, // Multiple of refreshBucketDelay to jitter by
    retrySeedConnectionsDelay = 120000, // 2 minuets
    logger,
  }: {
    db: DB;
    keyRing: KeyRing;
    sigchain: Sigchain;
    nodeConnectionManager: NodeConnectionManager;
    nodeGraph: NodeGraph;
    taskManager: TaskManager;
    refreshBucketDelay?: number;
    refreshBucketDelayJitter?: number;
    retrySeedConnectionsDelay?: number;
    longTaskTimeout?: number;
    logger?: Logger;
  }) {
    this.logger = logger ?? new Logger(this.constructor.name);
    this.db = db;
    this.keyRing = keyRing;
    this.sigchain = sigchain;
    this.nodeConnectionManager = nodeConnectionManager;
    this.nodeGraph = nodeGraph;
    this.taskManager = taskManager;
    this.refreshBucketDelay = refreshBucketDelay;
    // Clamped from 0 to 1 inclusive
    this.refreshBucketDelayJitter = Math.max(
      0,
      Math.min(refreshBucketDelayJitter, 1),
    );
    this.retrySeedConnectionsDelay = retrySeedConnectionsDelay;
  }

  public async start() {
    this.logger.info(`Starting ${this.constructor.name}`);
    this.logger.info(`Registering handler for setNode`);
    this.taskManager.registerHandler(
      this.refreshBucketHandlerId,
      this.refreshBucketHandler,
    );
    this.taskManager.registerHandler(
      this.gcBucketHandlerId,
      this.gcBucketHandler,
    );
    this.taskManager.registerHandler(
      this.pingAndSetNodeHandlerId,
      this.pingAndSetNodeHandler,
    );
    this.taskManager.registerHandler(
      this.checkSeedConnectionsHandlerId,
      this.checkSeedConnectionsHandler,
    );
    await this.setupRefreshBucketTasks();
    await this.taskManager.scheduleTask({
      delay: this.retrySeedConnectionsDelay,
      handlerId: this.checkSeedConnectionsHandlerId,
      lazy: true,
      path: [this.basePath, this.checkSeedConnectionsHandlerId],
    });
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop() {
    this.logger.info(`Stopping ${this.constructor.name}`);
    this.logger.info('Cancelling ephemeral tasks');
    if (this.taskManager.isProcessing()) {
      throw new tasksErrors.ErrorTaskManagerProcessing();
    }
    const tasks: Array<Promise<any>> = [];
    for await (const task of this.taskManager.getTasks('asc', false, [
      this.basePath,
    ])) {
      tasks.push(task.promise());
      task.cancel(abortEphemeralTaskReason);
    }
    // We don't care about the result, only that they've ended
    await Promise.allSettled(tasks);
    this.logger.info('Cancelled ephemeral tasks');
    this.logger.info(`Unregistering handler for setNode`);
    this.taskManager.deregisterHandler(this.refreshBucketHandlerId);
    this.taskManager.deregisterHandler(this.gcBucketHandlerId);
    this.taskManager.deregisterHandler(this.pingAndSetNodeHandlerId);
    this.taskManager.deregisterHandler(this.checkSeedConnectionsHandlerId);
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  /**
   * Determines whether a node in the Polykey network is online.
   * @return true if online, false if offline
   * @param nodeId - NodeId of the node we're pinging
   * @param address - Optional Host and Port we want to ping
   * @param ctx
   */
  public pingNode(
    nodeId: NodeId,
    address?: NodeAddress,
    ctx?: Partial<ContextTimed>,
  ): PromiseCancellable<boolean>;
  @timedCancellable(
    true,
    (nodeManager: NodeManager) => nodeManager.nodeConnectionManager.pingTimeout,
  )
  public async pingNode(
    nodeId: NodeId,
    address: NodeAddress | undefined,
    @context ctx: ContextTimed,
  ): Promise<boolean> {
    // We need to attempt a connection using the proxies
    // For now we will just do a forward connect + relay message
    const targetAddress =
      address ??
      (await this.nodeConnectionManager.findNode(
        nodeId,
        false,
        this.nodeConnectionManager.pingTimeout,
        ctx,
      ));
    if (targetAddress == null) {
      return false;
    }
    return await this.nodeConnectionManager.pingNode(
      nodeId,
      targetAddress.host,
      targetAddress.port,
      ctx,
    );
  }

  /**
   * Connects to the target node, and retrieves its sigchain data.
   * Verifies and returns the decoded chain as ChainData. Note: this will drop
   * any unverifiable claims.
   * For node1 -> node2 claims, the verification process also involves connecting
   * to node2 to verify the claim (to retrieve its signing public key).
   */
  public requestChainData(
    targetNodeId: NodeId,
    connectionTimeout?: number,
    ctx?: Partial<ContextTimed>,
  ): PromiseCancellable<ChainData>;
  @timedCancellable(true)
  public async requestChainData(
    targetNodeId: NodeId,
    connectionTimeout: number | undefined,
    @context ctx: ContextTimed,
  ): Promise<ChainData> {
    // Verify the node's chain with its own public key
    const timer =
      connectionTimeout != null
        ? new Timer({ delay: connectionTimeout })
        : undefined;
    const unverifiedChainData =
      await this.nodeConnectionManager.withConnF(
        targetNodeId,
        async (connection) => {
          const unverifiedChainData: ChainDataEncoded = {};
          const emptyMsg = new utilsPB.EmptyMessage();
          const client = connection.getClient();
          const response = await client.nodesChainDataGet(emptyMsg);
          // Reconstruct each claim from the returned ChainDataMessage
          response.getChainDataMap().forEach((claimMsg, claimId: string) => {
            // Reconstruct the signatures array
            const signatures: Array<{ signature: string; protected: string }> =
              [];
            for (const signatureData of claimMsg.getSignaturesList()) {
              signatures.push({
                signature: signatureData.getSignature(),
                protected: signatureData.getProtected(),
              });
            }
            // Add to the record of chain data, casting as expected ClaimEncoded
            unverifiedChainData[claimId] = {
              signatures: signatures,
              payload: claimMsg.getPayload(),
            } as ClaimEncoded;
          });
          return unverifiedChainData;
        },
        { signal: ctx.signal, timer },
      );
    const publicKey = keysUtils.publicKeyFromNodeId(targetNodeId);
    const verifiedChainData = await sigchainUtils.verifyChainData(
      unverifiedChainData,
      publicKey,
    );

    // Then, for any node -> node claims, we also need to verify with the
    // node on the other end of the claim
    // e.g. a node claim from A -> B, verify with B's public key
    for (const claimId in verifiedChainData) {
      const payload = verifiedChainData[claimId].payload;
      if (payload.data.type === 'node') {
        const endNodeId = validationUtils.parseNodeId(payload.data.node2);
        let endPublicKey: PublicKey = keysUtils.publicKeyFromNodeId(endNodeId);
        const verified = await claimsUtils.verifyClaimSignature(
          unverifiedChainData[claimId],
          endPublicKey,
        );
        // If unverifiable, remove the claim from the ChainData to return
        if (!verified) {
          delete verifiedChainData[claimId];
        }
      }
    }
    return verifiedChainData;
  }

  /**
   * Call this function upon receiving a "claim node request" notification from
   * another node.
   */
  public async claimNode(
    targetNodeId: NodeId,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) => {
        return this.claimNode(targetNodeId, tran);
      });
    }

    // 2. Create your intermediary claim
    const singlySignedClaim = await this.sigchain.createIntermediaryClaim(
      {
        type: 'node',
        node1: nodesUtils.encodeNodeId(this.keyRing.getNodeId()),
        node2: nodesUtils.encodeNodeId(targetNodeId),
      },
      tran,
    );
    let doublySignedClaim: ClaimEncoded;
    await this.nodeConnectionManager.withConnF(
      targetNodeId,
      async (connection) => {
        const client = connection.getClient();
        const genClaims = client.nodesCrossSignClaim();
        try {
          // 2. Set up the intermediary claim message (the singly signed claim) to send
          const crossSignMessage = claimsUtils.createCrossSignMessage({
            singlySignedClaim: singlySignedClaim,
          });
          await genClaims.write(crossSignMessage); // Get the generator here
          // 3. We expect to receive our singly signed claim we sent to now be a
          // doubly signed claim (signed by the other node), as well as a singly
          // signed claim to be signed by us
          const readStatus = await genClaims.read();
          // If nothing to read, end and destroy
          if (readStatus.done) {
            throw new claimsErrors.ErrorEmptyStream();
          }
          const receivedMessage = readStatus.value;
          const intermediaryClaimMessage =
            receivedMessage.getSinglySignedClaim();
          const doublySignedClaimMessage =
            receivedMessage.getDoublySignedClaim();
          // Ensure all of our expected messages are defined
          if (!intermediaryClaimMessage) {
            throw new claimsErrors.ErrorUndefinedSinglySignedClaim();
          }
          const intermediaryClaimSignature =
            intermediaryClaimMessage.getSignature();
          if (!intermediaryClaimSignature) {
            throw new claimsErrors.ErrorUndefinedSignature();
          }
          if (!doublySignedClaimMessage) {
            throw new claimsErrors.ErrorUndefinedDoublySignedClaim();
          }
          // Reconstruct the expected objects from the messages
          const constructedIntermediaryClaim =
            claimsUtils.reconstructClaimIntermediary(intermediaryClaimMessage);
          const constructedDoublySignedClaim =
            claimsUtils.reconstructClaimEncoded(doublySignedClaimMessage);
          // Verify the singly signed claim with the sender's public key
          const senderPublicKey = keysUtils.publicKeyFromNodeId(targetNodeId);
          if (!senderPublicKey) {
            throw new nodesErrors.ErrorNodeConnectionPublicKeyNotFound();
          }
          const verifiedSingly =
            await claimsUtils.verifyIntermediaryClaimSignature(
              constructedIntermediaryClaim,
              senderPublicKey,
            );
          if (!verifiedSingly) {
            throw new claimsErrors.ErrorSinglySignedClaimVerificationFailed();
          }
          // Verify the doubly signed claim with both our public key, and the sender's
          const verifiedDoubly =
            (await claimsUtils.verifyClaimSignature(
              constructedDoublySignedClaim,
              this.keyRing.keyPair.publicKey,
            )) &&
            (await claimsUtils.verifyClaimSignature(
              constructedDoublySignedClaim,
              senderPublicKey,
            ));
          if (!verifiedDoubly) {
            throw new claimsErrors.ErrorDoublySignedClaimVerificationFailed();
          }
          // 4. X <- responds with double signing the X signed claim <- Y
          const doublySignedClaimResponse =
            await claimsUtils.signIntermediaryClaim({
              claim: constructedIntermediaryClaim,
              privateKey: this.keyRing.keyPair.privateKey,
              signeeNodeId: nodesUtils.encodeNodeId(this.keyRing.getNodeId()),
            });
          // Should never be reached, but just for type safety
          if (!doublySignedClaimResponse.payload) {
            throw new claimsErrors.ErrorClaimsUndefinedClaimPayload();
          }
          const crossSignMessageResponse = claimsUtils.createCrossSignMessage({
            doublySignedClaim: doublySignedClaimResponse,
          });
          await genClaims.write(crossSignMessageResponse);

          // Check the stream is closed (should be closed by other side)
          const finalResponse = await genClaims.read();
          if (finalResponse.done != null) {
            await genClaims.next(null);
          }

          doublySignedClaim = constructedDoublySignedClaim;
        } catch (e) {
          await genClaims.throw(e);
          throw e;
        }
        await this.sigchain.addExistingClaim(doublySignedClaim, tran);
      },
    );
  }

  /**
   * Retrieves the node Address from the NodeGraph
   * @param nodeId node ID of the target node
   * @param tran
   * @returns Node Address of the target node
   */
  public async getNodeAddress(
    nodeId: NodeId,
    tran: DBTransaction,
  ): Promise<NodeAddress | undefined> {
    return (await this.nodeGraph.getNode(nodeId, tran))?.address;
  }

  /**
   * Determines whether a node ID -> node address mapping exists in the NodeGraph
   * @param targetNodeId the node ID of the node to find
   * @param tran
   * @returns true if the node exists in the table, false otherwise
   */
  public async knowsNode(
    targetNodeId: NodeId,
    tran: DBTransaction,
  ): Promise<boolean> {
    return (await this.nodeGraph.getNode(targetNodeId, tran)) != null;
  }

  /**
   * Gets the specified bucket from the NodeGraph
   */
  public async getBucket(
    bucketIndex: number,
    tran?: DBTransaction,
  ): Promise<NodeBucket | undefined> {
    return await this.nodeGraph.getBucket(
      bucketIndex,
      undefined,
      undefined,
      tran,
    );
  }

  /**
   * Adds a node to the node graph. This assumes that you have already authenticated the node
   * Updates the node if the node already exists
   * This operation is blocking by default - set `block` 2qto false to make it non-blocking
   * @param nodeId - Id of the node we wish to add
   * @param nodeAddress - Expected address of the node we want to add
   * @param block - When true it will wait for any garbage collection to finish before returning.
   * @param force - Flag for if we want to add the node without authenticating or if the bucket is full.
   * This will drop the oldest node in favor of the new.
   * @param pingTimeout - Timeout for each ping opearation during garbage collection.
   * @param ctx
   * @param tran
   */
  public setNode(
    nodeId: NodeId,
    nodeAddress: NodeAddress,
    block?: boolean,
    force?: boolean,
    pingTimeout?: number,
    ctx?: Partial<ContextTimed>,
    tran?: DBTransaction,
  ): PromiseCancellable<void>;
  @ready(new nodesErrors.ErrorNodeManagerNotRunning())
  @timedCancellable(true)
  public async setNode(
    nodeId: NodeId,
    nodeAddress: NodeAddress,
    block: boolean = false,
    force: boolean = false,
    pingTimeout: number | undefined,
    @context ctx: ContextTimed,
    tran?: DBTransaction,
  ): Promise<void> {
    // We don't want to add our own node
    if (nodeId.equals(this.keyRing.getNodeId())) {
      this.logger.debug('Is own NodeId, skipping');
      return;
    }

    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.setNode(nodeId, nodeAddress, block, force, pingTimeout, ctx, tran),
      );
    }

    // When adding a node we need to handle 3 cases
    // 1. The node already exists. We need to update it's last updated field
    // 2. The node doesn't exist and bucket has room.
    //  We need to add the node to the bucket
    // 3. The node doesn't exist and the bucket is full.
    //  We need to ping the oldest node. If the ping succeeds we need to update
    //  the lastUpdated of the oldest node and drop the new one. If the ping
    //  fails we delete the old node and add in the new one.
    const [bucketIndex] = this.nodeGraph.bucketIndex(nodeId);
    // To avoid conflict we want to lock on the bucket index
    await this.nodeGraph.lockBucket(bucketIndex, tran);
    const nodeData = await this.nodeGraph.getNode(nodeId, tran);
    // If this is a new entry, check the bucket limit
    const count = await this.nodeGraph.getBucketMetaProp(
      bucketIndex,
      'count',
      tran,
    );
    if (nodeData != null || count < this.nodeGraph.nodeBucketLimit) {
      // Either already exists or has room in the bucket
      // We want to add or update the node
      await this.nodeGraph.setNode(nodeId, nodeAddress, tran);
      // Updating the refreshBucket timer
      await this.updateRefreshBucketDelay(
        bucketIndex,
        this.refreshBucketDelay,
        true,
        tran,
      );
    } else {
      // We want to add a node but the bucket is full
      if (force) {
        // We just add the new node anyway without checking the old one
        const oldNodeId = (
          await this.nodeGraph.getOldestNode(bucketIndex, 1, tran)
        ).pop();
        if (oldNodeId == null) never();
        this.logger.debug(
          `Force was set, removing ${nodesUtils.encodeNodeId(
            oldNodeId,
          )} and adding ${nodesUtils.encodeNodeId(nodeId)}`,
        );
        await this.nodeGraph.unsetNode(oldNodeId, tran);
        await this.nodeGraph.setNode(nodeId, nodeAddress, tran);
        // Updating the refreshBucket timer
        await this.updateRefreshBucketDelay(
          bucketIndex,
          this.refreshBucketDelay,
          true,
          tran,
        );
        return;
      }
      this.logger.debug(
        `Bucket was full, adding ${nodesUtils.encodeNodeId(
          nodeId,
        )} to pending list`,
      );
      // Add the node to the pending nodes list
      await this.addPendingNode(
        bucketIndex,
        nodeId,
        nodeAddress,
        block,
        pingTimeout ?? this.nodeConnectionManager.pingTimeout,
        ctx,
        tran,
      );
    }
  }

  protected garbageCollectBucket(
    bucketIndex: number,
    pingTimeout?: number,
    ctx?: Partial<ContextTimed>,
    tran?: DBTransaction,
  ): PromiseCancellable<void>;
  @timedCancellable(true)
  protected async garbageCollectBucket(
    bucketIndex: number,
    pingTimeout: number | undefined,
    @context ctx: ContextTimed,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.garbageCollectBucket(bucketIndex, pingTimeout, ctx, tran),
      );
    }

    // This needs to:
    //  1. Iterate over every node within the bucket pinging K at a time
    //  2. remove any un-responsive nodes until there is room of all pending
    //    or run out of existing nodes
    //  3. fill in the bucket with pending nodes until full
    //  4. throw out remaining pending nodes

    const pendingNodes = this.pendingNodes.get(bucketIndex);
    // No nodes mean nothing to do
    if (pendingNodes == null || pendingNodes.size === 0) return;
    this.pendingNodes.set(bucketIndex, new Map());
    // Locking on bucket
    await this.nodeGraph.lockBucket(bucketIndex, tran);
    const semaphore = new Semaphore(3);

    // Iterating over existing nodes
    const bucket = await this.nodeGraph.getOldestNode(
      bucketIndex,
      this.nodeGraph.nodeBucketLimit,
      tran,
    );
    if (bucket == null) never();
    let removedNodes = 0;
    const unsetLock = new Lock();
    const pendingPromises: Array<Promise<void>> = [];
    for (const nodeId of bucket) {
      // We want to retain seed nodes regardless of state, so skip them
      if (this.nodeConnectionManager.isSeedNode(nodeId)) continue;
      if (removedNodes >= pendingNodes.size) break;
      await semaphore.waitForUnlock();
      if (ctx.signal?.aborted === true) break;
      const [semaphoreReleaser] = await semaphore.lock()();
      pendingPromises.push(
        (async () => {
          // Ping and remove or update node in bucket
          const pingCtx = {
            signal: ctx.signal,
            timer: new Timer({
              delay: pingTimeout ?? this.nodeConnectionManager.pingTimeout,
            }),
          };
          const nodeAddress = await this.getNodeAddress(nodeId, tran);
          if (nodeAddress == null) never();
          if (await this.pingNode(nodeId, nodeAddress, pingCtx)) {
            // Succeeded so update
            await this.setNode(
              nodeId,
              nodeAddress,
              false,
              false,
              undefined,
              undefined,
              tran,
            );
          } else {
            // We don't remove node the ping was aborted
            if (ctx.signal.aborted) return;
            // We need to lock this since it's concurrent
            //  and shares the transaction
            await unsetLock.withF(async () => {
              await this.unsetNode(nodeId, tran);
              removedNodes += 1;
            });
          }
        })()
          // Clean ensure semaphore is released
          .finally(async () => await semaphoreReleaser()),
      );
    }
    // Wait for pending pings to complete
    await Promise.all(pendingPromises);
    // Fill in bucket with pending nodes
    for (const [nodeIdString, address] of pendingNodes) {
      if (removedNodes <= 0) break;
      const nodeId = IdInternal.fromString<NodeId>(nodeIdString);
      await this.setNode(
        nodeId,
        address,
        false,
        false,
        undefined,
        undefined,
        tran,
      );
      removedNodes -= 1;
    }
  }

  protected async addPendingNode(
    bucketIndex: number,
    nodeId: NodeId,
    nodeAddress: NodeAddress,
    block: boolean = false,
    pingTimeout: number | undefined,
    ctx: ContextTimed,
    tran?: DBTransaction,
  ): Promise<void> {
    if (!this.pendingNodes.has(bucketIndex)) {
      this.pendingNodes.set(bucketIndex, new Map());
    }
    const pendingNodes = this.pendingNodes.get(bucketIndex);
    pendingNodes!.set(nodeId.toString(), nodeAddress);
    // No need to re-set it in the map, Maps are by reference

    // If set to blocking we just run the GC operation here
    //  without setting up a new task
    if (block) {
      await this.garbageCollectBucket(
        bucketIndex,
        pingTimeout ?? this.nodeConnectionManager.pingTimeout,
        ctx,
        tran,
      );
      return;
    }
    await this.setupGCTask(bucketIndex);
  }

  protected async setupGCTask(bucketIndex: number) {
    // Check and start a 'garbageCollect` bucket task
    let scheduled: boolean = false;
    for await (const task of this.taskManager.getTasks('asc', true, [
      this.basePath,
      this.gcBucketHandlerId,
      `${bucketIndex}`,
    ])) {
      switch (task.status) {
        case 'queued':
        case 'active':
          // Ignore active tasks
          break;
        case 'scheduled':
          {
            if (scheduled) {
              // Duplicate scheduled are removed
              task.cancel(abortSingletonTaskReason);
              break;
            }
            scheduled = true;
          }
          break;
        default:
          task.cancel(abortSingletonTaskReason);
          break;
      }
    }
    if (!scheduled) {
      // If none were found, schedule a new one
      await this.taskManager.scheduleTask({
        handlerId: this.gcBucketHandlerId,
        parameters: [bucketIndex],
        path: [this.basePath, this.gcBucketHandlerId, `${bucketIndex}`],
        lazy: true,
      });
    }
  }

  /**
   * Removes a node from the NodeGraph
   */
  public async unsetNode(nodeId: NodeId, tran: DBTransaction): Promise<void> {
    return await this.nodeGraph.unsetNode(nodeId, tran);
  }

  /**
   * To be called on key renewal. Re-orders all nodes in all buckets with respect
   * to the new node ID.
   */
  public async resetBuckets(): Promise<void> {
    return await this.nodeGraph.resetBuckets(this.keyRing.getNodeId());
  }

  /**
   * Kademlia refresh bucket operation.
   * It picks a random node within a bucket and does a search for that node.
   * Connections during the search will will share node information with other
   * nodes.
   * @param bucketIndex
   * @param pingTimeout
   * @param ctx
   */
  public refreshBucket(
    bucketIndex: number,
    pingTimeout?: number,
    ctx?: Partial<ContextTimed>,
  ): PromiseCancellable<void>;
  @timedCancellable(true)
  public async refreshBucket(
    bucketIndex: NodeBucketIndex,
    pingTimeout: number | undefined,
    @context ctx: ContextTimed,
  ): Promise<void> {
    // We need to generate a random nodeId for this bucket
    const nodeId = this.keyRing.getNodeId();
    const bucketRandomNodeId = nodesUtils.generateRandomNodeIdForBucket(
      nodeId,
      bucketIndex,
    );
    // We then need to start a findNode procedure
    await this.nodeConnectionManager.findNode(
      bucketRandomNodeId,
      true,
      pingTimeout,
      ctx,
    );
  }

  protected async setupRefreshBucketTasks(tran?: DBTransaction) {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.setupRefreshBucketTasks(tran),
      );
    }

    this.logger.info('Setting up refreshBucket tasks');
    // 1. Iterate over existing tasks and reset the delay
    const existingTasks: Array<boolean> = new Array(this.nodeGraph.nodeIdBits);
    for await (const task of this.taskManager.getTasks(
      'asc',
      true,
      [this.basePath, this.refreshBucketHandlerId],
      tran,
    )) {
      const bucketIndex = parseInt(task.path[0]);
      switch (task.status) {
        case 'scheduled':
          {
            // If it's scheduled then reset delay
            existingTasks[bucketIndex] = true;
            // Total delay is refreshBucketDelay + time since task creation
            const delay =
              performance.now() +
              performance.timeOrigin -
              task.created.getTime() +
              this.refreshBucketDelay +
              nodesUtils.refreshBucketsDelayJitter(
                this.refreshBucketDelay,
                this.refreshBucketDelayJitter,
              );
            await this.taskManager.updateTask(task.id, { delay }, tran);
          }
          break;
        case 'queued':
        case 'active':
          // If it's running then leave it
          existingTasks[bucketIndex] = true;
          break;
        default:
          // Otherwise, ignore it, should be re-created
          existingTasks[bucketIndex] = false;
      }
    }

    // 2. Recreate any missing tasks for buckets
    for (
      let bucketIndex = 0;
      bucketIndex < existingTasks.length;
      bucketIndex++
    ) {
      const exists = existingTasks[bucketIndex];
      if (!exists) {
        // Create a new task
        this.logger.debug(
          `Creating refreshBucket task for bucket ${bucketIndex}`,
        );
        const jitter = nodesUtils.refreshBucketsDelayJitter(
          this.refreshBucketDelay,
          this.refreshBucketDelayJitter,
        );
        await this.taskManager.scheduleTask({
          handlerId: this.refreshBucketHandlerId,
          delay: this.refreshBucketDelay + jitter,
          lazy: true,
          parameters: [bucketIndex],
          path: [this.basePath, this.refreshBucketHandlerId, `${bucketIndex}`],
          priority: 0,
        });
      }
    }
    this.logger.info('Set up refreshBucket tasks');
  }

  @ready(new nodesErrors.ErrorNodeManagerNotRunning())
  public async updateRefreshBucketDelay(
    bucketIndex: number,
    delay: number = this.refreshBucketDelay,
    lazy: boolean = true,
    tran?: DBTransaction,
  ): Promise<Task> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.updateRefreshBucketDelay(bucketIndex, delay, lazy, tran),
      );
    }

    const jitter = nodesUtils.refreshBucketsDelayJitter(
      delay,
      this.refreshBucketDelayJitter,
    );
    let foundTask: Task | undefined;
    let existingTask = false;
    for await (const task of this.taskManager.getTasks(
      'asc',
      true,
      [this.basePath, this.refreshBucketHandlerId, `${bucketIndex}`],
      tran,
    )) {
      if (!existingTask) {
        foundTask = task;
        // Update the first one
        // total delay is refreshBucketDelay + time since task creation
        // time since task creation = now - creation time;
        const delayNew =
          performance.now() +
          performance.timeOrigin -
          task.created.getTime() +
          delay +
          jitter;
        try {
          await this.taskManager.updateTask(task.id, { delay: delayNew });
          existingTask = true;
        } catch (e) {
          if (e instanceof tasksErrors.ErrorTaskRunning) {
            // Ignore running
            existingTask = true;
          } else if (!(e instanceof tasksErrors.ErrorTaskMissing)) {
            throw e;
          }
        }
        this.logger.debug(
          `Updating refreshBucket task for bucket ${bucketIndex}`,
        );
      } else {
        // These are extra, so we cancel them
        task.cancel(abortSingletonTaskReason);
        this.logger.warn(
          `Duplicate refreshBucket task was found for bucket ${bucketIndex}, cancelling`,
        );
      }
    }
    if (!existingTask) {
      this.logger.debug(
        `No refreshBucket task for bucket ${bucketIndex}, new one was created`,
      );
      foundTask = await this.taskManager.scheduleTask({
        delay: delay + jitter,
        handlerId: this.refreshBucketHandlerId,
        lazy: true,
        parameters: [bucketIndex],
        path: [this.basePath, this.refreshBucketHandlerId, `${bucketIndex}`],
        priority: 0,
      });
    }
    if (foundTask == null) never();
    return foundTask;
  }

  /**
   * Perform an initial database synchronisation: get k of the closest nodes
   * from each seed node and add them to this database
   * Establish a proxy connection to each node before adding it
   * By default this operation is blocking, set `block` to false to make it
   * non-blocking
   */
  public syncNodeGraph(
    block?: boolean,
    pingTimeout?: number,
    ctx?: Partial<ContextTimed>,
  ): PromiseCancellable<void>;
  @ready(new nodesErrors.ErrorNodeManagerNotRunning())
  @timedCancellable(true)
  public async syncNodeGraph(
    block: boolean = true,
    pingTimeout: number | undefined,
    @context ctx: ContextTimed,
  ): Promise<void> {
    const logger = this.logger.getChild('syncNodeGraph');
    logger.info('Syncing nodeGraph');
    // Getting the seed node connection information
    const seedNodes = this.nodeConnectionManager.getSeedNodes();
    const addresses = await Promise.all(
      await this.db.withTransactionF(async (tran) =>
        seedNodes.map(
          async (seedNode) =>
            (
              await this.nodeGraph.getNode(seedNode, tran)
            )?.address,
        ),
      ),
    );
    const filteredAddresses = addresses.filter(
      (address) => address != null,
    ) as Array<NodeAddress>;
    logger.debug(
      `establishing multi-connection to the following seed nodes ${seedNodes.map(
        (nodeId) => nodesUtils.encodeNodeId(nodeId),
      )}`,
    );
    logger.debug(
      `and addresses ${filteredAddresses.map(
        (address) => `${address.host}:${address.port}`,
      )}`,
    );
    // Establishing connections to the seed nodes
    const connections =
      await this.nodeConnectionManager.establishMultiConnection(
        seedNodes,
        filteredAddresses,
        pingTimeout,
        undefined,
        { signal: ctx.signal },
      );
    logger.debug(`Multi-connection established for`);
    connections.forEach((address, key) => {
      logger.debug(
        `${nodesUtils.encodeNodeId(key)}@${address.host}:${address.port}`,
      );
    });
    if (connections.size === 0) {
      // Not explicitly a failure but we do want to stop here
      this.logger.warn(
        'Failed to connect to any seed nodes when syncing node graph',
      );
      return;
    }
    // Using a map to avoid duplicates
    const closestNodesAll: Map<NodeId, NodeData> = new Map();
    const localNodeId = this.keyRing.getNodeId();
    let closestNode: NodeId | null = null;
    logger.debug('Getting closest nodes');
    for (const [nodeId] of connections) {
      const closestNodes =
        await this.nodeConnectionManager.getRemoteNodeClosestNodes(
          nodeId,
          localNodeId,
          { signal: ctx.signal },
        );
      // Setting node information into the map, filtering out local node
      closestNodes.forEach(([nodeId, address]) => {
        if (!localNodeId.equals(nodeId)) closestNodesAll.set(nodeId, address);
      });

      // Getting the closest node
      let closeNodeInfo = closestNodes.pop();
      if (closeNodeInfo != null && localNodeId.equals(closeNodeInfo[0])) {
        closeNodeInfo = closestNodes.pop();
      }
      if (closeNodeInfo == null) continue;
      const [closeNode] = closeNodeInfo;
      if (closestNode == null) closestNode = closeNode;
      const distA = nodesUtils.nodeDistance(localNodeId, closeNode);
      const distB = nodesUtils.nodeDistance(localNodeId, closestNode);
      if (distA < distB) closestNode = closeNode;
    }
    logger.debug('Starting pingsAndSet tasks');
    const pingTasks: Array<Task> = [];
    for (const [nodeId, nodeData] of closestNodesAll) {
      if (!localNodeId.equals(nodeId)) {
        logger.debug(
          `pingAndSetTask for ${nodesUtils.encodeNodeId(nodeId)}@${
            nodeData.address.host
          }:${nodeData.address.port}`,
        );
        const pingAndSetTask = await this.taskManager.scheduleTask({
          delay: 0,
          handlerId: this.pingAndSetNodeHandlerId,
          lazy: !block,
          parameters: [
            nodesUtils.encodeNodeId(nodeId),
            nodeData.address.host,
            nodeData.address.port,
          ],
          path: [this.basePath, this.pingAndSetNodeHandlerId],
          // Need to be somewhat active so high priority
          priority: 100,
          deadline: pingTimeout,
        });
        pingTasks.push(pingAndSetTask);
      }
    }
    if (block) {
      // We want to wait for all the tasks
      logger.debug('Awaiting all pingAndSetTasks');
      await Promise.all(
        pingTasks.map((task) => {
          const prom = task.promise();
          // Hook on cancellation
          if (ctx.signal.aborted) {
            prom.cancel(ctx.signal.reason);
          } else {
            ctx.signal.addEventListener('abort', () =>
              prom.cancel(ctx.signal.reason),
            );
          }
          // Ignore errors
          return task.promise().catch(() => {});
        }),
      );
    }
    // Refreshing every bucket above the closest node
    logger.debug(`Triggering refreshBucket tasks`);
    let index = this.nodeGraph.nodeIdBits;
    if (closestNode != null) {
      const [bucketIndex] = this.nodeGraph.bucketIndex(closestNode);
      index = bucketIndex;
    }
    const refreshBuckets: Array<Promise<any>> = [];
    for (let i = index; i < this.nodeGraph.nodeIdBits; i++) {
      const task = await this.updateRefreshBucketDelay(i, 0, !block);
      refreshBuckets.push(task.promise());
    }
    if (block) {
      logger.debug(`Awaiting refreshBucket tasks`);
      await Promise.all(refreshBuckets);
    }
  }
}

export default NodeManager;
