import KBucket from './KBucket';
import { NodeInfoReadOnly } from '../NodeInfo';
import { promisifyGrpc } from '../../bin/utils';
import * as nodeInterface from '../../../proto/js/Node_pb';
import * as agentInterface from '../../../proto/js/Agent_pb';
import NodeConnection from '../node-connection/NodeConnection';

// this implements a very basic map of known peer connections
// TODO: implement full kademlia algorithm for distributed peer connection table
class NodeDHT {
  private getLocalPeerId: () => string;
  private getPeerInfo: (id: string) => NodeInfoReadOnly | null;
  private updatePeerStore: (peerInfo: NodeInfoReadOnly) => void;

  // state
  private findingLocalPeer = false;
  private findingPeer = false;
  private addingPeers = false;
  private addingPeer = false;
  private deletingPeer = false;

  kBucket: KBucket;
  connectToPeer: (id: string) => NodeConnection;

  constructor(
    getLocalPeerId: () => string,
    connectToPeer: (id: string) => NodeConnection,
    getPeerInfo: (id: string) => NodeInfoReadOnly | null,
    updatePeerStore: (peerInfo: NodeInfoReadOnly) => void,
  ) {
    this.getLocalPeerId = getLocalPeerId;
    this.connectToPeer = connectToPeer;
    this.getPeerInfo = getPeerInfo;
    this.updatePeerStore = updatePeerStore;

    this.kBucket = new KBucket(
      this.getLocalPeerId,
      this.pingNodeUpdate.bind(this),
    );
  }

  public get Status() {
    return {
      findingLocalPeer: this.findingLocalPeer,
      findingPeer: this.findingPeer,
      addingPeers: this.addingPeers,
      addingPeer: this.addingPeer,
      deletingPeer: this.deletingPeer,
    };
  }

  // This should use the peer communications channel to check if the peer is still alive
  private async peerIsAlive(peerId: string) {
    const pc = this.connectToPeer(peerId);
    return await pc.pingNode();
  }

  private async pingNodeUpdate(oldContacts: string[], newContact: string) {
    // oldContacts and newContact both contain publicKeys
    // ping from oldest the newest
    // if an old contact does not respond, remove it
    // if there is an opening, add the new contact if it responds
    for (const oldContact of oldContacts) {
      if (!(await this.peerIsAlive(oldContact))) {
        // we can remove this one and add the new contact
        this.kBucket.remove(oldContact);
        this.kBucket.add(newContact);
        return;
      }
    }
  }

  private closestPeer(id: string): string | null {
    const res = this.closestPeers(id, 1);
    if (res.length > 0) {
      return res[0];
    } else {
      return null;
    }
  }

  private closestPeers(id: string, count?: number): string[] {
    return this.kBucket.closest(id, count);
  }

  async addNode(id: string) {
    this.addingPeer = true;
    try {
      if (this.getLocalPeerId() != id) {
        await this.kBucket.add(id);
      }
    } catch (error) {
      throw error;
    } finally {
      this.addingPeer = false;
    }
  }

  async addNodes(ids: string[]) {
    this.addingPeers = true;
    try {
      for (const id of ids) {
        if (this.getLocalPeerId() != id) {
          await this.kBucket.add(id);
        }
      }
    } catch (error) {
      throw error;
    } finally {
      this.addingPeers = false;
    }
  }

  async deleteNode(id: string) {
    this.deletingPeer = true;
    try {
      this.kBucket.remove(id);
    } catch (error) {
      throw error;
    } finally {
      this.deletingPeer = false;
    }
  }

  private toNodeInfoReadOnlyMessageList(
    peerIds: string[],
  ): agentInterface.NodeInfoReadOnlyMessage[] {
    return peerIds
      .filter((p) => p != this.getLocalPeerId())
      .map((p) => {
        const peerInfo = this.getPeerInfo(p);
        return peerInfo ? peerInfo.toNodeInfoReadOnlyMessage() : null;
      })
      .filter((p) => p != null) as agentInterface.NodeInfoReadOnlyMessage[];
  }

  async findLocalPeer(peerId: string): Promise<NodeInfoReadOnly | null> {
    this.findingLocalPeer = true;
    const closestPeerId = this.closestPeer(peerId);
    if (closestPeerId && closestPeerId == peerId) {
      const foundPeerInfo = this.getPeerInfo(peerId);
      // Found local peer
      this.findingLocalPeer = false;
      return foundPeerInfo ?? null;
    } else {
      // Either can't find public key in k bucket or
      // PeerInfo doesn't exist in store. Either way,
      // we just return null
      this.findingLocalPeer = false;
      return null;
    }
  }

  // This function either returns the peer info from
  // a locally found peer or uses the FIND_NODE protocol
  // from kademlia to query peers until it finds the one
  // its looking for
  async findNode(
    peerId: string,
  ): Promise<{
    adjacentPeerInfo?: NodeInfoReadOnly;
    targetNodeInfo?: NodeInfoReadOnly;
  }> {
    this.findingPeer = true;
    // // Return local peer if it exists in routing table and has a connected peerAddress
    // const localPeerInfo = await this.findLocalPeer(peerId);
    // if (localPeerInfo && localPeerInfo?.peerAddress != undefined) {
    //   this.findingPeer = false;
    //   return {
    //     targetPeerInfo: localPeerInfo,
    //   };
    // }

    // If local peer was not found, get closest peers and
    // start querying the network
    const kBucketSize = this.kBucket.numberOfNodesPerKBucket;
    // get rid of the target peer id as it is not onsidered a close peer

    const closestPeerIds = this.closestPeers(peerId, kBucketSize).filter(
      (pi) => pi != peerId,
    );

    // If there are no closest peers, we have failed to find that peer
    if (closestPeerIds.length === 0) {
      throw Error('peer lookup failed, no close peers found');
    }

    // Query the network until the peer public key is found
    for (const closePeerId of closestPeerIds) {
      if (closePeerId == this.getLocalPeerId() || closePeerId == peerId) {
        continue;
      }
      try {
        const pc = this.connectToPeer(closePeerId);
        const client = await pc.getNodeClient(true);

        // encode request
        const request = new nodeInterface.NodeDHTFindNodeRequest();
        request.setTargetPeerId(peerId);

        // send request
        const response = (await promisifyGrpc(
          client.nodeDHTFindNode.bind(client),
        )(request)) as nodeInterface.NodeDHTFindNodeReply;

        // decode response
        const { closestPeersList } = response.toObject();
        const closestFoundPeerInfoList = closestPeersList
          .map((p) => NodeInfoReadOnly.fromNodeInfoReadOnlyMessage(p))
          .filter((p) => p.id != this.getLocalPeerId());

        // Add peers to routing table
        this.addNodes(closestFoundPeerInfoList.map((p) => p.id));

        // add peers to peer store
        let foundPeerInfo: NodeInfoReadOnly | null = null;
        for (const peerInfo of closestFoundPeerInfoList) {
          if (this.getLocalPeerId() != peerInfo.id) {
            this.updatePeerStore(peerInfo);
          }
          if (peerInfo.id == peerId) {
            foundPeerInfo = peerInfo;
          }
        }

        if (foundPeerInfo) {
          this.findingPeer = false;
          return {
            adjacentPeerInfo: this.getPeerInfo(closePeerId)!,
            targetNodeInfo: foundPeerInfo,
          };
        } else {
          throw Error('peer id was not found');
        }
      } catch (error) {
        // don't want to throw if peer contact failed so just log it
        continue;
      }
    }
    this.findingPeer = false;
    return {};
  }

  ///////////////////
  // gRPC Handlers //
  ///////////////////
  handleFindNodeMessage(
    targetPeerId: string,
  ): agentInterface.NodeInfoReadOnlyMessage[] {
    return this.toNodeInfoReadOnlyMessageList(this.closestPeers(targetPeerId));
  }
}

export default NodeDHT;
