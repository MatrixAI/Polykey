import type { DB, DBTransaction } from '@matrixai/db';
import type NodeConnectionManager from './NodeConnectionManager';
import type NodeGraph from './NodeGraph';
import type KeyManager from '../keys/KeyManager';
import type { PublicKeyPem } from '../keys/types';
import type Sigchain from '../sigchain/Sigchain';
import type { ChainData, ChainDataEncoded } from '../sigchain/types';
import type { NodeId, NodeAddress, NodeBucket } from '../nodes/types';
import type { ClaimEncoded } from '../claims/types';
import Logger from '@matrixai/logger';
import * as nodesErrors from './errors';
import * as nodesUtils from './utils';
import * as validationUtils from '../validation/utils';
import * as utilsPB from '../proto/js/polykey/v1/utils/utils_pb';
import * as claimsErrors from '../claims/errors';
import * as networkErrors from '../network/errors';
import * as networkUtils from '../network/utils';
import * as sigchainUtils from '../sigchain/utils';
import * as claimsUtils from '../claims/utils';

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
   */
  public async pingNode(targetNodeId: NodeId): Promise<boolean> {
    const targetAddress: NodeAddress =
      await this.nodeConnectionManager.findNode(targetNodeId);
    try {
      // Attempt to open a connection via the forward proxy
      // i.e. no NodeConnection object created (no need for GRPCClient)
      await this.nodeConnectionManager.holePunchForward(
        targetNodeId,
        await networkUtils.resolveHost(targetAddress.host),
        targetAddress.port,
      );
    } catch (e) {
      // If the connection request times out, then return false
      if (e instanceof networkErrors.ErrorConnectionStart) {
        return false;
      }
      // Throw any other error back up the callstack
      throw e;
    }
    return true;
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
      return this.db.withTransactionF(async (tran) => {
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
    tran?: DBTransaction,
  ): Promise<NodeAddress | undefined> {
    return await this.nodeGraph.getNode(nodeId, tran);
  }

  /**
   * Determines whether a node ID -> node address mapping exists in the NodeGraph
   * @param targetNodeId the node ID of the node to find
   * @param tran
   * @returns true if the node exists in the table, false otherwise
   */
  public async knowsNode(
    targetNodeId: NodeId,
    tran?: DBTransaction,
  ): Promise<boolean> {
    return await this.nodeGraph.knowsNode(targetNodeId, tran);
  }

  /**
   * Gets the specified bucket from the NodeGraph
   */
  public async getBucket(
    bucketIndex: number,
    tran?: DBTransaction,
  ): Promise<NodeBucket | undefined> {
    return await this.nodeGraph.getBucket(bucketIndex, tran);
  }

  /**
   * Sets a node in the NodeGraph
   */
  public async setNode(
    nodeId: NodeId,
    nodeAddress: NodeAddress,
    tran?: DBTransaction,
  ): Promise<void> {
    return await this.nodeGraph.setNode(nodeId, nodeAddress, tran);
  }

  /**
   * Updates the node in the NodeGraph
   */
  public async updateNode(
    nodeId: NodeId,
    nodeAddress?: NodeAddress,
    tran?: DBTransaction,
  ): Promise<void> {
    return await this.nodeGraph.updateNode(nodeId, nodeAddress, tran);
  }

  /**
   * Removes a node from the NodeGraph
   */
  public async unsetNode(nodeId: NodeId, tran?: DBTransaction): Promise<void> {
    return await this.nodeGraph.unsetNode(nodeId, tran);
  }

  /**
   * Gets all buckets from the NodeGraph
   */
  public async getAllBuckets(tran?: DBTransaction): Promise<Array<NodeBucket>> {
    return await this.nodeGraph.getAllBuckets(tran);
  }

  /**
   * To be called on key renewal. Re-orders all nodes in all buckets with respect
   * to the new node ID.
   */
  public async refreshBuckets(tran?: DBTransaction): Promise<void> {
    return await this.nodeGraph.refreshBuckets(tran);
  }
}

export default NodeManager;
