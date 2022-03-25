import type { DB } from '@matrixai/db';
import type NodeConnectionManager from './NodeConnectionManager';
import type NodeGraph from './NodeGraph';
import type KeyManager from '../keys/KeyManager';
import type { PublicKeyPem } from '../keys/types';
import type Sigchain from '../sigchain/Sigchain';
import type { ChainData, ChainDataEncoded } from '../sigchain/types';
import type { NodeId, NodeAddress, NodeBucket } from '../nodes/types';
import type { ClaimEncoded } from '../claims/types';
import type { Timer } from '../types';
import Logger from '@matrixai/logger';
import { getUnixtime } from '@/utils';
import * as nodesErrors from './errors';
import * as nodesUtils from './utils';
import { utils as validationUtils } from '../validation';
import * as utilsPB from '../proto/js/polykey/v1/utils/utils_pb';
import * as claimsErrors from '../claims/errors';
import * as networkErrors from '../network/errors';
import * as networkUtils from '../network/utils';
import * as sigchainUtils from '../sigchain/utils';
import * as claimsUtils from '../claims/utils';
import { NodeData } from '../nodes/types';

class NodeManager {
  protected db: DB;
  protected logger: Logger;
  protected sigchain: Sigchain;
  protected keyManager: KeyManager;
  protected nodeConnectionManager: NodeConnectionManager;
  protected nodeGraph: NodeGraph;

  constructor({
    db,
    keyManager,
    sigchain,
    nodeConnectionManager,
    nodeGraph,
    logger,
  }: {
    db: DB;
    keyManager: KeyManager;
    sigchain: Sigchain;
    nodeConnectionManager: NodeConnectionManager;
    nodeGraph: NodeGraph;
    logger?: Logger;
  }) {
    this.logger = logger ?? new Logger(this.constructor.name);
    this.db = db;
    this.keyManager = keyManager;
    this.sigchain = sigchain;
    this.nodeConnectionManager = nodeConnectionManager;
    this.nodeGraph = nodeGraph;
  }

  /**
   * Determines whether a node in the Polykey network is online.
   * @return true if online, false if offline
   * @param nodeId - NodeId of the node we're pinging
   * @param address - Optional Host and Port we want to ping
   * @param timeout - Optional timeout
   */
  public async pingNode(
    nodeId: NodeId,
    address?: NodeAddress,
    timeout?: number,
  ): Promise<boolean> {
    return this.nodeConnectionManager.pingNode(nodeId, address, timeout);
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
   * Adds a node to the node graph.
   * Updates the node if the node already exists.
   *
   */
  public async setNode(
    nodeId: NodeId,
    nodeAddress: NodeAddress,
    force = false,
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
    } else {
      // We want to add a node but the bucket is full
      // We need to ping the oldest node
      const oldestNodeId = (await this.nodeGraph.getOldestNode(bucketIndex))!;
      if ((await this.pingNode(oldestNodeId)) && !force) {
        // The node responded, we need to update it's info and drop the new node
        const oldestNode = (await this.nodeGraph.getNode(oldestNodeId))!;
        await this.nodeGraph.setNode(oldestNodeId, oldestNode.address);
      } else {
        // The node could not be contacted or force was set,
        // we drop it in favor of the new node
        await this.nodeGraph.unsetNode(oldestNodeId);
        await this.nodeGraph.setNode(nodeId, nodeAddress);
      }
    }
  }

  // FIXME
  // /**
  //  * Updates the node in the NodeGraph
  //  */
  // public async updateNode(
  //   nodeId: NodeId,
  //   nodeAddress?: NodeAddress,
  // ): Promise<void> {
  //   return await this.nodeGraph.updateNode(nodeId, nodeAddress);
  // }

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

  // FIXME
  /**
   * To be called on key renewal. Re-orders all nodes in all buckets with respect
   * to the new node ID.
   */
  public async refreshBuckets(): Promise<void> {
    throw Error('fixme');
    // Return await this.nodeGraph.refreshBuckets();
  }
}

export default NodeManager;
