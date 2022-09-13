import type { DB, DBTransaction } from '@matrixai/db';
import type NodeConnectionManager from './NodeConnectionManager';
import type NodeGraph from './NodeGraph';
import type KeyManager from '../keys/KeyManager';
import type { PublicKeyPem } from '../keys/types';
import type Sigchain from '../sigchain/Sigchain';
import type { ChainData, ChainDataEncoded } from '../sigchain/types';
import type {
  NodeId,
  NodeAddress,
  NodeBucket,
  NodeBucketIndex,
} from '../nodes/types';
import type { ClaimEncoded } from '../claims/types';
import type { Timer } from '../types';
import type TaskManager from '../tasks/TaskManager';
import type { TaskHandler, TaskHandlerId, Task } from '../tasks/types';
import Logger from '@matrixai/logger';
import { StartStop, ready } from '@matrixai/async-init/dist/StartStop';
import * as nodesErrors from './errors';
import * as nodesUtils from './utils';
import * as networkUtils from '../network/utils';
import * as validationUtils from '../validation/utils';
import * as utilsPB from '../proto/js/polykey/v1/utils/utils_pb';
import * as claimsErrors from '../claims/errors';
import * as sigchainUtils from '../sigchain/utils';
import * as claimsUtils from '../claims/utils';
import { timerStart, never } from '../utils/utils';

interface NodeManager extends StartStop {}
@StartStop()
class NodeManager {
  protected db: DB;
  protected logger: Logger;
  protected sigchain: Sigchain;
  protected keyManager: KeyManager;
  protected nodeConnectionManager: NodeConnectionManager;
  protected nodeGraph: NodeGraph;
  protected taskManager: TaskManager;
  protected refreshBucketDelay: number;
  public readonly setNodeHandlerId =
    'NodeManager.setNodeHandler' as TaskHandlerId;
  public readonly refreshBucketHandlerId =
    'NodeManager.refreshBucketHandler' as TaskHandlerId;

  private refreshBucketHandler: TaskHandler = async (
    context,
    taskInfo,
    bucketIndex,
  ) => {
    await this.refreshBucket(bucketIndex, { signal: context.signal });
    // When completed reschedule the task
    await this.taskManager.scheduleTask({
      delay: this.refreshBucketDelay,
      handlerId: this.refreshBucketHandlerId,
      lazy: true,
      parameters: [bucketIndex],
      path: ['refreshBucket', `${bucketIndex}`],
      priority: 0,
    });
  };

  private setNodeHandler: TaskHandler = async (
    context,
    taskInfo,
    nodeIdEncoded,
    nodeAddress: NodeAddress,
    timeout: number,
  ) => {
    const nodeId: NodeId = nodesUtils.decodeNodeId(nodeIdEncoded)!;
    await this.setNode(nodeId, nodeAddress, true, false, timeout, undefined, {
      signal: context.signal,
    });
  };

  constructor({
    db,
    keyManager,
    sigchain,
    nodeConnectionManager,
    nodeGraph,
    taskManager,
    refreshBucketDelay = 3600000, // 1 hour in milliseconds
    logger,
  }: {
    db: DB;
    keyManager: KeyManager;
    sigchain: Sigchain;
    nodeConnectionManager: NodeConnectionManager;
    nodeGraph: NodeGraph;
    taskManager: TaskManager;
    refreshBucketDelay?: number;
    logger?: Logger;
  }) {
    this.logger = logger ?? new Logger(this.constructor.name);
    this.db = db;
    this.keyManager = keyManager;
    this.sigchain = sigchain;
    this.nodeConnectionManager = nodeConnectionManager;
    this.nodeGraph = nodeGraph;
    this.taskManager = taskManager;
    this.refreshBucketDelay = refreshBucketDelay;
  }

  public async start() {
    this.logger.info(`Starting ${this.constructor.name}`);
    this.logger.info(`Registering handler for setNode`);
    this.taskManager.registerHandler(
      this.setNodeHandlerId,
      this.setNodeHandler,
    );
    this.taskManager.registerHandler(
      this.refreshBucketHandlerId,
      this.refreshBucketHandler,
    );
    await this.setupRefreshBucketTasks();
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop() {
    this.logger.info(`Stopping ${this.constructor.name}`);
    this.logger.info(`Unregistering handler for setNode`);
    this.taskManager.deregisterHandler(this.setNodeHandlerId);
    this.taskManager.deregisterHandler(this.refreshBucketHandlerId);
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  /**
   * Determines whether a node in the Polykey network is online.
   * @return true if online, false if offline
   * @param nodeId - NodeId of the node we're pinging
   * @param address - Optional Host and Port we want to ping
   * @param timer Connection timeout timer
   */
  public async pingNode(
    nodeId: NodeId,
    address?: NodeAddress,
    timer?: Timer,
    options: { signal?: AbortSignal } = {},
  ): Promise<boolean> {
    // We need to attempt a connection using the proxies
    // For now we will just do a forward connect + relay message
    const targetAddress =
      address ?? (await this.nodeConnectionManager.findNode(nodeId, options));
    if (targetAddress == null) {
      throw new nodesErrors.ErrorNodeGraphNodeIdNotFound();
    }
    const targetHost = await networkUtils.resolveHost(targetAddress.host);
    return await this.nodeConnectionManager.pingNode(
      nodeId,
      targetHost,
      targetAddress.port,
      timer,
    );
  }

  /**
   * Connects to the target node and retrieves its public key from its root
   * certificate chain (corresponding to the provided public key fingerprint -
   * the node ID).
   */
  public async getPublicKey(targetNodeId: NodeId): Promise<PublicKeyPem> {
    const publicKey = await this.nodeConnectionManager.withConnF(
      targetNodeId,
      async (connection) => {
        return connection.getExpectedPublicKey(targetNodeId);
      },
    );
    if (publicKey == null) {
      throw new nodesErrors.ErrorNodeConnectionPublicKeyNotFound();
    }
    return publicKey as PublicKeyPem;
  }

  /**
   * Connects to the target node, and retrieves its sigchain data.
   * Verifies and returns the decoded chain as ChainData. Note: this will drop
   * any unverifiable claims.
   * For node1 -> node2 claims, the verification process also involves connecting
   * to node2 to verify the claim (to retrieve its signing public key).
   */
  public async requestChainData(targetNodeId: NodeId): Promise<ChainData> {
    // Verify the node's chain with its own public key
    const [unverifiedChainData, publicKey] =
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
          const publicKey = connection.getExpectedPublicKey(
            targetNodeId,
          ) as PublicKeyPem;
          return [unverifiedChainData, publicKey];
        },
      );

    if (!publicKey) {
      throw new nodesErrors.ErrorNodeConnectionPublicKeyNotFound();
    }
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
        let endPublicKey: PublicKeyPem;
        // If the claim points back to our own node, don't attempt to connect
        if (endNodeId.equals(this.keyManager.getNodeId())) {
          endPublicKey = this.keyManager.getRootKeyPairPem().publicKey;
          // Otherwise, get the public key from the root cert chain (by connection)
        } else {
          endPublicKey = await this.nodeConnectionManager.withConnF(
            endNodeId,
            async (connection) => {
              return connection.getExpectedPublicKey(endNodeId) as PublicKeyPem;
            },
          );
          if (!endPublicKey) {
            throw new nodesErrors.ErrorNodeConnectionPublicKeyNotFound();
          }
        }
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
        node1: nodesUtils.encodeNodeId(this.keyManager.getNodeId()),
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
          const senderPublicKey = connection.getExpectedPublicKey(targetNodeId);
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
              this.keyManager.getRootKeyPairPem().publicKey,
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
              privateKey: this.keyManager.getRootKeyPairPem().privateKey,
              signeeNodeId: nodesUtils.encodeNodeId(
                this.keyManager.getNodeId(),
              ),
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

  // FIXME: make cancelable
  /**
   * Adds a node to the node graph. This assumes that you have already authenticated the node
   * Updates the node if the node already exists
   * This operation is blocking by default - set `block` 2qto false to make it non-blocking
   * @param nodeId - Id of the node we wish to add
   * @param nodeAddress - Expected address of the node we want to add
   * @param block - Flag for if the operation should block or utilize the async queue
   * @param force - Flag for if we want to add the node without authenticating or if the bucket is full.
   * This will drop the oldest node in favor of the new.
   * @param timeout Connection timeout
   * @param tran
   */
  @ready(new nodesErrors.ErrorNodeManagerNotRunning())
  public async setNode(
    nodeId: NodeId,
    nodeAddress: NodeAddress,
    block: boolean = true,
    force: boolean = false,
    timeout?: number,
    tran?: DBTransaction,
    options: { signal?: AbortSignal } = {},
  ): Promise<void> {
    // We don't want to add our own node
    if (nodeId.equals(this.keyManager.getNodeId())) {
      this.logger.debug('Is own NodeId, skipping');
      return;
    }

    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.setNode(nodeId, nodeAddress, block, force, timeout, tran),
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
    const nodeData = await this.nodeGraph.getNode(nodeId, tran);
    // If this is a new entry, check the bucket limit
    const [bucketIndex] = this.nodeGraph.bucketIndex(nodeId);
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
      // We need to ping the oldest node
      if (force) {
        // We just add the new node anyway without checking the old one
        const oldNodeId = (
          await this.nodeGraph.getOldestNode(bucketIndex, 1, tran)
        ).pop()!;
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
      } else if (block) {
        this.logger.debug(
          `Bucket was full and blocking was true, garbage collecting old nodes to add ${nodesUtils.encodeNodeId(
            nodeId,
          )}`,
        );
        await this.garbageCollectOldNode(
          bucketIndex,
          nodeId,
          nodeAddress,
          timeout,
          options,
        );
      } else {
        this.logger.debug(
          `Bucket was full and blocking was false, adding ${nodesUtils.encodeNodeId(
            nodeId,
          )} to queue`,
        );
        // Re-attempt this later asynchronously by adding to the scheduler
        await this.taskManager.scheduleTask(
          {
            handlerId: this.setNodeHandlerId,
            parameters: [nodesUtils.toString(), nodeAddress, timeout],
            path: ['setNode'],
            lazy: true,
          },
          tran,
        );
      }
    }
  }

  // FIXME: make cancellable
  private async garbageCollectOldNode(
    bucketIndex: number,
    nodeId: NodeId,
    nodeAddress: NodeAddress,
    timeout?: number,
    options: { signal?: AbortSignal } = {},
  ) {
    const { signal } = { ...options };
    const oldestNodeIds = await this.nodeGraph.getOldestNode(bucketIndex, 3);
    for (const nodeId of oldestNodeIds) {
      signal?.throwIfAborted();
      // This needs to return nodeId and ping result
      const data = await this.nodeGraph.getNode(nodeId);
      if (data == null) return { nodeId, success: false };
      const timer = timeout != null ? timerStart(timeout) : undefined;
      const success = await this.pingNode(nodeId, nodeAddress, timer, {
        signal,
      });

      if (success) {
        // Ping succeeded, update the node
        this.logger.debug(
          `Ping succeeded for ${nodesUtils.encodeNodeId(nodeId)}`,
        );
        const node = (await this.nodeGraph.getNode(nodeId))!;
        await this.nodeGraph.setNode(nodeId, node.address);
        // Updating the refreshBucket timer
        await this.updateRefreshBucketDelay(
          bucketIndex,
          this.refreshBucketDelay,
        );
      } else {
        this.logger.debug(`Ping failed for ${nodesUtils.encodeNodeId(nodeId)}`);
        // Otherwise, we remove the node
        await this.nodeGraph.unsetNode(nodeId);
      }
    }
    // Check if we now have room and add the new node
    const count = await this.nodeGraph.getBucketMetaProp(bucketIndex, 'count');
    if (count < this.nodeGraph.nodeBucketLimit) {
      this.logger.debug(`Bucket ${bucketIndex} now has room, adding new node`);
      await this.nodeGraph.setNode(nodeId, nodeAddress);
      // Updating the refreshBucket timer
      await this.updateRefreshBucketDelay(bucketIndex, this.refreshBucketDelay);
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
    return await this.nodeGraph.resetBuckets(this.keyManager.getNodeId());
  }

  /**
   * Kademlia refresh bucket operation.
   * It picks a random node within a bucket and does a search for that node.
   * Connections during the search will will share node information with other
   * nodes.
   * @param bucketIndex
   * @param options
   */
  public async refreshBucket(
    bucketIndex: NodeBucketIndex,
    options: { signal?: AbortSignal } = {},
  ) {
    const { signal } = { ...options };
    // We need to generate a random nodeId for this bucket
    const nodeId = this.keyManager.getNodeId();
    const bucketRandomNodeId = nodesUtils.generateRandomNodeIdForBucket(
      nodeId,
      bucketIndex,
    );
    // We then need to start a findNode procedure
    await this.nodeConnectionManager.findNode(bucketRandomNodeId, { signal });
  }

  private async setupRefreshBucketTasks(tran?: DBTransaction) {
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
      ['refreshBucket'],
      tran,
    )) {
      const bucketIndex = parseInt(task.path[0]);
      switch (task.status) {
        case 'scheduled':
          {
            // If it's scheduled then reset delay
            existingTasks[bucketIndex] = true;
            this.logger.debug(
              `Updating refreshBucket delay for bucket ${bucketIndex}`,
            );
            // Total delay is refreshBucketDelay + time since task creation
            const delay =
              performance.now() +
              performance.timeOrigin -
              task.created.getTime() +
              this.refreshBucketDelay;
            await this.taskManager.updateTask(task.id, { delay }, tran);
          }
          break;
        case 'queued':
        case 'active':
          // If it's running then leave it
          this.logger.debug(
            `RefreshBucket task for bucket ${bucketIndex} is already active, ignoring`,
          );
          existingTasks[bucketIndex] = true;
          break;
        default:
          // Otherwise ignore it, should be re-created
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
        await this.taskManager.scheduleTask({
          handlerId: this.refreshBucketHandlerId,
          delay: this.refreshBucketDelay,
          lazy: true,
          parameters: [bucketIndex],
          path: ['refreshBucket', `${bucketIndex}`],
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

    let foundTask: Task | undefined;
    let count = 0;
    for await (const task of this.taskManager.getTasks(
      'asc',
      true,
      ['refreshBucket', `${bucketIndex}`],
      tran,
    )) {
      count += 1;
      if (count <= 1) {
        foundTask = task;
        // If already running then don't update
        if (task.status !== 'scheduled') continue;
        // Update the first one
        // total delay is refreshBucketDelay + time since task creation
        // time since task creation = now - creation time;
        const delayNew =
          performance.now() +
          performance.timeOrigin -
          task.created.getTime() +
          delay;
        await this.taskManager.updateTask(task.id, { delay: delayNew }, tran);
        this.logger.debug(
          `Updating refreshBucket task for bucket ${bucketIndex}`,
        );
      } else {
        // These are extra, so we cancel them
        // TODO: make error
        task.cancel(Error('TMP, cancel extra tasks'));
        this.logger.warn(
          `Duplicate refreshBucket task was found for bucket ${bucketIndex}, cancelling`,
        );
      }
    }
    if (count === 0) {
      this.logger.warn(
        `No refreshBucket task for bucket ${bucketIndex}, new one was created`,
      );
      foundTask = await this.taskManager.scheduleTask({
        delay: this.refreshBucketDelay,
        handlerId: this.refreshBucketHandlerId,
        lazy: true,
        parameters: [bucketIndex],
        path: ['refreshBucket', `${bucketIndex}`],
        priority: 0,
      });
    }
    if (foundTask == null) never();
    return foundTask;
  }
}

export default NodeManager;
