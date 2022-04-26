import type { DB } from '@matrixai/db';
import type NodeConnectionManager from './NodeConnectionManager';
import type NodeGraph from './NodeGraph';
import type Queue from './Queue';
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
import type { PromiseType } from '../utils/utils';
import type { AbortSignal } from 'node-abort-controller';
import Logger from '@matrixai/logger';
import { StartStop, ready } from '@matrixai/async-init/dist/StartStop';
import { AbortController } from 'node-abort-controller';
import * as nodesErrors from './errors';
import * as nodesUtils from './utils';
import * as networkUtils from '../network/utils';
import { utils as validationUtils } from '../validation';
import * as utilsPB from '../proto/js/polykey/v1/utils/utils_pb';
import * as claimsErrors from '../claims/errors';
import * as sigchainUtils from '../sigchain/utils';
import * as claimsUtils from '../claims/utils';
import { promise, timerStart } from '../utils/utils';

interface NodeManager extends StartStop {}
@StartStop()
class NodeManager {
  protected db: DB;
  protected logger: Logger;
  protected sigchain: Sigchain;
  protected keyManager: KeyManager;
  protected nodeConnectionManager: NodeConnectionManager;
  protected nodeGraph: NodeGraph;
  protected queue: Queue;
  // Refresh bucket timer
  protected refreshBucketDeadlineMap: Map<NodeBucketIndex, number> = new Map();
  protected refreshBucketTimer: NodeJS.Timer;
  protected refreshBucketNext: NodeBucketIndex;
  public readonly refreshBucketTimerDefault;
  protected refreshBucketQueue: Set<NodeBucketIndex> = new Set();
  protected refreshBucketQueueRunning: boolean = false;
  protected refreshBucketQueueRunner: Promise<void>;
  protected refreshBucketQueuePlug_: PromiseType<void>;
  protected refreshBucketQueueDrained_: PromiseType<void>;
  protected refreshBucketQueueAbortController: AbortController;

  constructor({
    db,
    keyManager,
    sigchain,
    nodeConnectionManager,
    nodeGraph,
    queue,
    refreshBucketTimerDefault = 3600000, // 1 hour in milliseconds
    logger,
  }: {
    db: DB;
    keyManager: KeyManager;
    sigchain: Sigchain;
    nodeConnectionManager: NodeConnectionManager;
    nodeGraph: NodeGraph;
    queue: Queue;
    refreshBucketTimerDefault?: number;
    logger?: Logger;
  }) {
    this.logger = logger ?? new Logger(this.constructor.name);
    this.db = db;
    this.keyManager = keyManager;
    this.sigchain = sigchain;
    this.nodeConnectionManager = nodeConnectionManager;
    this.nodeGraph = nodeGraph;
    this.queue = queue;
    this.refreshBucketTimerDefault = refreshBucketTimerDefault;
  }

  public async start() {
    this.logger.info(`Starting ${this.constructor.name}`);
    this.startRefreshBucketTimers();
    this.refreshBucketQueueRunner = this.startRefreshBucketQueue();
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop() {
    this.logger.info(`Stopping ${this.constructor.name}`);
    await this.stopRefreshBucketTimers();
    await this.stopRefreshBucketQueue();
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
  ): Promise<boolean> {
    // We need to attempt a connection using the proxies
    // For now we will just do a forward connect + relay message
    const targetAddress =
      address ?? (await this.nodeConnectionManager.findNode(nodeId))!;
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
  public async claimNode(targetNodeId: NodeId): Promise<void> {
    await this.sigchain.transaction(async (sigchain) => {
      // 2. Create your intermediary claim
      const singlySignedClaim = await sigchain.createIntermediaryClaim({
        type: 'node',
        node1: nodesUtils.encodeNodeId(this.keyManager.getNodeId()),
        node2: nodesUtils.encodeNodeId(targetNodeId),
      });
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
            // 3. We expect to receieve our singly signed claim we sent to now be a
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
              claimsUtils.reconstructClaimIntermediary(
                intermediaryClaimMessage,
              );
            const constructedDoublySignedClaim =
              claimsUtils.reconstructClaimEncoded(doublySignedClaimMessage);
            // Verify the singly signed claim with the sender's public key
            const senderPublicKey =
              connection.getExpectedPublicKey(targetNodeId);
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
            const crossSignMessageResponse = claimsUtils.createCrossSignMessage(
              {
                doublySignedClaim: doublySignedClaimResponse,
              },
            );
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
          await sigchain.addExistingClaim(doublySignedClaim);
        },
      );
    });
  }

  /**
   * Retrieves the node Address from the NodeGraph
   * @param nodeId node ID of the target node
   * @returns Node Address of the target node
   */
  public async getNodeAddress(
    nodeId: NodeId,
  ): Promise<NodeAddress | undefined> {
    return (await this.nodeGraph.getNode(nodeId))?.address;
  }

  /**
   * Determines whether a node ID -> node address mapping exists in the NodeGraph
   * @param targetNodeId the node ID of the node to find
   * @returns true if the node exists in the table, false otherwise
   */
  public async knowsNode(targetNodeId: NodeId): Promise<boolean> {
    return (await this.nodeGraph.getNode(targetNodeId)) != null;
  }

  /**
   * Gets the specified bucket from the NodeGraph
   */
  public async getBucket(bucketIndex: number): Promise<NodeBucket | undefined> {
    return await this.nodeGraph.getBucket(bucketIndex);
  }

  /**
   * Adds a node to the node graph. This assumes that you have already authenticated the node
   * Updates the node if the node already exists
   * This operation is blocking by default - set `block` to false to make it non-blocking
   * @param nodeId - Id of the node we wish to add
   * @param nodeAddress - Expected address of the node we want to add
   * @param block - Flag for if the operation should block or utilize the async queue
   * @param force - Flag for if we want to add the node without authenticating or if the bucket is full.
   * This will drop the oldest node in favor of the new.
   * @param timeout Connection timeout timeout
   */
  @ready(new nodesErrors.ErrorNodeManagerNotRunning())
  public async setNode(
    nodeId: NodeId,
    nodeAddress: NodeAddress,
    block: boolean = true,
    force: boolean = false,
    timeout?: number,
  ): Promise<void> {
    // When adding a node we need to handle 3 cases
    // 1. The node already exists. We need to update it's last updated field
    // 2. The node doesn't exist and bucket has room.
    //  We need to add the node to the bucket
    // 3. The node doesn't exist and the bucket is full.
    //  We need to ping the oldest node. If the ping succeeds we need to update
    //  the lastUpdated of the oldest node and drop the new one. If the ping
    //  fails we delete the old node and add in the new one.
    const nodeData = await this.nodeGraph.getNode(nodeId);
    // If this is a new entry, check the bucket limit
    const [bucketIndex] = this.nodeGraph.bucketIndex(nodeId);
    const count = await this.nodeGraph.getBucketMetaProp(bucketIndex, 'count');
    if (nodeData != null || count < this.nodeGraph.nodeBucketLimit) {
      // Either already exists or has room in the bucket
      // We want to add or update the node
      await this.nodeGraph.setNode(nodeId, nodeAddress);
      // Updating the refreshBucket timer
      this.refreshBucketUpdateDeadline(bucketIndex);
    } else {
      // We want to add a node but the bucket is full
      // We need to ping the oldest node
      if (force) {
        // We just add the new node anyway without checking the old one
        const oldNodeId = (
          await this.nodeGraph.getOldestNode(bucketIndex, 1)
        ).pop()!;
        this.logger.debug(
          `Force was set, removing ${nodesUtils.encodeNodeId(
            oldNodeId,
          )} and adding ${nodesUtils.encodeNodeId(nodeId)}`,
        );
        await this.nodeGraph.unsetNode(oldNodeId);
        await this.nodeGraph.setNode(nodeId, nodeAddress);
        // Updating the refreshBucket timer
        this.refreshBucketUpdateDeadline(bucketIndex);
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
        );
      } else {
        this.logger.debug(
          `Bucket was full and blocking was false, adding ${nodesUtils.encodeNodeId(
            nodeId,
          )} to queue`,
        );
        // Re-attempt this later asynchronously by adding the the queue
        this.queue.push(() =>
          this.setNode(nodeId, nodeAddress, true, false, timeout),
        );
      }
    }
  }

  private async garbageCollectOldNode(
    bucketIndex: number,
    nodeId: NodeId,
    nodeAddress: NodeAddress,
    timeout?: number,
  ) {
    const oldestNodeIds = await this.nodeGraph.getOldestNode(bucketIndex, 3);
    // We want to concurrently ping the nodes
    const pingPromises = oldestNodeIds.map((nodeId) => {
      const doPing = async (): Promise<{
        nodeId: NodeId;
        success: boolean;
      }> => {
        // This needs to return nodeId and ping result
        const data = await this.nodeGraph.getNode(nodeId);
        if (data == null) return { nodeId, success: false };
        const timer = timeout != null ? timerStart(timeout) : undefined;
        const result = await this.pingNode(nodeId, nodeAddress, timer);
        return { nodeId, success: result };
      };
      return doPing();
    });
    const pingResults = await Promise.all(pingPromises);
    for (const { nodeId, success } of pingResults) {
      if (success) {
        // Ping succeeded, update the node
        this.logger.debug(
          `Ping succeeded for ${nodesUtils.encodeNodeId(nodeId)}`,
        );
        const node = (await this.nodeGraph.getNode(nodeId))!;
        await this.nodeGraph.setNode(nodeId, node.address);
        // Updating the refreshBucket timer
        this.refreshBucketUpdateDeadline(bucketIndex);
      } else {
        this.logger.debug(`Ping failed for ${nodesUtils.encodeNodeId(nodeId)}`);
        // Otherwise we remove the node
        await this.nodeGraph.unsetNode(nodeId);
      }
    }
    // Check if we now have room and add the new node
    const count = await this.nodeGraph.getBucketMetaProp(bucketIndex, 'count');
    if (count < this.nodeGraph.nodeBucketLimit) {
      this.logger.debug(`Bucket ${bucketIndex} now has room, adding new node`);
      await this.nodeGraph.setNode(nodeId, nodeAddress);
      // Updating the refreshBucket timer
      this.refreshBucketUpdateDeadline(bucketIndex);
    }
  }

  /**
   * Removes a node from the NodeGraph
   */
  public async unsetNode(nodeId: NodeId): Promise<void> {
    return await this.nodeGraph.unsetNode(nodeId);
  }

  // FIXME
  // /**
  //  * Gets all buckets from the NodeGraph
  //  */
  // public async getAllBuckets(): Promise<Array<NodeBucket>> {
  //   return await this.nodeGraph.getBuckets();
  // }

  // FIXME potentially confusing name, should we rename this to renewBuckets?
  /**
   * To be called on key renewal. Re-orders all nodes in all buckets with respect
   * to the new node ID.
   */
  public async refreshBuckets(): Promise<void> {
    throw Error('fixme');
    // Return await this.nodeGraph.refreshBuckets();
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

  // Refresh bucket activity timer methods

  private startRefreshBucketTimers() {
    // Setting initial bucket to refresh
    this.refreshBucketNext = 0;
    // Setting initial deadline
    this.refreshBucketTimerReset(this.refreshBucketTimerDefault);

    for (
      let bucketIndex = 0;
      bucketIndex < this.nodeGraph.nodeIdBits;
      bucketIndex++
    ) {
      const deadline = Date.now() + this.refreshBucketTimerDefault;
      this.refreshBucketDeadlineMap.set(bucketIndex, deadline);
    }
  }

  private async stopRefreshBucketTimers() {
    clearTimeout(this.refreshBucketTimer);
  }

  private refreshBucketTimerReset(timeout: number) {
    clearTimeout(this.refreshBucketTimer);
    this.refreshBucketTimer = setTimeout(() => {
      this.refreshBucketRefreshTimer();
    }, timeout);
  }

  public refreshBucketUpdateDeadline(bucketIndex: NodeBucketIndex) {
    // Update the map deadline
    this.refreshBucketDeadlineMap.set(
      bucketIndex,
      Date.now() + this.refreshBucketTimerDefault,
    );
    // If the bucket was pending a refresh we remove it
    this.refreshBucketQueueRemove(bucketIndex);
    if (bucketIndex === this.refreshBucketNext) {
      // Bucket is same as next bucket, this affects the timer
      this.refreshBucketRefreshTimer();
    }
  }

  private refreshBucketRefreshTimer() {
    // Getting new closest deadline
    let closestBucket = this.refreshBucketNext;
    let closestDeadline = Date.now() + this.refreshBucketTimerDefault;
    const now = Date.now();
    for (const [bucketIndex, deadline] of this.refreshBucketDeadlineMap) {
      // Skip any queued buckets marked by 0 deadline
      if (deadline === 0) continue;
      if (deadline <= now) {
        // Deadline for this has already passed, we add it to the queue
        this.refreshBucketQueueAdd(bucketIndex);
        continue;
      }
      if (deadline < closestDeadline) {
        closestBucket = bucketIndex;
        closestDeadline = deadline;
      }
    }
    // Working out time left
    const timeout = closestDeadline - Date.now();
    this.logger.debug(
      `Refreshing refreshBucket timer with new timeout ${timeout}`,
    );
    // Updating timer and next
    this.refreshBucketNext = closestBucket;
    this.refreshBucketTimerReset(timeout);
  }

  // Refresh bucket async queue methods

  public refreshBucketQueueAdd(bucketIndex: NodeBucketIndex) {
    this.logger.debug(`Adding bucket ${bucketIndex} to queue`);
    this.refreshBucketDeadlineMap.set(bucketIndex, 0);
    this.refreshBucketQueue.add(bucketIndex);
    this.refreshBucketQueueUnplug();
  }

  public refreshBucketQueueRemove(bucketIndex: NodeBucketIndex) {
    this.logger.debug(`Removing bucket ${bucketIndex} from queue`);
    this.refreshBucketQueue.delete(bucketIndex);
  }

  public async refreshBucketQueueDrained() {
    await this.refreshBucketQueueDrained_.p;
  }

  private async startRefreshBucketQueue(): Promise<void> {
    this.refreshBucketQueueRunning = true;
    this.refreshBucketQueuePlug();
    let iterator: IterableIterator<NodeBucketIndex> | undefined;
    this.refreshBucketQueueAbortController = new AbortController();
    const pace = async () => {
      // Wait for plug
      await this.refreshBucketQueuePlug_.p;
      if (iterator == null) {
        iterator = this.refreshBucketQueue[Symbol.iterator]();
      }
      return this.refreshBucketQueueRunning;
    };
    while (await pace()) {
      const bucketIndex: NodeBucketIndex = iterator?.next().value;
      if (bucketIndex == null) {
        // Iterator is empty, plug and continue
        iterator = undefined;
        this.refreshBucketQueuePlug();
        continue;
      }
      // Do the job
      this.logger.debug(
        `processing refreshBucket for bucket ${bucketIndex}, ${this.refreshBucketQueue.size} left in queue`,
      );
      try {
        await this.refreshBucket(bucketIndex, {
          signal: this.refreshBucketQueueAbortController.signal,
        });
      } catch (e) {
        if (e instanceof nodesErrors.ErrorNodeAborted) break;
        throw e;
      }
      // Remove from queue and update bucket deadline
      this.refreshBucketQueue.delete(bucketIndex);
      this.refreshBucketUpdateDeadline(bucketIndex);
    }
    this.logger.debug('startRefreshBucketQueue has ended');
  }

  private async stopRefreshBucketQueue(): Promise<void> {
    // Flag end and await queue finish
    this.refreshBucketQueueAbortController.abort();
    this.refreshBucketQueueRunning = false;
    this.refreshBucketQueueUnplug();
  }

  private refreshBucketQueuePlug() {
    this.refreshBucketQueuePlug_ = promise();
    this.refreshBucketQueueDrained_?.resolveP();
  }

  private refreshBucketQueueUnplug() {
    this.refreshBucketQueueDrained_ = promise();
    this.refreshBucketQueuePlug_?.resolveP();
  }
}

export default NodeManager;
