import KBucket from './KBucket';
import PeerInfo from '../PeerInfo';
import { Mutex } from 'async-mutex';
import { promiseAll } from '../../utils';
import * as peerInterface from '../../proto/js/Peer_pb';
import { SubServiceType } from '../../proto/js/Peer_pb';

// this implements a very basic map of known peer connections
// TODO: implement full kademlia algorithm for distributed peer connection table
class PeerDHT {
  private getPeerId: () => string;
  private getPeerInfo: (id: string) => PeerInfo;
  private updatePeerStore: (peerInfo: PeerInfo) => void;

  // state
  private findingLocalPeer = false;
  private findingPeer = false;
  private addingPeers = false;
  private addingPeer = false;
  private deletingPeer = false;

  // Concurrency
  private mutex: Mutex = new Mutex();

  kBucket: KBucket;
  connectToPeer: (
    id: string,
  ) => {
    pingPeer: (timeout?: number | undefined) => Promise<boolean>;
    sendPeerRequest: (type: SubServiceType, request: Uint8Array) => Promise<Uint8Array>;
  };

  constructor(
    getPeerId: () => string,
    connectToPeer: (
      id: string,
    ) => {
      pingPeer: (timeout?: number | undefined) => Promise<boolean>;
      sendPeerRequest: (type: SubServiceType, request: Uint8Array) => Promise<Uint8Array>;
    },
    getPeerInfo: (id: string) => PeerInfo,
    updatePeerStore: (peerInfo: PeerInfo) => void,
  ) {
    this.getPeerId = getPeerId;
    this.connectToPeer = connectToPeer;
    this.getPeerInfo = getPeerInfo;
    this.updatePeerStore = updatePeerStore;

    this.kBucket = new KBucket(this.getPeerId, this.pingNodeUpdate.bind(this));
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
    const release = await this.mutex.acquire();
    this.addingPeer = true;
    try {
      if (this.getPeerId() != id) {
        await this.kBucket.add(id);
      }
    } catch (error) {
      throw error;
    } finally {
      this.addingPeer = false;
      release();
    }
  }

  async addPeers(ids: string[]) {
    const release = await this.mutex.acquire();
    this.addingPeers = true;
    const promiseList = ids
      .filter((v) => {
        v != this.getPeerId();
      })
      .map((id) => this.kBucket.add(id));
    await promiseAll(promiseList).finally(() => {
      this.addingPeers = false;
      release();
    });
  }

  async deletePeer(id: string) {
    const release = await this.mutex.acquire();
    this.deletingPeer = true;
    try {
      this.kBucket.remove(id);
    } catch (error) {
      throw error;
    } finally {
      this.deletingPeer = false;
      release();
    }
  }

  private toPeerInfoMessageList(peerIds: string[]): peerInterface.PeerInfoMessage[] {
    return peerIds
      .filter((p) => {
        try {
          const pi = this.getPeerInfo(p);
          return pi ? true : false;
        } catch {
          return false;
        }
      })
      .map((p) => {
        const pi = this.getPeerInfo(p);
        const piMessage = new peerInterface.PeerInfoMessage
        piMessage.setPublicKey(pi.publicKey)
        piMessage.setRootCertificate(pi.rootCertificate)
        if (pi.peerAddress) {
          piMessage.setPeerAddress(pi.peerAddress.toString())
        }
        if (pi.apiAddress) {
          piMessage.setApiAddress(pi.apiAddress.toString())
        }
        return piMessage
      });
  }

  async findLocalPeer(peerId: string): Promise<PeerInfo | null> {
    const release = await this.mutex.acquire();
    this.findingLocalPeer = true;
    const closestPeerId = this.closestPeer(peerId);
    if (closestPeerId && closestPeerId == peerId) {
      const foundPeerInfo = this.getPeerInfo(peerId);
      // Found local peer
      this.findingLocalPeer = false;
      release();
      return foundPeerInfo ?? null;
    } else {
      // Either can't find public key in k bucket or
      // PeerInfo doesn't exist in store. Either way,
      // we just return null
      this.findingLocalPeer = false;
      release();
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
    adjacentPeerInfo?: PeerInfo;
    targetPeerInfo?: PeerInfo;
  }> {
    const release = await this.mutex.acquire();
    this.findingPeer = true;
    // Return local peer if it exists in routing table and has a connected peerAddress
    const localPeerInfo = await this.findLocalPeer(peerId);
    if (localPeerInfo && localPeerInfo?.peerAddress != undefined) {
      this.findingPeer = false;
      release();
      return {
        targetPeerInfo: localPeerInfo,
      };
    }

    // If local peer was not found, get closest peers and
    // start querying the network
    const kBucketSize = this.kBucket.numberOfNodesPerKBucket;
    // get rid of the target peer id as it is not onsidered a close peer
    const closestPeerIds = this.closestPeers(peerId, kBucketSize).filter((pi) => pi != peerId);

    // If there are no closest peers, we have failed to find that peer
    if (closestPeerIds.length === 0) {
      throw Error('peer lookup failed, no close peers found');
    }

    // Query the network until the peer public key is found
    for (const closePeerId of closestPeerIds) {
      if (closePeerId == this.getPeerId()) {
        continue;
      }
      try {
        const pc = this.connectToPeer(closePeerId);

        // encode request
        // note the request is also an opportunity to notify the target node of the closes
        // peers that the local node knows about so the target node kbucket can be updated.
        const subMessage = new peerInterface.PeerDHTFindNodeMessage
        subMessage.setPeerId(peerId)
        subMessage.setClosestPeersList(this.toPeerInfoMessageList(closestPeerIds))

        const request = new peerInterface.PeerDHTMessage
        request.setType(peerInterface.PeerDHTMessageType.FIND_NODE)
        request.setIsResponse(false)
        request.setSubMessage(subMessage.serializeBinary())
        // send request
        const response = await pc.sendPeerRequest(SubServiceType.PEER_DHT, request.serializeBinary());

        // decode response
        const decodedResponse = peerInterface.PeerDHTMessage.deserializeBinary(response)
        const responseSubMessage = decodedResponse.getSubMessage_asU8()
        const { peerId: responsePeerId, closestPeersList } = peerInterface.PeerDHTFindNodeMessage.deserializeBinary(responseSubMessage).toObject();

        // make sure request and response public keys are the same
        if (peerId != responsePeerId) {
          throw Error('request and response public keys are not the same!');
        }

        const closestFoundPeerInfoMessageList = closestPeersList.map(
          (p) => new PeerInfo(p.publicKey!, p.rootCertificate!, p.peerAddress ?? undefined, p.apiAddress ?? undefined),
        );

        // Add peers to routing table
        this.addPeers(closestPeersList.map((p) => PeerInfo.publicKeyToId(p.publicKey!)));

        // add peers to peer store
        let foundPeerInfo: PeerInfo | null = null;
        for (const peerInfo of closestFoundPeerInfoMessageList) {
          if (this.getPeerId() != peerInfo.id) {
            this.updatePeerStore(peerInfo);
          }
          if (peerInfo.id == peerId) {
            foundPeerInfo = peerInfo;
          }
        }

        if (foundPeerInfo) {
          this.findingPeer = false;
          release();
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
    release();
    return {};
  }

  ///////////////////
  // gRPC Handlers //
  ///////////////////
  async handleGRPCRequest(request: Uint8Array): Promise<Uint8Array> {
    const decodedRequest = peerInterface.PeerDHTMessage.deserializeBinary(request)
    const type = decodedRequest.getType()
    const subMessage = decodedRequest.getSubMessage_asU8()
    let response: Uint8Array;
    switch (type) {
      case peerInterface.PeerDHTMessageType.PING:
        throw Error('dht ping is not implemented, use peer ping channel as a proxy for a peer aliveness');
      case peerInterface.PeerDHTMessageType.FIND_NODE:
        response = await this.handleFindNodeMessage(subMessage);
        break;
      default:
        throw Error(`type not supported: ${type}`);
    }
    const encodedResponse = new peerInterface.PeerDHTMessage
    encodedResponse.setType(type)
    encodedResponse.setIsResponse(true)
    encodedResponse.setSubMessage(response)
    return encodedResponse.serializeBinary();
  }

  private async handleFindNodeMessage(request: Uint8Array): Promise<Uint8Array> {
    const { peerId, closestPeersList } = peerInterface.PeerDHTFindNodeMessage.deserializeBinary(request).toObject();
    const closestPeerInfoList = closestPeersList
      .map((p) => new PeerInfo(p.publicKey!, p.rootCertificate!, p.peerAddress ?? undefined, p.apiAddress ?? undefined))
      .filter((p) => p.id != this.getPeerId());

    const response = new peerInterface.PeerDHTFindNodeMessage
    response.setPeerId(peerId)
    response.setClosestPeersList(this.toPeerInfoMessageList(this.closestPeers(peerId)))

    // update the peer store
    for (const peerInfo of closestPeerInfoList) {
      if (this.getPeerId() != peerInfo.id) {
        this.updatePeerStore(peerInfo);
        this.addPeer(peerInfo.id);
      }
    }
    return response.serializeBinary();
  }
}

export default PeerDHT;
