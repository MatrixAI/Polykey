import type { KeyManager } from '../keys';
import type { PublicKeyPem } from '../keys/types';
import type { Sigchain } from '../sigchain';
import type { ChainData, ChainDataEncoded } from '../sigchain/types';
import type { ClaimId } from '../claims/types';
import type { NodeId, NodeAddress, NodeData, NodeBucket } from '../nodes/types';
import type { Host, Port } from '../network/types';
import type { FileSystem, Timer } from '../types';
import type { DB } from '../db';

import Logger from '@matrixai/logger';
import NodeGraph from './NodeGraph';
import NodeConnection from './NodeConnection';
import * as nodesErrors from './errors';
import * as dbErrors from '../db/errors';
import * as sigchainUtils from '../sigchain/utils';
import * as claimsUtils from '../claims/utils';
import { ForwardProxy, ReverseProxy } from '../network';
import { GRPCClientAgent } from '../agent';
import * as agentPB from '../proto/js/Agent_pb';

class NodeManager {
  // LevelDB directory to store all the information for managing nodes
  // public readonly nodesPath: string;

  protected db: DB;
  protected fs: FileSystem;
  protected logger: Logger;
  protected _started: boolean = false;

  protected nodeId: NodeId;
  protected nodeGraph: NodeGraph;
  protected sigchain: Sigchain;
  protected keyManager: KeyManager;
  protected fwdProxy: ForwardProxy;
  protected revProxy: ReverseProxy;

  // active connections to other nodes
  protected connections: Map<NodeId, NodeConnection> = new Map();
  // Node ID -> node address mappings for the bootstrap/broker nodes
  protected brokerNodes: NodeBucket = {};
  protected brokerNodeConnections: Map<NodeId, NodeConnection> = new Map();

  constructor({
    db,
    sigchain,
    keyManager,
    fwdProxy,
    revProxy,
    fs,
    logger,
  }: {
    db: DB;
    sigchain: Sigchain;
    keyManager: KeyManager;
    fwdProxy: ForwardProxy;
    revProxy: ReverseProxy;
    fs?: FileSystem;
    logger?: Logger;
  }) {
    this.logger = logger ?? new Logger('NodeManager');
    this.db = db;
    this.fs = fs ?? require('fs');

    // Instantiate the node graph (containing Kademlia implementation)
    this.nodeGraph = new NodeGraph({
      db: db,
      nodeManager: this,
      logger: this.logger,
    });
    this.sigchain = sigchain;
    this.keyManager = keyManager;
    this.fwdProxy = fwdProxy;
    this.revProxy = revProxy;
  }

  public async start({
    nodeId,
    brokerNodes = {},
    fresh = false,
  }: {
    nodeId: NodeId;
    brokerNodes?: NodeBucket;
    fresh?: boolean;
  }) {
    this.logger.info('Starting Node Manager');
    this._started = true;
    if (!this.db.started) {
      throw new dbErrors.ErrorDBNotStarted();
    }
    this.nodeId = nodeId;
    // establish and start connections to the brokers
    for (const brokerId in brokerNodes) {
      await this.createConnectionToBroker(
        brokerId as NodeId,
        brokerNodes[brokerId].address,
      );
    }
    await this.nodeGraph.start({
      nodeId: nodeId,
      // brokerNodes: brokerNodes,
    });
    this.logger.info('Started Node Manager');
  }

  /**
   * Checks to see whether or not the current NodeManager instance has been started.
   *
   * Checks for: _started, nodeGraph and revProxy
   * @returns true if all nodeManager components have been constructed
   */
  public async started(): Promise<boolean> {
    if (this._started && this.nodeGraph && this.revProxy) {
      return true;
    }
    return false;
  }

  public async stop() {
    this.logger.info('Stopping Node Manager');
    this._started = false;
    for (const [, conn] of this.connections) {
      await conn.stop();
    }
    for (const [, conn] of this.brokerNodeConnections) {
      await conn.stop();
    }
    await this.nodeGraph.stop();
    this.logger.info('Stopped Node Manager');
  }

  public async getClosestLocalNodes(
    targetNodeId: NodeId,
  ): Promise<Array<NodeData>> {
    return await this.nodeGraph.getClosestLocalNodes(targetNodeId);
  }

  /**
   * Determines whether a node ID -> node address mapping exists in this node's
   * node table.
   * @param targetNodeId the node ID of the node to find
   * @returns true if the node exists in the table, false otherwise
   */
  public async knowsNode(targetNodeId: NodeId): Promise<boolean> {
    if (await this.nodeGraph.getNode(targetNodeId)) {
      return true;
    } else {
      return false;
    }
  }

  public getNodeId(): NodeId {
    return this.nodeGraph.getNodeId();
  }

  /**
   * Connects to the target node and retrieves its public key from its root
   * certificate chain (corresponding to the provided public key fingerprint -
   * the node ID).
   */
  public async getPublicKey(targetNodeId: NodeId): Promise<PublicKeyPem> {
    const targetAddress: NodeAddress = await this.findNode(targetNodeId);
    const connection: NodeConnection = await this.createConnectionToNode(
      targetNodeId,
      targetAddress,
    );
    const publicKey = connection.getExpectedPublicKey(
      targetNodeId,
    ) as PublicKeyPem;
    if (!publicKey) {
      throw new nodesErrors.ErrorNodeConnectionPublicKeyNotFound();
    }
    return publicKey;
  }

  /**
   * Retrieves the cryptolinks of this node, returning as a collection of
   * records (for storage in the gestalt graph)
   */
  public async getChainData(): Promise<ChainDataEncoded> {
    return await this.sigchain.getChainData();
  }

  /**
   * Connects to the target node, and retrieves its sigchain data.
   * Verifies and returns the decoded chain as ChainData. Note: this will drop
   * any unverifiable claims.
   * For node1 -> node2 claims, the verification process also involves connecting
   * to node2 to verify the claim (to retrieve its signing public key).
   */
  public async requestChainData(targetNodeId: NodeId): Promise<ChainData> {
    const targetAddress: NodeAddress = await this.findNode(targetNodeId);
    const connection: NodeConnection = await this.createConnectionToNode(
      targetNodeId,
      targetAddress,
    );
    // Verify the node's chain with its own public key
    const unverifiedChainData = await connection.getChainData();
    const publicKey = connection.getExpectedPublicKey(
      targetNodeId,
    ) as PublicKeyPem;
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
    for (const c in verifiedChainData) {
      const claimId = c as ClaimId;
      const payload = verifiedChainData[claimId].payload;
      if (payload.data.type == 'node') {
        const endNodeId = payload.data.node2;
        const endAddress: NodeAddress = await this.findNode(endNodeId);
        const endConnection: NodeConnection = await this.createConnectionToNode(
          endNodeId,
          endAddress,
        );
        const endPublicKey = endConnection.getExpectedPublicKey(
          targetNodeId,
        ) as PublicKeyPem;
        if (!endPublicKey) {
          throw new nodesErrors.ErrorNodeConnectionPublicKeyNotFound();
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

  public async setNode(
    nodeId: NodeId,
    nodeAddress: NodeAddress,
  ): Promise<void> {
    await this.nodeGraph.setNode(nodeId, nodeAddress);
  }

  public async getClosestGlobalNodes(
    targetNodeId: NodeId,
  ): Promise<NodeAddress | undefined> {
    return await this.nodeGraph.getClosestGlobalNodes(targetNodeId);
  }

  public async getAllBuckets(): Promise<Array<NodeBucket>> {
    return await this.nodeGraph.getAllBuckets();
  }

  /**
   * Forwards a received hole punch message on.
   */
  // public async relayHolePunchMessage(
  //   message: agentPB.RelayMessage,
  // ): Promise<void> {
  //   await this.nodeGraph.relayHolePunchMessage(message);
  // }

  /**
   * Forwards a received hole punch message on to the target.
   * The node is assumed to be known, and a connection to the node is also assumed
   * to have already been established (as right now, this will only be called by
   * a 'broker' node).
   * @param message the original relay message (assumed to be created in
   * nodeConnection.start())
   */
  public async relayHolePunchMessage(
    message: agentPB.RelayMessage,
  ): Promise<void> {
    const conn = this.connections.get(message.getTargetid() as NodeId);
    if (conn === undefined) {
      throw new nodesErrors.ErrorNodeConnectionNotExist();
    }
    await conn.sendHolePunchMessage(
      message.getSrcid() as NodeId,
      message.getTargetid() as NodeId,
      message.getEgressaddress(),
      Buffer.from(message.getSignature()),
    );
  }

  /**
   * Treat this node as the client.
   * Attempt to create a unidirectional connection to another node (server).
   * @param targetNodeId node ID of the node (server) to connect to
   * @param targetNodeAddress address (host and port) of node to connect to
   */
  // public async createConnectionToNode(
  //   targetNodeId: NodeId,
  //   targetNodeAddress: NodeAddress,
  // ): Promise<void> {
  //   await this.nodeGraph.createConnectionToNode(
  //     targetNodeId,
  //     targetNodeAddress,
  //   );
  // }

  public getConnectionToNode(targetNodeId: NodeId): NodeConnection {
    const conn = this.connections.get(targetNodeId);
    if (conn) {
      return conn;
    } else {
      throw new nodesErrors.ErrorNodeConnectionNotExist();
    }
  }

  /**
   * Treat this node as the client, and attempt to create a unidirectional
   * connection to another node (server). Either by retrieving a pre-existing
   * one, or by instantiating a new GRPCClientAgent.
   *
   * @param targetNodeId ID of the node wanting to connect to
   * @param targetNodeAddress host and port of the node wanting to connect to
   */
  public async createConnectionToNode(
    targetNodeId: NodeId,
    targetNodeAddress: NodeAddress,
  ): Promise<NodeConnection> {
    // Throw error if trying to connect to self
    if (targetNodeId == this.nodeId) {
      throw new nodesErrors.ErrorNodeGraphSelfConnect();
    }
    // Attempt to get an existing connection
    const existingConnection: NodeConnection | undefined =
      this.connections.get(targetNodeId);
    if (existingConnection) {
      return existingConnection;
    }
    // Otherwise, create a new connection
    const nodeConnection = new NodeConnection({
      sourceNodeId: this.nodeId,
      targetNodeId: targetNodeId,
      targetHost: targetNodeAddress.ip,
      targetPort: targetNodeAddress.port,
      forwardProxy: this.fwdProxy,
      keyManager: this.keyManager,
      logger: this.logger,
    });
    await nodeConnection.start({
      brokerConnections: this.brokerNodeConnections,
    });
    // Add it to the map of active connections
    this.connections.set(targetNodeId, nodeConnection);
    return nodeConnection;
  }

  /**
   * Create and start a connection to a broker node. Assumes that a direct
   * connection to the broker can be established (i.e. no hole punching required).
   *
   * @param brokerNodeId ID of the broker node to connect to
   * @param brokerNodeAddress host and port of the broker node to connect to
   * @returns
   */
  public async createConnectionToBroker(
    brokerNodeId: NodeId,
    brokerNodeAddress: NodeAddress,
  ): Promise<NodeConnection> {
    // Throw error if trying to connect to self
    if (brokerNodeId == this.nodeId) {
      throw new nodesErrors.ErrorNodeGraphSelfConnect();
    }
    // Attempt to get an existing connection
    const existingConnection = this.brokerNodeConnections.get(brokerNodeId);
    if (existingConnection) {
      return existingConnection;
    }
    const brokerConnection = new NodeConnection({
      sourceNodeId: this.nodeId,
      targetNodeId: brokerNodeId,
      targetHost: brokerNodeAddress.ip,
      targetPort: brokerNodeAddress.port,
      forwardProxy: this.fwdProxy,
      keyManager: this.keyManager,
      logger: this.logger,
    });
    // TODO: may need to change this start() to some kind of special 'direct
    // connection' mechanism (currently just does the same openConnection() call
    // as any other node, but without hole punching).
    await brokerConnection.start({});
    this.brokerNodeConnections.set(brokerNodeId, brokerConnection);
    return brokerConnection;
  }

  public getBrokerNodeConnections(): Map<NodeId, NodeConnection> {
    return this.brokerNodeConnections;
  }

  /**
   * Treat this node as the server.
   * Instruct the reverse proxy to send hole-punching packets back to the target's
   * forward proxy, in order to open a connection from the client to this server.
   * A connection is established if the client node's forward proxy is sending
   * hole punching packets at the same time as this node (acting as the server)
   * sends hole-punching packets back to the client's forward proxy.
   * @param egressHost host of the client's forward proxy
   * @param egressPort port of the cient's forward proxy
   */
  public async openConnection(
    egressHost: Host,
    egressPort: Port,
    timer?: Timer,
  ): Promise<void> {
    if (!this._started) {
      throw new nodesErrors.ErrorNodeManagerNotStarted();
    }
    await this.revProxy.openConnection(egressHost, egressPort, timer);
  }

  /**
   * Retrieves the GRPC client associated with a connection to a particular node ID
   * @param targetNodeId node ID of the connected node
   * @returns GRPC client of the active connection
   * @throws ErrorNodeConnectionNotExist if a connection to the target does not exist
   */
  public getClient(targetNodeId: NodeId): GRPCClientAgent {
    const conn = this.connections.get(targetNodeId);
    if (conn) {
      return conn.getClient();
    } else {
      throw new nodesErrors.ErrorNodeConnectionNotExist();
    }
  }

  /**
   * Retrieves the node Address
   * @param targetNodeId node ID of the target node
   * @returns Node Address of the target node
   */
  public async getNode(targetNodeId: NodeId): Promise<NodeAddress | undefined> {
    return await this.nodeGraph.getNode(targetNodeId);
  }

  /**
   * Retrieves the node address. If an entry doesn't exist in the db, then
   * proceeds to locate it using Kademlia.
   */
  public async findNode(targetNodeId: NodeId): Promise<NodeAddress> {
    // First check if we already have an existing ID -> address record
    let address = await this.getNode(targetNodeId);
    // Otherwise, attempt to locate it by contacting network
    if (address == null) {
      address = await this.nodeGraph.getClosestGlobalNodes(targetNodeId);
      // TODO: This currently just does one iteration
      // If not found in this single iteration, we throw an exception
      if (address == null) {
        throw new nodesErrors.ErrorNodeGraphNodeNotFound();
      }
    }
    // We ensure that we always return a NodeAddress (either by lookup, or
    // network search) - if we can't locate it from either, we throw an exception
    return address;
  }
}

export default NodeManager;
