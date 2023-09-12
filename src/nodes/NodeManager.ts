import type { DB, DBTransaction } from '@matrixai/db';
import type NodeConnectionManager from './NodeConnectionManager';
import type NodeGraph from './NodeGraph';
import type KeyRing from '../keys/KeyRing';
import type CertManager from '../keys/CertManager';
import type Sigchain from '../sigchain/Sigchain';
import type {
  NodeId,
  NodeAddress,
  NodeBucket,
  NodeBucketIndex,
  NodeData,
} from './types';
import type {
  Claim,
  ClaimId,
  ClaimIdEncoded,
  SignedClaim,
} from '../claims/types';
import type TaskManager from '../tasks/TaskManager';
import type GestaltGraph from '../gestalts/GestaltGraph';
import type { TaskHandler, TaskHandlerId, Task } from '../tasks/types';
import type { ContextTimed } from '@matrixai/contexts';
import type { PromiseCancellable } from '@matrixai/async-cancellable';
import type { ContextTimedInput } from '@matrixai/contexts/dist/types';
import type { Host, Port } from '../network/types';
import type { SignedTokenEncoded } from '../tokens/types';
import type { ClaimLinkNode } from '../claims/payloads/index';
import type { AgentClaimMessage } from '../agent/handlers/types';
import type {
  AgentRPCRequestParams,
  AgentRPCResponseResult,
} from '../agent/types';
import Logger from '@matrixai/logger';
import { StartStop, ready } from '@matrixai/async-init/dist/StartStop';
import { Semaphore, Lock } from '@matrixai/async-locks';
import { IdInternal } from '@matrixai/id';
import { timedCancellable, context } from '@matrixai/contexts/dist/decorators';
import * as nodesErrors from './errors';
import * as nodesUtils from './utils';
import * as nodesEvents from './events';
import * as claimsUtils from '../claims/utils';
import * as tasksErrors from '../tasks/errors';
import * as claimsErrors from '../claims/errors';
import * as keysUtils from '../keys/utils';
import * as keysEvents from '../keys/events';
import { never, promise } from '../utils/utils';
import {
  decodeClaimId,
  encodeClaimId,
  parseSignedClaim,
} from '../claims/utils';
import Token from '../tokens/Token';

const abortEphemeralTaskReason = Symbol('abort ephemeral task reason');
const abortSingletonTaskReason = Symbol('abort singleton task reason');

interface NodeManager extends StartStop {}
@StartStop()
class NodeManager {
  protected db: DB;
  protected logger: Logger;
  protected sigchain: Sigchain;
  protected keyRing: KeyRing;
  protected certManager?: CertManager;
  protected nodeConnectionManager: NodeConnectionManager;
  protected nodeGraph: NodeGraph;
  protected taskManager: TaskManager;
  protected gestaltGraph: GestaltGraph;
  protected refreshBucketDelay: number;
  protected refreshBucketDelayJitter: number;
  protected retrySeedConnectionsDelay: number;
  protected pendingNodes: Map<number, Map<string, NodeAddress>> = new Map();

  /**
   * Time used to establish `NodeConnection`
   */
  public readonly connectionConnectTimeoutTime: number;

  public readonly basePath = this.constructor.name;
  protected refreshBucketHandler: TaskHandler = async (
    ctx,
    _taskInfo,
    bucketIndex,
  ) => {
    await this.refreshBucket(
      bucketIndex,
      this.connectionConnectTimeoutTime,
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
      this.connectionConnectTimeoutTime,
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
      .reduce((a, b) => a || b, false);
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

  protected handleNodeConnectionEvent = (
    e: nodesEvents.EventNodeConnectionManagerConnection,
  ) => {
    void this.setNode(
      e.detail.remoteNodeId,
      {
        host: e.detail.remoteHost,
        port: e.detail.remotePort,
      },
      false,
      false,
    );
  };

  protected handleEventsCertManagerCertChange = async (
    evt: keysEvents.EventsCertManagerCertChange,
  ) => {
    await this.resetBuckets();
  };

  constructor({
    db,
    keyRing,
    sigchain,
    nodeConnectionManager,
    nodeGraph,
    taskManager,
    gestaltGraph,
    certManager,
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
    gestaltGraph: GestaltGraph;
    certManager?: CertManager;
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
    this.gestaltGraph = gestaltGraph;
    this.certManager = certManager;
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
    // Add handling for connections
    this.nodeConnectionManager.addEventListener(
      nodesEvents.EventNodeConnectionManagerConnection.name,
      this.handleNodeConnectionEvent,
    );
    this.certManager?.addEventListener(
      keysEvents.EventsCertManagerCertChange.name,
      this.handleEventsCertManagerCertChange,
    );
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop() {
    this.logger.info(`Stopping ${this.constructor.name}`);
    // Remove handling for connections
    this.certManager?.removeEventListener(
      keysEvents.EventsCertManagerCertChange.name,
      this.handleEventsCertManagerCertChange,
    );
    this.nodeConnectionManager.removeEventListener(
      nodesEvents.EventNodeConnectionManagerConnection.name,
      this.handleNodeConnectionEvent,
    );
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
    ctx?: Partial<ContextTimedInput>,
  ): PromiseCancellable<boolean>;
  @timedCancellable(
    true,
    (nodeManager: NodeManager) => nodeManager.connectionConnectTimeoutTime,
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
        this.connectionConnectTimeoutTime,
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
   * @param targetNodeId Id of the node to connect request the chain data of.
   * @param claimId If set then we get the claims newer that this claim Id.
   * @param ctx
   */
  // FIXME: this should be a generator/stream
  public requestChainData(
    targetNodeId: NodeId,
    claimId?: ClaimId,
    ctx?: Partial<ContextTimed>,
  ): PromiseCancellable<Record<ClaimId, SignedClaim>>;
  @timedCancellable(true)
  public async requestChainData(
    targetNodeId: NodeId,
    claimId: ClaimId | undefined,
    @context ctx: ContextTimed,
  ): Promise<Record<ClaimId, SignedClaim>> {
    // Verify the node's chain with its own public key
    return this.nodeConnectionManager.withConnF(
      targetNodeId,
      async (connection) => {
        const claims: Record<ClaimId, SignedClaim> = {};
        const client = connection.getClient();
        for await (const agentClaim of await client.methods.nodesClaimsGet({
          claimIdEncoded:
            claimId != null ? encodeClaimId(claimId) : ('' as ClaimIdEncoded),
        })) {
          if (ctx.signal.aborted) throw ctx.signal.reason;
          // Need to re-construct each claim
          const claimId: ClaimId = decodeClaimId(agentClaim.claimIdEncoded)!;
          const signedClaimEncoded = agentClaim.signedTokenEncoded;
          const signedClaim = parseSignedClaim(signedClaimEncoded);
          // Verifying the claim
          const issPublicKey = keysUtils.publicKeyFromNodeId(
            nodesUtils.decodeNodeId(signedClaim.payload.iss)!,
          );
          const subPublicKey =
            signedClaim.payload.typ === 'node'
              ? keysUtils.publicKeyFromNodeId(
                  nodesUtils.decodeNodeId(signedClaim.payload.iss)!,
                )
              : null;
          const token = Token.fromSigned(signedClaim);
          if (!token.verifyWithPublicKey(issPublicKey)) {
            this.logger.warn('Failed to verify issuing node');
            continue;
          }
          if (
            subPublicKey != null &&
            !token.verifyWithPublicKey(subPublicKey)
          ) {
            this.logger.warn('Failed to verify subject node');
            continue;
          }
          claims[claimId] = signedClaim;
        }
        return claims;
      },
      ctx,
    );
  }

  /**
   * Call this function upon receiving a "claim node request" notification from
   * another node.
   */
  public async claimNode(
    targetNodeId: NodeId,
    tran?: DBTransaction,
    ctx?: ContextTimed, // FIXME, this needs to be a timed cancellable
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) => {
        return this.claimNode(targetNodeId, tran);
      });
    }
    const [, claim] = await this.sigchain.addClaim(
      {
        typ: 'ClaimLinkNode',
        iss: nodesUtils.encodeNodeId(this.keyRing.getNodeId()),
        sub: nodesUtils.encodeNodeId(targetNodeId),
      },
      undefined,
      async (token) => {
        return this.nodeConnectionManager.withConnF(
          targetNodeId,
          async (conn) => {
            // 2. create the agentClaim message to send
            const halfSignedClaim = token.toSigned();
            const halfSignedClaimEncoded =
              claimsUtils.generateSignedClaim(halfSignedClaim);
            const client = conn.getClient();
            const stream = await client.methods.nodesCrossSignClaim();
            const writer = stream.writable.getWriter();
            const reader = stream.readable.getReader();
            let fullySignedToken: Token<Claim>;
            try {
              await writer.write({
                signedTokenEncoded: halfSignedClaimEncoded,
              });
              // 3. We expect to receive the doubly signed claim
              const readStatus = await reader.read();
              if (readStatus.done) {
                throw new claimsErrors.ErrorEmptyStream();
              }
              const receivedClaim = readStatus.value;
              // We need to re-construct the token from the message
              const signedClaim = parseSignedClaim(
                receivedClaim.signedTokenEncoded,
              );
              fullySignedToken = Token.fromSigned(signedClaim);
              // Check that the signatures are correct
              const targetNodePublicKey =
                keysUtils.publicKeyFromNodeId(targetNodeId);
              if (
                !fullySignedToken.verifyWithPublicKey(
                  this.keyRing.keyPair.publicKey,
                ) ||
                !fullySignedToken.verifyWithPublicKey(targetNodePublicKey)
              ) {
                throw new claimsErrors.ErrorDoublySignedClaimVerificationFailed();
              }

              // Next stage is to process the claim for the other node
              const readStatus2 = await reader.read();
              if (readStatus2.done) {
                throw new claimsErrors.ErrorEmptyStream();
              }
              const receivedClaimRemote = readStatus2.value;
              // We need to re-construct the token from the message
              const signedClaimRemote = parseSignedClaim(
                receivedClaimRemote.signedTokenEncoded,
              );
              // This is a singly signed claim,
              // we want to verify it before signing and sending back
              const signedTokenRemote = Token.fromSigned(signedClaimRemote);
              if (!signedTokenRemote.verifyWithPublicKey(targetNodePublicKey)) {
                throw new claimsErrors.ErrorSinglySignedClaimVerificationFailed();
              }
              signedTokenRemote.signWithPrivateKey(this.keyRing.keyPair);
              // 4. X <- responds with double signing the X signed claim <- Y
              const agentClaimedMessageRemote = claimsUtils.generateSignedClaim(
                signedTokenRemote.toSigned(),
              );
              await writer.write({
                signedTokenEncoded: agentClaimedMessageRemote,
              });

              // Check the stream is closed (should be closed by other side)
              const finalResponse = await reader.read();
              if (finalResponse.done != null) {
                await writer.close();
              }
            } catch (e) {
              await writer.abort(e);
              throw e;
            }
            return fullySignedToken;
          },
          ctx,
        );
      },
      tran,
    );
    // With the claim created we want to add it to the gestalt graph
    const issNodeInfo = {
      nodeId: this.keyRing.getNodeId(),
    };
    const subNodeInfo = {
      nodeId: targetNodeId,
    };
    await this.gestaltGraph.linkNodeAndNode(issNodeInfo, subNodeInfo, {
      claim: claim as SignedClaim<ClaimLinkNode>,
      meta: {},
    });
  }

  // TODO: make cancellable
  public async *handleClaimNode(
    requestingNodeId: NodeId,
    input: AsyncIterableIterator<AgentRPCRequestParams<AgentClaimMessage>>,
    tran?: DBTransaction,
  ): AsyncGenerator<AgentRPCResponseResult<AgentClaimMessage>> {
    if (tran == null) {
      return yield* this.db.withTransactionG((tran) =>
        this.handleClaimNode(requestingNodeId, input, tran),
      );
    }
    const readStatus = await input.next();
    // If nothing to read, end and destroy
    if (readStatus.done) {
      throw new claimsErrors.ErrorEmptyStream();
    }
    const receivedMessage = readStatus.value;
    const signedClaim = parseSignedClaim(receivedMessage.signedTokenEncoded);
    const token = Token.fromSigned(signedClaim);
    // Verify if the token is signed
    if (
      !token.verifyWithPublicKey(
        keysUtils.publicKeyFromNodeId(requestingNodeId),
      )
    ) {
      throw new claimsErrors.ErrorSinglySignedClaimVerificationFailed();
    }
    // If verified, add your own signature to the received claim
    token.signWithPrivateKey(this.keyRing.keyPair);
    // Return the signed claim
    const doublySignedClaim = token.toSigned();
    const halfSignedClaimEncoded =
      claimsUtils.generateSignedClaim(doublySignedClaim);
    yield {
      signedTokenEncoded: halfSignedClaimEncoded,
    };

    // Now we want to send our own claim signed
    const halfSignedClaimProm = promise<SignedTokenEncoded>();
    const claimProm = this.sigchain.addClaim(
      {
        typ: 'ClaimLinkNode',
        iss: nodesUtils.encodeNodeId(requestingNodeId),
        sub: nodesUtils.encodeNodeId(this.keyRing.getNodeId()),
      },
      undefined,
      async (token) => {
        const halfSignedClaim = token.toSigned();
        const halfSignedClaimEncoded =
          claimsUtils.generateSignedClaim(halfSignedClaim);
        halfSignedClaimProm.resolveP(halfSignedClaimEncoded);
        const readStatus = await input.next();
        if (readStatus.done) {
          throw new claimsErrors.ErrorEmptyStream();
        }
        const receivedClaim = readStatus.value;
        // We need to re-construct the token from the message
        const signedClaim = parseSignedClaim(receivedClaim.signedTokenEncoded);
        const fullySignedToken = Token.fromSigned(signedClaim);
        // Check that the signatures are correct
        const requestingNodePublicKey =
          keysUtils.publicKeyFromNodeId(requestingNodeId);
        if (
          !fullySignedToken.verifyWithPublicKey(
            this.keyRing.keyPair.publicKey,
          ) ||
          !fullySignedToken.verifyWithPublicKey(requestingNodePublicKey)
        ) {
          throw new claimsErrors.ErrorDoublySignedClaimVerificationFailed();
        }
        // Ending the stream
        return fullySignedToken;
      },
    );
    yield {
      signedTokenEncoded: await halfSignedClaimProm.p,
    };
    const [, claim] = await claimProm;
    // With the claim created we want to add it to the gestalt graph
    const issNodeInfo = {
      nodeId: requestingNodeId,
    };
    const subNodeInfo = {
      nodeId: this.keyRing.getNodeId(),
    };
    await this.gestaltGraph.linkNodeAndNode(issNodeInfo, subNodeInfo, {
      claim: claim as SignedClaim<ClaimLinkNode>,
      meta: {},
    });
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
   * @param pingTimeoutTime - Timeout for each ping operation during garbage collection.
   * @param ctx
   * @param tran
   */
  public setNode(
    nodeId: NodeId,
    nodeAddress: NodeAddress,
    block?: boolean,
    force?: boolean,
    pingTimeoutTime?: number,
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
    pingTimeoutTime: number = this.connectionConnectTimeoutTime,
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
        this.setNode(
          nodeId,
          nodeAddress,
          block,
          force,
          pingTimeoutTime,
          ctx,
          tran,
        ),
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
        pingTimeoutTime,
        ctx,
        tran,
      );
    }
  }

  protected garbageCollectBucket(
    bucketIndex: number,
    pingTimeoutTime?: number,
    ctx?: Partial<ContextTimed>,
    tran?: DBTransaction,
  ): PromiseCancellable<void>;
  @timedCancellable(true)
  protected async garbageCollectBucket(
    bucketIndex: number,
    pingTimeoutTime: number = this.connectionConnectTimeoutTime,
    @context ctx: ContextTimed,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.garbageCollectBucket(bucketIndex, pingTimeoutTime, ctx, tran),
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
            timer: pingTimeoutTime,
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
    pingTimeoutTime: number = this.connectionConnectTimeoutTime,
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
      await this.garbageCollectBucket(bucketIndex, pingTimeoutTime, ctx, tran);
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
   * Connections during the search will share node information with other
   * nodes.
   * @param bucketIndex
   * @param pingTimeoutTime
   * @param ctx
   */
  public refreshBucket(
    bucketIndex: number,
    pingTimeoutTime?: number,
    ctx?: Partial<ContextTimed>,
  ): PromiseCancellable<void>;
  @timedCancellable(true)
  public async refreshBucket(
    bucketIndex: NodeBucketIndex,
    pingTimeoutTime: number | undefined,
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
      pingTimeoutTime,
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
   * Establish a connection to each node before adding it
   * By default this operation is blocking, set `block` to `false` to make it
   * non-blocking
   */
  public syncNodeGraph(
    block?: boolean,
    pingTimeoutTime?: number,
    ctx?: Partial<ContextTimedInput>,
  ): PromiseCancellable<void>;
  @ready(new nodesErrors.ErrorNodeManagerNotRunning())
  @timedCancellable(true)
  public async syncNodeGraph(
    block: boolean = true,
    pingTimeoutTime: number | undefined,
    @context ctx: ContextTimed,
  ): Promise<void> {
    const logger = this.logger.getChild('syncNodeGraph');
    logger.info('Syncing nodeGraph');
    // Getting the seed node connection information
    const seedNodes = this.nodeConnectionManager.getSeedNodes();
    if (seedNodes.length === 0) {
      logger.debug(`No seed nodes provided, skipping discovery`);
      return;
    }
    const addresses = await Promise.all(
      await this.db.withTransactionF(async (tran) =>
        seedNodes.map(
          async (seedNode) =>
            (await this.nodeGraph.getNode(seedNode, tran))?.address,
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
    const connections = await this.nodeConnectionManager.getMultiConnection(
      seedNodes,
      filteredAddresses,
      pingTimeoutTime,
      { signal: ctx.signal },
    );
    logger.debug(`Multi-connection established for`);
    connections.forEach((nodeId) => {
      logger.debug(`${nodesUtils.encodeNodeId(nodeId)}`);
    });
    if (connections.length === 0) {
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
    for (const nodeId of connections) {
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
          deadline: pingTimeoutTime,
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
