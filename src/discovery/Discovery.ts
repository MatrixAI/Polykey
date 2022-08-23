import type { DB, LevelPath } from '@matrixai/db';
import type { DiscoveryQueueId, DiscoveryQueueIdGenerator } from './types';
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
import Logger from '@matrixai/logger';
import {
  CreateDestroyStartStop,
  ready,
  status,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import { IdInternal } from '@matrixai/id';
import * as idUtils from '@matrixai/id/dist/utils';
import * as discoveryUtils from './utils';
import * as discoveryErrors from './errors';
import * as nodesErrors from '../nodes/errors';
import * as networkErrors from '../network/errors';
import * as gestaltsUtils from '../gestalts/utils';
import * as claimsUtils from '../claims/utils';
import * as nodesUtils from '../nodes/utils';
import { never, promise } from '../utils';

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
    logger = new Logger(this.name),
    fresh = false,
  }: {
    db: DB;
    keyManager: KeyManager;
    gestaltGraph: GestaltGraph;
    identitiesManager: IdentitiesManager;
    nodeManager: NodeManager;
    sigchain: Sigchain;
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

  protected discoveryDbPath: LevelPath = [this.constructor.name];
  protected discoveryQueueDbPath: LevelPath = [this.constructor.name, 'queue'];
  protected discoveryQueueIdGenerator: DiscoveryQueueIdGenerator;
  protected visitedVertices = new Set<GestaltKey>();
  protected discoveryProcess: Promise<void>;
  protected queuePlug = promise<void>();
  protected queueDrained = promise<void>();

  public constructor({
    keyManager,
    db,
    gestaltGraph,
    identitiesManager,
    nodeManager,
    sigchain,
    logger,
  }: {
    db: DB;
    keyManager: KeyManager;
    gestaltGraph: GestaltGraph;
    identitiesManager: IdentitiesManager;
    nodeManager: NodeManager;
    sigchain: Sigchain;
    logger: Logger;
  }) {
    this.db = db;
    this.keyManager = keyManager;
    this.gestaltGraph = gestaltGraph;
    this.identitiesManager = identitiesManager;
    this.nodeManager = nodeManager;
    this.sigchain = sigchain;
    this.logger = logger;
  }

  public async start({
    fresh = false,
  }: {
    fresh?: boolean;
  } = {}): Promise<void> {
    this.logger.info(`Starting ${this.constructor.name}`);
    if (fresh) {
      await this.db.clear(this.discoveryDbPath);
    }
    // Getting latest ID and creating ID generator
    let latestId: DiscoveryQueueId | undefined;
    const keyIterator = this.db.iterator(this.discoveryQueueDbPath, {
      limit: 1,
      reverse: true,
      values: false,
    });
    for await (const [keyPath] of keyIterator) {
      const key = keyPath[0] as Buffer;
      latestId = IdInternal.fromBuffer<DiscoveryQueueId>(key);
    }
    this.discoveryQueueIdGenerator =
      discoveryUtils.createDiscoveryQueueIdGenerator(latestId);
    // Starting the queue
    this.discoveryProcess = this.setupDiscoveryQueue();
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop(): Promise<void> {
    this.logger.info(`Stopping ${this.constructor.name}`);
    this.queuePlug.resolveP();
    await this.discoveryProcess;
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy(): Promise<void> {
    this.logger.info(`Destroying ${this.constructor.name}`);
    await this.db.clear(this.discoveryDbPath);
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  /**
   * Queues a node for discovery. Internally calls `pushKeyToDiscoveryQueue`.
   */
  @ready(new discoveryErrors.ErrorDiscoveryNotRunning())
  public async queueDiscoveryByNode(nodeId: NodeId): Promise<void> {
    const nodeKey = gestaltsUtils.keyFromNode(nodeId);
    await this.pushKeyToDiscoveryQueue(nodeKey);
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
    await this.pushKeyToDiscoveryQueue(identityKey);
  }

  /**
   * Async function for processing the Discovery Queue
   */
  public async setupDiscoveryQueue(): Promise<void> {
    this.logger.debug('Setting up DiscoveryQueue');
    while (true) {
      // Checking and waiting for items to process
      if (await this.queueIsEmpty()) {
        if (!(this[status] === 'stopping')) {
          this.queuePlug = promise();
          this.queueDrained.resolveP();
        }
        this.logger.debug('DiscoveryQueue is pausing');
        await this.queuePlug.p;
        this.queueDrained = promise();
      }
      if (this[status] === 'stopping') {
        this.logger.debug('DiscoveryQueue is ending');
        break;
      }

      // Processing queue
      this.logger.debug('DiscoveryQueue is processing');
      for await (const [keyPath, vertex] of this.db.iterator<GestaltKey>(
        this.discoveryQueueDbPath,
        { valueAsBuffer: false },
      )) {
        const key = keyPath[0] as Buffer;
        const vertexId = IdInternal.fromBuffer<DiscoveryQueueId>(key);
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
                const vertexChainDataEncoded =
                  await this.sigchain.getChainData();
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
                  vertexChainData = await this.nodeManager.requestChainData(
                    nodeId,
                  );
                } catch (e) {
                  this.visitedVertices.add(vertex);
                  await this.removeKeyFromDiscoveryQueue(vertexId);
                  this.logger.error(
                    `Failed to discover ${vertexGId.nodeId} - ${e.toString()}`,
                  );
                  continue;
                }
              }
              // TODO: for now, the chain data is treated as a 'disjoint' set of
              // cryptolink claims from a node to another node/identity
              // That is, we have no notion of revocations, or multiple claims to the
              // same node/identity. Thus, we simply iterate over this chain of
              // cryptolinks.
              // Now have the NodeInfo of this vertex
              const vertexNodeInfo: NodeInfo = {
                id: nodesUtils.encodeNodeId(nodeId),
                chain: vertexChainData,
              };
              // Iterate over each of the claims in the chain (already verified)
              // TODO: because we're iterating over keys in a record, I don't believe
              // that this will iterate in lexicographical order of keys. For now,
              // this doesn't matter though (because of the previous comment).
              for (const claimId in vertexChainData) {
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
                    linkedVertexChainData =
                      await this.nodeManager.requestChainData(
                        linkedVertexNodeId,
                      );
                  } catch (e) {
                    if (
                      e instanceof nodesErrors.ErrorNodeConnectionDestroyed ||
                      e instanceof nodesErrors.ErrorNodeConnectionTimeout
                    ) {
                      if (!this.visitedVertices.has(linkedVertexGK)) {
                        await this.pushKeyToDiscoveryQueue(linkedVertexGK);
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
                    await this.pushKeyToDiscoveryQueue(linkedVertexGK);
                  }
                }
                // Else the claim is to an identity
                if (claim.payload.data.type === 'identity') {
                  // Attempt to get the identity info on the identity provider
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
                    await this.pushKeyToDiscoveryQueue(linkedIdentityGK);
                  }
                }
              }
            }
            break;
          case 'identity':
            {
              // If the next vertex is an identity, perform a social discovery
              // Firstly get the identity info of this identity
              const vertexIdentityInfo = await this.getIdentityInfo(
                vertexGId.providerId,
                vertexGId.identityId,
              );
              // If we don't have identity info, simply skip this vertex
              if (vertexIdentityInfo == null) {
                continue;
              }
              // Link the identity with each node from its claims on the provider
              // Iterate over each of the claims
              for (const id in vertexIdentityInfo.claims) {
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
                  linkedVertexChainData =
                    await this.nodeManager.requestChainData(linkedVertexNodeId);
                } catch (e) {
                  if (
                    e instanceof nodesErrors.ErrorNodeConnectionDestroyed ||
                    e instanceof nodesErrors.ErrorNodeConnectionTimeout ||
                    e instanceof networkErrors.ErrorConnectionNotRunning
                  ) {
                    if (!this.visitedVertices.has(linkedVertexGK)) {
                      await this.pushKeyToDiscoveryQueue(linkedVertexGK);
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
                  await this.pushKeyToDiscoveryQueue(linkedVertexGK);
                }
              }
            }
            break;
          default:
            never();
        }
        this.visitedVertices.add(vertex);
        await this.removeKeyFromDiscoveryQueue(vertexId);
      }
    }
  }

  /**
   * Will resolve once the queue has drained
   */
  public async waitForDrained(): Promise<void> {
    await this.queueDrained.p;
  }

  /**
   * Simple check for whether the Discovery Queue is empty.
   */
  protected async queueIsEmpty(): Promise<boolean> {
    let nextDiscoveryQueueId: DiscoveryQueueId | undefined;
    const keyIterator = this.db.iterator(this.discoveryQueueDbPath, {
      limit: 1,
      values: false,
    });
    for await (const [keyPath] of keyIterator) {
      const key = keyPath[0] as Buffer;
      nextDiscoveryQueueId = IdInternal.fromBuffer<DiscoveryQueueId>(key);
    }
    return nextDiscoveryQueueId == null;
  }

  /**
   * Push a Gestalt Key to the Discovery Queue. This process also unlocks
   * the queue if it was previously locked (due to being empty)
   * Will only add the Key if it does not already exist in the queue
   */
  protected async pushKeyToDiscoveryQueue(
    gestaltKey: GestaltKey,
  ): Promise<void> {
    await this.db.withTransactionF(async (tran) => {
      const valueIterator = tran.iterator<GestaltKey>(
        this.discoveryQueueDbPath,
        { valueAsBuffer: false },
      );
      for await (const [, value] of valueIterator) {
        if (value === gestaltKey) {
          return;
        }
      }
      const discoveryQueueId = this.discoveryQueueIdGenerator();
      await tran.put(
        [...this.discoveryQueueDbPath, idUtils.toBuffer(discoveryQueueId)],
        gestaltKey,
      );
    });
    this.queuePlug.resolveP();
  }

  /**
   * Remove a Gestalt Key from the Discovery Queue by its QueueId. This should
   * only be done after a Key has been discovered in order to remove it from
   * the beginning of the queue.
   */
  protected async removeKeyFromDiscoveryQueue(
    keyId: DiscoveryQueueId,
  ): Promise<void> {
    await this.db.del([...this.discoveryQueueDbPath, idUtils.toBuffer(keyId)]);
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
    if (authIdentityIds === [] || authIdentityIds[0] == null) {
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
