import type { NodeId, NodeData } from './types';
import type { Host, Hostname, Port, ProxyConfig } from '../network/types';
import type { KeyManager } from '../keys';
import type { SignedNotification } from '../notifications/types';
import type { ChainDataEncoded } from '../sigchain/types';
import type { Certificate, PublicKey, PublicKeyPem } from '../keys/types';
import type {
  ClaimEncoded,
  ClaimIntermediary,
  ClaimIdEncoded,
} from '../claims/types';

import type { ForwardProxy } from '../network';
import Logger from '@matrixai/logger';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import * as nodesUtils from './utils';
import * as nodesErrors from './errors';
import { utils as claimsUtils, errors as claimsErrors } from '../claims';
import { utils as keysUtils } from '../keys';
import { utils as vaultsUtils } from '../vaults';
import { errors as grpcErrors } from '../grpc';
import { GRPCClientAgent } from '../agent';
import * as utilsPB from '../proto/js/polykey/v1/utils/utils_pb';
import * as nodesPB from '../proto/js/polykey/v1/nodes/nodes_pb';
import * as notificationsPB from '../proto/js/polykey/v1/notifications/notifications_pb';
import { utils as networkUtils } from '../network';

/**
 * Encapsulates the unidirectional client-side connection of one node to another.
 */
interface NodeConnection extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new nodesErrors.ErrorNodeConnectionRunning(),
  new nodesErrors.ErrorNodeConnectionDestroyed(),
)
class NodeConnection {
  protected logger: Logger;
  protected keyManager: KeyManager;

  // Node ID, host, and port of the target node at the end of this connection
  // Hostname defined if the target's host was resolved from this hostname.
  // Undefined if an IP address was initially provided
  protected targetNodeId: NodeId;
  protected ingressHost: Host;
  protected ingressHostname: Hostname | undefined;
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
    targetHostname = undefined,
    targetPort,
    connTimeout = 20000,
    forwardProxy,
    keyManager,
    logger = new Logger(this.name),
    seedConnections = new Map<NodeId, NodeConnection>(),
  }: {
    targetNodeId: NodeId;
    targetHost: Host;
    targetHostname?: Hostname;
    targetPort: Port;
    connTimeout?: number;
    forwardProxy: ForwardProxy;
    keyManager: KeyManager;
    logger?: Logger;
    seedConnections?: Map<NodeId, NodeConnection>;
  }): Promise<NodeConnection> {
    logger.info(`Creating ${this.name}`);
    const proxyConfig = {
      host: forwardProxy.getProxyHost(),
      port: forwardProxy.getProxyPort(),
      authToken: forwardProxy.authToken,
    };
    const nodeConnection = new NodeConnection({
      targetNodeId,
      targetHost,
      targetHostname,
      targetPort,
      forwardProxy,
      keyManager,
      logger,
      proxyConfig,
    });
    await nodeConnection.start({ seedConnections, connTimeout });
    logger.info(`Created ${this.name}`);
    return nodeConnection;
  }

  constructor({
    targetNodeId,
    targetHost,
    targetHostname = undefined,
    targetPort,
    forwardProxy,
    keyManager,
    logger,
    proxyConfig,
  }: {
    targetNodeId: NodeId;
    targetHost: Host;
    targetHostname?: Hostname;
    targetPort: Port;
    forwardProxy: ForwardProxy;
    keyManager: KeyManager;
    logger: Logger;
    proxyConfig: ProxyConfig;
  }) {
    this.logger = logger;
    this.targetNodeId = targetNodeId;
    this.ingressHost = targetHost;
    this.ingressHostname = targetHostname;
    this.ingressPort = targetPort;
    this.fwdProxy = forwardProxy;
    this.keyManager = keyManager;
    this.proxyConfig = proxyConfig;
  }

  /**
   * Initialises and starts the connection (via the fwdProxy).
   *
   * @param seedConnections map of all established seed node connections
   * If not provided, it's assumed a direct connection can be made to the target
   * (i.e. without hole punching, and therefore not being a NAT), as the seed
   * nodes relay the hole punch message.
   */
  public async start({
    seedConnections = new Map<NodeId, NodeConnection>(),
    connTimeout,
  }: {
    seedConnections?: Map<NodeId, NodeConnection>;
    connTimeout?: number;
  } = {}) {
    this.logger.info(`Starting ${this.constructor.name}`);
    // 1. Get the egress port of the fwdProxy (used for hole punching)
    const egressAddress = networkUtils.buildAddress(
      this.fwdProxy.getEgressHost(),
      this.fwdProxy.getEgressPort(),
    );
    // Also need to sign this for authentication (i.e. from expected source)
    const signature = await this.keyManager.signWithRootKeyPair(
      Buffer.from(egressAddress),
    );
    // 2. Ask fwdProxy for connection to target (the revProxy of other node)
    // 2. Start sending hole-punching packets to the target (via the client start -
    // this establishes a HTTP CONNECT request with the forward proxy)
    // 3. Relay the egress port to the broker/s (such that they can inform the other node)
    // 4. Start sending hole-punching packets to other node (done in openConnection())
    // Done in parallel
    try {
      const [client] = await Promise.all([
        GRPCClientAgent.createGRPCClientAgent({
          nodeId: this.targetNodeId,
          host: this.ingressHost,
          port: this.ingressPort,
          proxyConfig: this.proxyConfig,
          logger: this.logger.getChild(GRPCClientAgent.name),
          timeout: connTimeout,
        }),
        Array.from(seedConnections, ([_, conn]) =>
          conn.sendHolePunchMessage(
            this.keyManager.getNodeId(),
            this.targetNodeId,
            egressAddress,
            signature,
          ),
        ),
      ]);
      this.client = client;
    } catch (e) {
      await this.stop();
      // If the connection times out, re-throw this with a higher level nodes exception
      if (e instanceof grpcErrors.ErrorGRPCClientTimeout) {
        throw new nodesErrors.ErrorNodeConnectionTimeout();
      }
      throw e;
    }
    // 5. When finished, you have a connection to other node
    // The GRPCClient is ready to be used for requests
    this.logger.info(
      `Started ${this.constructor.name} from ${nodesUtils.encodeNodeId(
        this.keyManager.getNodeId(),
      )} to ${nodesUtils.encodeNodeId(this.targetNodeId)}`,
    );
  }

  public async stop() {
    this.logger.info(`Stopping ${this.constructor.name}`);
    if (this.client != null) {
      await this.client.destroy();
    }
    // Await this.fwdProxy.closeConnection(this.ingressHost, this.ingressPort);
    this.logger.info(
      `Stopped ${
        this.constructor.name
      } from ${this.keyManager.getNodeId()} to ${this.targetNodeId}`,
    );
  }

  public async destroy() {
    this.logger.info(`Destroying ${this.constructor.name}`);
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  public getClient() {
    return this.client;
  }

  /**
   * Get the root certificate chain (i.e. the entire chain) of the node at the
   * end of this connection.
   * Ordered from newest to oldest.
   */
  @ready(new nodesErrors.ErrorNodeConnectionNotRunning())
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
  @ready(new nodesErrors.ErrorNodeConnectionNotRunning())
  public getExpectedPublicKey(expectedNodeId: NodeId): PublicKeyPem | null {
    const certificates = this.getRootCertChain();
    let publicKey: PublicKeyPem | null = null;
    for (const cert of certificates) {
      if (networkUtils.certNodeId(cert).equals(expectedNodeId)) {
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
  @ready(new nodesErrors.ErrorNodeConnectionNotRunning())
  public async getClosestNodes(targetNodeId: NodeId): Promise<Array<NodeData>> {
    // Construct the message
    const nodeIdMessage = new nodesPB.Node();
    nodeIdMessage.setNodeId(nodesUtils.encodeNodeId(targetNodeId));
    // Send through client
    const response = await this.client.nodesClosestLocalNodesGet(nodeIdMessage);
    const nodes: Array<NodeData> = [];
    // Loop over each map element (from the returned response) and populate nodes
    response.getNodeTableMap().forEach((address, nodeIdEncoded: string) => {
      const nodeId: NodeId = nodesUtils.decodeNodeId(nodeIdEncoded);
      nodes.push({
        id: nodeId,
        address: {
          host: address.getHost() as Host | Hostname,
          port: address.getPort() as Port,
        },
        distance: nodesUtils.calculateDistance(targetNodeId, nodeId),
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
  @ready(new nodesErrors.ErrorNodeConnectionNotRunning())
  public async sendHolePunchMessage(
    sourceNodeId: NodeId,
    targetNodeId: NodeId,
    egressAddress: string,
    signature: Buffer,
  ): Promise<void> {
    const relayMsg = new nodesPB.Relay();
    relayMsg.setSrcId(sourceNodeId.toString());
    relayMsg.setTargetId(targetNodeId.toString());
    relayMsg.setEgressAddress(egressAddress);
    relayMsg.setSignature(signature.toString());
    await this.client.nodesHolePunchMessageSend(relayMsg);
  }

  /**
   * Performs a GRPC request to send a notification to the target.
   */
  @ready(new nodesErrors.ErrorNodeConnectionNotRunning())
  public async sendNotification(message: SignedNotification): Promise<void> {
    const notificationMsg = new notificationsPB.AgentNotification();
    notificationMsg.setContent(message);
    await this.client.notificationsSend(notificationMsg);
    return;
  }

  /**
   * Performs a GRPC request to retrieve the NodeInfo of the node at the end of
   * the connection.
   * @returns the reconstructed NodeInfo (containing UNVERIFIED links)
   */
  @ready(new nodesErrors.ErrorNodeConnectionNotRunning())
  public async getChainData(): Promise<ChainDataEncoded> {
    const chainData: ChainDataEncoded = {};
    const emptyMsg = new utilsPB.EmptyMessage();
    const response = await this.client.nodesChainDataGet(emptyMsg);
    // Reconstruct each claim from the returned ChainDataMessage
    response.getChainDataMap().forEach((claimMsg, id: string) => {
      const claimId = id as ClaimIdEncoded;
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

  @ready(new nodesErrors.ErrorNodeConnectionNotRunning())
  public async claimNode(
    singlySignedClaim: ClaimIntermediary,
  ): Promise<ClaimEncoded> {
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
          signeeNodeId: nodesUtils.encodeNodeId(this.keyManager.getNodeId()),
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
  @ready(new nodesErrors.ErrorNodeConnectionNotRunning())
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
