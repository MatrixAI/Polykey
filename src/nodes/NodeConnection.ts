import type { NodeId, NodeData } from './types';
import type { Host, Port, ProxyConfig } from '../network/types';
import type { KeyManager } from '../keys';
import type { SignedNotification } from '../notifications/types';
import type { ChainDataEncoded } from '../sigchain/types';
import type { Certificate, PublicKey, PublicKeyPem } from '../keys/types';
import type { ClaimId, ClaimEncoded, ClaimIntermediary, ClaimIdString } from "../claims/types";

import Logger from '@matrixai/logger';
import * as nodesUtils from './utils';
import * as nodesErrors from './errors';
import * as claimsUtils from '../claims/utils';
import * as claimsErrors from '../claims/errors';
import * as keysUtils from '../keys/utils';
import * as vaultsUtils from '../vaults/utils';
import { NodeAddressMessage } from '../proto/js/Agent_pb';
import { agentPB, GRPCClientAgent } from '../agent';
import { ForwardProxy, utils as networkUtils } from '../network';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';

/**
 * Encapsulates the unidirectional client-side connection of one node to another.
 */
interface NodeConnection extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new nodesErrors.ErrorNodeConnectionNotStarted(),
  new nodesErrors.ErrorNodeConnectionDestroyed(),
)
class NodeConnection {
  protected logger: Logger;
  protected keyManager: KeyManager;

  // Node ID, host, and port of the target node at the end of this connection
  protected targetNodeId: NodeId;
  protected ingressHost: Host;
  protected ingressPort: Port;

  // Host and port of the initiating node (client) where the connection begins
  protected localHost: Host;
  protected localPort: Port;

  protected fwdProxy: ForwardProxy;
  protected proxyConfig: ProxyConfig;
  protected client: GRPCClientAgent;

  static async createNodeConnection({
    targetNodeId,
    targetHost,
    targetPort,
    forwardProxy,
    keyManager,
    logger,
  }: {
    targetNodeId: NodeId;
    targetHost: Host;
    targetPort: Port;
    forwardProxy: ForwardProxy;
    keyManager: KeyManager;
    logger?: Logger;
  }): Promise<NodeConnection> {
    const logger_ = logger ?? new Logger('NodeConnection');
    const proxyConfig_ = {
      host: forwardProxy.getProxyHost(),
      port: forwardProxy.getProxyPort(),
      authToken: forwardProxy.authToken,
    } as ProxyConfig;
    const client_ = await GRPCClientAgent.createGRPCClientAgent({
      nodeId: targetNodeId,
      host: targetHost,
      port: targetPort,
      proxyConfig: proxyConfig_,
      logger: logger ?? new Logger('NodeConnectionClient'),
    });
    logger_.info('Creating NodeConnection');
    const nodeConnection = new NodeConnection({
      forwardProxy,
      keyManager,
      logger: logger_,
      targetHost,
      targetNodeId,
      targetPort,
      proxyConfig: proxyConfig_,
      client: client_,
    });
    logger_.info('Created NodeConnection');
    return nodeConnection;
  }

  constructor({
    targetNodeId,
    targetHost,
    targetPort,
    forwardProxy,
    keyManager,
    logger,
    proxyConfig,
    client,
  }: {
    targetNodeId: NodeId;
    targetHost: Host;
    targetPort: Port;
    forwardProxy: ForwardProxy;
    keyManager: KeyManager;
    logger: Logger;
    proxyConfig: ProxyConfig;
    client: GRPCClientAgent;
  }) {
    this.logger = logger;
    this.targetNodeId = targetNodeId;
    this.ingressHost = targetHost;
    this.ingressPort = targetPort;
    this.fwdProxy = forwardProxy;
    this.keyManager = keyManager;
    this.proxyConfig = proxyConfig;
    this.client = client;
  }

  /**
   * Initialises and starts the connection (via the fwdProxy).
   *
   * @param brokerConnections map of all established broker connections
   * If not provided, it's assumed a direct connection can be made to the target
   * (i.e. without hole punching), as the broker nodes relay the hole punch message.
   */
  public async start({
    brokerConnections = new Map<NodeId, NodeConnection>(),
  }: {
    brokerConnections?: Map<NodeId, NodeConnection>;
  }) {
    this.logger.info('Starting NodeConnection');

    // 1. Get the egress port of the fwdProxy (used for hole punching)
    const egressAddress = networkUtils.buildAddress(
      this.fwdProxy.getEgressHost() as Host,
      this.fwdProxy.getEgressPort() as Port,
    );
    // Also need to sign this for authentication (i.e. from expected source)
    const signature = await this.keyManager.signWithRootKeyPair(
      Buffer.from(egressAddress),
    );
    // 2. Ask fwdProxy for connection to target (the revProxy of other node)
    // 3. Relay the egress port to the broker/s (such that they can inform the other node)
    // 4. Start sending hole-punching packets to other node (done in openConnection())
    // Done in parallel
    try {
      await Promise.all([
        this.fwdProxy.openConnection(
          this.targetNodeId,
          this.ingressHost,
          this.ingressPort,
        ),
        Array.from(brokerConnections, ([_, conn]) =>
          conn.sendHolePunchMessage(
            this.keyManager.getNodeId(),
            this.targetNodeId,
            egressAddress,
            signature,
          ),
        ),
      ]);
    } catch (e) {
      await this.stop();
      // If we catch an error, re-throw it to handle it.
      throw e;
    }
    // 5. When finished, you have a connection to other node
    // Then you can create/start the GRPCClient, and perform the request
    await this.client.start({});
    this.logger.info(
      `Started NodeConnection from ${this.keyManager.getNodeId()} to ${
        this.targetNodeId
      }`,
    );
  }

  public async stop() {
    await this.client.stop();
    await this.fwdProxy.closeConnection(this.ingressHost, this.ingressPort);
  }

  public async destroy() {
    this.logger.info('Destroyed NodeConnection');
  }

  public getClient() {
    return this.client;
  }

  /**
   * Get the root certificate chain (i.e. the entire chain) of the node at the
   * end of this connection.
   * Ordered from newest to oldest.
   */
  @ready(new nodesErrors.ErrorNodeConnectionNotStarted())
  public getRootCertChain(): Array<Certificate> {
    const connInfo = this.fwdProxy.getConnectionInfoByIngress(
      this.ingressHost,
      this.ingressPort,
    );
    if (connInfo == null) {
      throw new nodesErrors.ErrorNodeConnectionInfoNotExist();
    }
    return connInfo.certificates;
  }

  /**
   * Finds the public key of a corresponding node ID, from the certificate chain
   * of the node at the end of this connection.
   * Because a keynode's root key can be refreshed, its node ID can also change.
   * Sometimes these previous root keys are also still valid - these would be
   * found in the certificate chain.
   */
  @ready(new nodesErrors.ErrorNodeConnectionNotStarted())
  public getExpectedPublicKey(expectedNodeId: NodeId): PublicKeyPem | null {
    const certificates = this.getRootCertChain();
    let publicKey: PublicKeyPem | null = null;
    for (const cert of certificates) {
      if (networkUtils.certNodeId(cert) === expectedNodeId) {
        publicKey = keysUtils.publicKeyToPem(
          cert.publicKey as PublicKey,
        ) as PublicKeyPem;
      }
    }
    return publicKey;
  }

  /**
   * Performs a GRPC request to retrieve the closest nodes relative to the given
   * target node ID.
   * @param targetNodeId the node ID to find other nodes closest to it
   * @returns list of nodes and their IP/port that are closest to the target
   */
  @ready(new nodesErrors.ErrorNodeConnectionNotStarted())
  public async getClosestNodes(targetNodeId: NodeId): Promise<Array<NodeData>> {
    // Construct the message
    const nodeIdMessage = new agentPB.NodeIdMessage();
    nodeIdMessage.setNodeId(targetNodeId);
    // Send through client
    const response = await this.client.nodesClosestLocalNodesGet(nodeIdMessage);
    const nodes: Array<NodeData> = [];
    // Loop over each map element (from the returned response) and populate nodes
    response
      .getNodeTableMap()
      .forEach((address: NodeAddressMessage, nodeId: string) => {
        nodes.push({
          id: nodeId as NodeId,
          address: {
            ip: address.getIp() as Host,
            port: address.getPort() as Port,
          },
          distance: nodesUtils.calculateDistance(
            targetNodeId,
            nodeId as NodeId,
          ),
        });
      });
    return nodes;
  }

  /**
   * Performs a GRPC request to send a hole-punch message to the target. Used to
   * initially establish the NodeConnection from source to target.
   *
   * @param sourceNodeId node ID of the current node (i.e. the sender)
   * @param targetNodeId node ID of the target node to hole punch
   * @param egressAddress stringified address of `egressHost:egressPort`
   * @param signature signature to verify source node is sender (signature based
   * on egressAddress as message)
   */
  @ready(new nodesErrors.ErrorNodeConnectionNotStarted())
  public async sendHolePunchMessage(
    sourceNodeId: NodeId,
    targetNodeId: NodeId,
    egressAddress: string,
    signature: Buffer,
  ): Promise<void> {
    const relayMsg = new agentPB.RelayMessage();
    relayMsg.setSrcId(sourceNodeId);
    relayMsg.setTargetId(targetNodeId);
    relayMsg.setEgressAddress(egressAddress);
    relayMsg.setSignature(signature.toString());
    await this.client.nodesHolePunchMessageSend(relayMsg);
  }

  /**
   * Performs a GRPC request to send a notification to the target.
   */
  @ready(new nodesErrors.ErrorNodeConnectionNotStarted())
  public async sendNotification(message: SignedNotification): Promise<void> {
    const notificationMsg = new agentPB.NotificationMessage();
    notificationMsg.setContent(message);
    await this.client.notificationsSend(notificationMsg);
    return;
  }

  /**
   * Performs a GRPC request to retrieve the NodeInfo of the node at the end of
   * the connection.
   * @returns the reconstructed NodeInfo (containing UNVERIFIED links)
   */
  @ready(new nodesErrors.ErrorNodeConnectionNotStarted())
  public async getChainData(): Promise<ChainDataEncoded> {
    const chainData: ChainDataEncoded = {};
    const emptyMsg = new agentPB.EmptyMessage();
    const response = await this.client.nodesChainDataGet(emptyMsg);
    // Reconstruct each claim from the returned ChainDataMessage
    response
      .getChainDataMap()
      .forEach((claimMsg: agentPB.ClaimMessage, id: string) => {
        const claimId = id as ClaimIdString;
        // Reconstruct the signatures array
        const signatures: Array<{ signature: string; protected: string }> = [];
        for (const signatureData of claimMsg.getSignaturesList()) {
          signatures.push({
            signature: signatureData.getSignature(),
            protected: signatureData.getProtected(),
          });
        }
        // Add to the record of chain data, casting as expected ClaimEncoded
        chainData[claimId] = {
          signatures: signatures,
          payload: claimMsg.getPayload(),
        } as ClaimEncoded;
      });
    return chainData;
  }

  @ready(new nodesErrors.ErrorNodeConnectionNotStarted())
  public async claimNode(singlySignedClaim: ClaimIntermediary) {
    const genClaims = this.client.nodesCrossSignClaim();
    try {
      // 2. Set up the intermediary claim message (the singly signed claim) to send
      const crossSignMessage = claimsUtils.createCrossSignMessage({
        singlySignedClaim: singlySignedClaim,
      });
      await genClaims.write(crossSignMessage); // Get the generator here
      // 3. We expect to receieve our singly signed claim we sent to now be a
      // doubly signed claim (signed by the other node), as well as a singly
      // signed claim to be signed by us.
      const readStatus = await genClaims.read();
      // If nothing to read, end and destroy
      if (readStatus.done) {
        throw new claimsErrors.ErrorEmptyStream();
      }
      const receivedMessage = readStatus.value;
      const intermediaryClaimMessage = receivedMessage.getSinglySignedClaim();
      const doublySignedClaimMessage = receivedMessage.getDoublySignedClaim();
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
      const constructedDoublySignedClaim = claimsUtils.reconstructClaimEncoded(
        doublySignedClaimMessage,
      );
      // Verify the singly signed claim with the sender's public key
      const senderPublicKey = this.getExpectedPublicKey(this.targetNodeId);
      if (!senderPublicKey) {
        throw new nodesErrors.ErrorNodeConnectionPublicKeyNotFound();
      }
      const verifiedSingly = await claimsUtils.verifyIntermediaryClaimSignature(
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
      const doublySignedClaimResponse = await claimsUtils.signIntermediaryClaim(
        {
          claim: constructedIntermediaryClaim,
          privateKey: this.keyManager.getRootKeyPairPem().privateKey,
          signeeNodeId: this.keyManager.getNodeId(),
        },
      );
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

      return constructedDoublySignedClaim;
    } catch (e) {
      await genClaims.throw(e);
      throw e;
    }
  }

  /**
   * Retrieves all the vaults for a peers node
   */
  @ready(new nodesErrors.ErrorNodeConnectionNotStarted())
  public async scanVaults(): Promise<Array<string>> {
    // Create the handler for git to scan from
    const gitRequest = await vaultsUtils.constructGitHandler(
      this.client,
      this.keyManager.getNodeId(),
    );
    return await gitRequest.scanVaults();
  }
}

export default NodeConnection;
