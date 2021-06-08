import type { KeyManager } from '../keys';
import type { NodeId, NodeAddress, NodeData, NodeBucket } from '../nodes/types';
import type { Host, Port } from '../network/types';
import type { FileSystem, Timer } from '../types';

import Logger from '@matrixai/logger';
import NodeGraph from './NodeGraph';
import * as nodesErrors from './errors';
import { ForwardProxy, ReverseProxy } from '../network';
import { GRPCClientAgent } from '../agent';
import * as utils from '../utils';
import * as agentPB from '../proto/js/Agent_pb';

class NodeManager {
  // LevelDB directory to store all the information for managing nodes
  public readonly nodesPath: string;

  protected fs: FileSystem;
  protected logger: Logger;
  protected _started: boolean = false;

  protected nodeGraph: NodeGraph;
  protected revProxy: ReverseProxy;

  constructor({
    nodesPath,
    keyManager,
    fwdProxy,
    revProxy,
    fs,
    logger,
  }: {
    nodesPath: string;
    keyManager: KeyManager;
    fwdProxy: ForwardProxy;
    revProxy: ReverseProxy;
    fs?: FileSystem;
    logger?: Logger;
  }) {
    this.logger = logger ?? new Logger('NodeManager');
    this.nodesPath = nodesPath;
    this.fs = fs ?? require('fs');

    // Instantiate the node graph (containing Kademlia implementation)
    this.nodeGraph = new NodeGraph({
      nodePath: nodesPath,
      keyManager: keyManager,
      fwdProxy: fwdProxy,
      fs: this.fs,
      logger: this.logger,
    });
    this.revProxy = revProxy;
  }

  // Initialise leveldb database
  // fresh: if true, remove and recreate the
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
    this.logger.info(`Setting nodes path to ${this.nodesPath}`);
    if (fresh) {
      await this.fs.promises.rm(this.nodesPath, {
        force: true,
        recursive: true,
      });
    }
    await utils.mkdirExists(this.fs, this.nodesPath);

    await this.nodeGraph.start({
      nodeId: nodeId,
      brokerNodes: brokerNodes,
    });
    this._started = true;
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

  public async setNode(
    nodeId: NodeId,
    nodeAddress: NodeAddress,
  ): Promise<void> {
    await this.nodeGraph.setNode(nodeId, nodeAddress);
  }

  public async getClosestGlobalNodes(targetNodeId: NodeId): Promise<boolean> {
    return await this.nodeGraph.getClosestGlobalNodes(targetNodeId);
  }

  public async getAllBuckets(): Promise<Array<NodeBucket>> {
    return await this.nodeGraph.getAllBuckets();
  }

  /**
   * Forwards a received hole punch message on.
   */
  public async relayHolePunchMessage(
    message: agentPB.RelayMessage,
  ): Promise<void> {
    await this.nodeGraph.relayHolePunchMessage(message);
  }

  /**
   * Treat this node as the client.
   * Attempt to create a unidirectional connection to another node (server).
   * @param targetNodeId node ID of the node (server) to connect to
   * @param targetNodeAddress address (host and port) of node to connect to
   */
  public async createConnectionToNode(
    targetNodeId: NodeId,
    targetNodeAddress: NodeAddress,
  ): Promise<void> {
    await this.nodeGraph.createConnectionToNode(
      targetNodeId,
      targetNodeAddress,
    );
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
    return this.nodeGraph.getClient(targetNodeId);
  }

  /**
   * Retrieves the node Address
   * @param targetNodeId node ID of the target node
   * @returns Node Address of the target node
   */
  public async getNode(targetNodeId: NodeId): Promise<NodeAddress | undefined> {
    return await this.nodeGraph.getNode(targetNodeId);
  }
}

export default NodeManager;
