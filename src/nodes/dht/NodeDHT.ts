import KBucket from './KBucket';
import { NodePeer } from '../Node';
import { promisifyGrpc } from '../../bin/utils';
import * as nodeInterface from '../../proto/js/Node_pb';
import * as agentInterface from '../../proto/js/Agent_pb';
import NodeConnection from '../node-connection/NodeConnection';
import { ErrorCloseNodesUndefined, ErrorNodeIDUndefined } from '../../errors';

// this implements a very basic map of known node connections
// TODO: implement full kademlia algorithm for distributed node connection table
class NodeDHT {
  private getLocalNodeId: () => string;
  private getNodeInfo: (id: string) => NodePeer | null;
  private updateNodeStore: (nodeInfo: NodePeer) => void;

  // state
  private findingLocalNode = false;
  private findingNode = false;
  private addingNodes = false;
  private addingNode = false;
  private deletingNode = false;

  kBucket: KBucket;
  connectToNode: (id: string) => NodeConnection;

  constructor(
    getLocalNodeId: () => string,
    connectToNode: (id: string) => NodeConnection,
    getNodeInfo: (id: string) => NodePeer | null,
    updateNodeStore: (nodeInfo: NodePeer) => void,
  ) {
    this.getLocalNodeId = getLocalNodeId;
    this.connectToNode = connectToNode;
    this.getNodeInfo = getNodeInfo;
    this.updateNodeStore = updateNodeStore;

    this.kBucket = new KBucket(
      this.getLocalNodeId,
      this.pingNodeUpdate.bind(this),
    );
  }

  public get Status() {
    return {
      findingLocalNode: this.findingLocalNode,
      findingNode: this.findingNode,
      addingNodes: this.addingNodes,
      addingNode: this.addingNode,
      deletingNode: this.deletingNode,
    };
  }

  // This should use the node communications channel to check if the node is still alive
  private async nodeIsAlive(nodeId: string) {
    const pc = this.connectToNode(nodeId);
    return await pc.pingNode();
  }

  private async pingNodeUpdate(oldContacts: string[], newContact: string) {
    // oldContacts and newContact both contain publicKeys
    // ping from oldest the newest
    // if an old contact does not respond, remove it
    // if there is an opening, add the new contact if it responds
    for (const oldContact of oldContacts) {
      if (!(await this.nodeIsAlive(oldContact))) {
        // we can remove this one and add the new contact
        this.kBucket.remove(oldContact);
        this.kBucket.add(newContact);
        return;
      }
    }
  }

  private closestNode(id: string): string | null {
    const res = this.closestNodes(id, 1);
    if (res.length > 0) {
      return res[0];
    } else {
      return null;
    }
  }

  private closestNodes(id: string, count?: number): string[] {
    return this.kBucket.closest(id, count);
  }

  async addNode(id: string) {
    this.addingNode = true;
    try {
      if (this.getLocalNodeId() != id) {
        await this.kBucket.add(id);
      }
    } finally {
      this.addingNode = false;
    }
  }

  async addNodes(ids: string[]) {
    this.addingNodes = true;
    try {
      for (const id of ids) {
        if (this.getLocalNodeId() != id) {
          await this.kBucket.add(id);
        }
      }
    } finally {
      this.addingNodes = false;
    }
  }

  async deleteNode(id: string) {
    this.deletingNode = true;
    try {
      this.kBucket.remove(id);
    } finally {
      this.deletingNode = false;
    }
  }

  private toNodeInfoReadOnlyMessageList(
    nodeIds: string[],
  ): agentInterface.NodeInfoReadOnlyMessage[] {
    return nodeIds
      .filter((p) => p != this.getLocalNodeId())
      .map((p) => {
        const nodeInfo = this.getNodeInfo(p);
        return nodeInfo ? nodeInfo.toNodeInfoReadOnlyMessage() : null;
      })
      .filter((p) => p != null) as agentInterface.NodeInfoReadOnlyMessage[];
  }

  async findLocalNode(nodeId: string): Promise<NodePeer | null> {
    this.findingLocalNode = true;
    const closestNodeId = this.closestNode(nodeId);
    if (closestNodeId && closestNodeId == nodeId) {
      const foundNodeInfo = this.getNodeInfo(nodeId);
      // Found local node
      this.findingLocalNode = false;
      return foundNodeInfo ?? null;
    } else {
      // Either can't find public key in k bucket or
      // Node doesn't exist in store. Either way,
      // we just return null
      this.findingLocalNode = false;
      return null;
    }
  }

  // This function either returns the node info from
  // a locally found node or uses the FIND_NODE protocol
  // from kademlia to query nodes until it finds the one
  // its looking for
  async findNode(
    nodeId: string,
  ): Promise<{
    adjacentNodeInfo?: NodePeer;
    targetNodeInfo?: NodePeer;
  }> {
    this.findingNode = true;
    // // Return local node if it exists in routing table and has a connected nodeAddress
    // const localNodeInfo = await this.findLocalNode(nodeId);
    // if (localNodeInfo && localNodeInfo?.nodeAddress != undefined) {
    //   this.findingNode = false;
    //   return {
    //     targetNodeInfo: localNodeInfo,
    //   };
    // }

    // If local node was not found, get closest nodes and
    // start querying the network
    const kBucketSize = this.kBucket.numberOfNodesPerKBucket;
    // get rid of the target node id as it is not onsidered a close node

    const closestNodeIds = this.closestNodes(nodeId, kBucketSize).filter(
      (pi) => pi != nodeId,
    );

    // If there are no closest nodes, we have failed to find that node
    if (closestNodeIds.length === 0) {
      throw new ErrorCloseNodesUndefined(
        'node lookup failed, no close nodes found',
      );
    }

    // Query the network until the node public key is found
    for (const closeNodeId of closestNodeIds) {
      if (closeNodeId == this.getLocalNodeId() || closeNodeId == nodeId) {
        continue;
      }
      try {
        const pc = this.connectToNode(closeNodeId);
        const client = await pc.getNodeClient(true);

        // encode request
        const request = new nodeInterface.NodeDHTFindNodeRequest();
        request.setTargetPeerId(nodeId);

        // send request
        const response = (await promisifyGrpc(
          client.nodeDHTFindNode.bind(client),
        )(request)) as nodeInterface.NodeDHTFindNodeReply;

        // decode response
        const { closestPeersList } = response.toObject();
        const closestFoundNodeInfoList = closestPeersList
          .map((p) => NodePeer.fromNodeInfoReadOnlyMessage(p))
          .filter((p) => p.id != this.getLocalNodeId());

        // Add nodes to routing table
        this.addNodes(closestFoundNodeInfoList.map((p) => p.id));

        // add nodes to node store
        let foundNodeInfo: NodePeer | null = null;
        for (const nodeInfo of closestFoundNodeInfoList) {
          if (this.getLocalNodeId() != nodeInfo.id) {
            this.updateNodeStore(nodeInfo);
          }
          if (nodeInfo.id == nodeId) {
            foundNodeInfo = nodeInfo;
          }
        }

        if (foundNodeInfo) {
          this.findingNode = false;
          return {
            adjacentNodeInfo: this.getNodeInfo(closeNodeId)!,
            targetNodeInfo: foundNodeInfo,
          };
        } else {
          throw new ErrorNodeIDUndefined('node id was not found');
        }
      } catch (error) {
        // don't want to throw if node contact failed so just log it
        continue;
      }
    }
    this.findingNode = false;
    return {};
  }

  ///////////////////
  // gRPC Handlers //
  ///////////////////
  handleFindNodeMessage(
    targetNodeId: string,
  ): agentInterface.NodeInfoReadOnlyMessage[] {
    return this.toNodeInfoReadOnlyMessageList(this.closestNodes(targetNodeId));
  }
}

export default NodeDHT;
