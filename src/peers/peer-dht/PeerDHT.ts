import KBucket from './KBucket';
import { Mutex } from 'async-mutex';
import { promiseAll } from '../../utils';
import { promisifyGrpc } from '../../bin/utils';
import { PeerInfo, PeerInfoReadOnly } from '../PeerInfo';
import * as peerInterface from '../../../proto/js/Peer_pb';
import * as agentInterface from '../../../proto/js/Agent_pb';
import PeerConnection from '../peer-connection/PeerConnection';

// this implements a very basic map of known peer connections
// TODO: implement full kademlia algorithm for distributed peer connection table
class PeerDHT {
  private getLocalPeerId: () => string;
  private getPeerInfo: (id: string) => PeerInfoReadOnly | null;
  private updatePeerStore: (peerInfo: PeerInfoReadOnly) => void;

  // state
  private findingLocalPeer = false;
  private findingPeer = false;
  private addingPeers = false;
  private addingPeer = false;
  private deletingPeer = false;

  // // Concurrency
  // private mutex: Mutex = new Mutex();

  kBucket: KBucket;
  connectToPeer: (id: string) => PeerConnection;

  constructor(
    getLocalPeerId: () => string,
    connectToPeer: (id: string) => PeerConnection,
    getPeerInfo: (id: string) => PeerInfoReadOnly | null,
    updatePeerStore: (peerInfo: PeerInfoReadOnly) => void,
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
    return await pc.pingPeer();
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

  async addPeer(id: string) {
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

  async addPeers(ids: string[]) {
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

  async deletePeer(id: string) {
    this.deletingPeer = true;
    try {
      this.kBucket.remove(id);
    } catch (error) {
      throw error;
    } finally {
      this.deletingPeer = false;
    }
  }

  private toPeerInfoReadOnlyMessageList(
    peerIds: string[],
  ): agentInterface.PeerInfoReadOnlyMessage[] {
    return peerIds
      .filter((p) => p != this.getLocalPeerId())
      .map((p) => {
        const peerInfo = this.getPeerInfo(p);
        return peerInfo ? peerInfo.toPeerInfoReadOnlyMessage() : null;
      })
      .filter((p) => p != null) as agentInterface.PeerInfoReadOnlyMessage[];
  }

  async findLocalPeer(peerId: string): Promise<PeerInfoReadOnly | null> {
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
  async findPeer(
    peerId: string,
  ): Promise<{
    adjacentPeerInfo?: PeerInfoReadOnly;
    targetPeerInfo?: PeerInfoReadOnly;
  }> {
    // there is an issue here with the mutex not being acquired
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
        const client = await pc.getPeerClient(true);

        // encode request
        const request = new peerInterface.PeerDHTFindNodeRequest();
        request.setTargetPeerId(peerId);

        // send request
        const response = (await promisifyGrpc(
          client.peerDHTFindNode.bind(client),
        )(request)) as peerInterface.PeerDHTFindNodeReply;

        // decode response
        const { closestPeersList } = response.toObject();
        const closestFoundPeerInfoList = closestPeersList
          .map((p) => PeerInfoReadOnly.fromPeerInfoReadOnlyMessage(p))
          .filter((p) => p.id != this.getLocalPeerId());

        // Add peers to routing table
        this.addPeers(closestFoundPeerInfoList.map((p) => p.id));

        // add peers to peer store
        let foundPeerInfo: PeerInfoReadOnly | null = null;
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
            targetPeerInfo: foundPeerInfo,
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
  ): agentInterface.PeerInfoReadOnlyMessage[] {
    return this.toPeerInfoReadOnlyMessageList(this.closestPeers(targetPeerId));
  }
}

export default PeerDHT;
