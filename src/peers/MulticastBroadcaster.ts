import dgram from 'dgram';
import { EventEmitter } from 'events';
import KeyManager from '../keys/KeyManager';
import { PeerInfo, PeerInfoReadOnly } from './PeerInfo';

// This module is based heavily on libp2p's mDNS module:
// https://github.com/libp2p/js-libp2p-mdns
// It is supposed to discover peers on the local network
// This module was also generated with the help of:
// https://nrempel.com/using-udp-multicast-with-node-js/
//
// """
// In computer networking, the multicast DNS (mDNS) protocol
// resolves hostnames to IP addresses within small networks
// that do not include a local name server
// """

const UDP_MULTICAST_PORT = parseInt(process.env.UDP_MULTICAST_PORT ?? '5353');
const UDP_MULTICAST_ADDR = process.env.UDP_MULTICAST_ADDR ?? '224.0.0.251';

class MulticastBroadcaster extends EventEmitter {
  getPeerInfo: () => PeerInfo;
  hasPeer: (id: string) => boolean;
  addPeer: (peerInfo: PeerInfoReadOnly) => void;
  updatePeer: (peerInfo: PeerInfoReadOnly) => void;
  private keyManager: KeyManager;

  private socket: dgram.Socket;

  private interval = 1e5;
  private broadcastInterval: ReturnType<typeof setInterval> | null = null;
  constructor(
    getPeerInfo: () => PeerInfo,
    hasPeer: (id: string) => boolean,
    addPeer: (peerInfo: PeerInfoReadOnly) => void,
    updatePeer: (peerInfo: PeerInfoReadOnly) => void,
    keyManager: KeyManager,
  ) {
    super();

    this.getPeerInfo = getPeerInfo;
    this.hasPeer = hasPeer;
    this.addPeer = addPeer;
    this.updatePeer = updatePeer;
    this.keyManager = keyManager;

    // Create socket
    this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    this.socket.bind(UDP_MULTICAST_PORT as number);

    // Set up listener
    this.socket.on(
      'listening',
      (() => {
        this.socket.addMembership(UDP_MULTICAST_ADDR);
        // Start the broadcasting process
        this.startBroadcasting();
      }).bind(this),
    );
  }

  startListening() {
    if (!this.socket.listenerCount('message')) {
      // Handle messages
      this.socket.on('message', this.handleBroadcastMessage.bind(this));
    }
  }

  stopBroadcasting() {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
    }
  }

  startBroadcasting() {
    const broadcast = async () => {
      if (!this.keyManager.KeypairUnlocked) {
        return;
      }
      const peerInfoPem = this.getPeerInfo().toX509Pem(
        this.keyManager.getPrivateKey(),
      );
      this.socket.send(
        peerInfoPem,
        0,
        peerInfoPem.length,
        UDP_MULTICAST_PORT,
        UDP_MULTICAST_ADDR,
      );
    };

    // Immediately start a query, then do it every interval.
    broadcast();
    this.broadcastInterval = setInterval(broadcast, this.interval);
  }

  private async handleBroadcastMessage(request: any, rinfo: any) {
    try {
      // construct a peer info object
      const peerInfo = new PeerInfoReadOnly(request);

      // only relevant if peer public key exists in store and type is of PING
      if (this.getPeerInfo().id == peerInfo.id) {
        throw Error('peer message is from self');
      } else if (!this.hasPeer(peerInfo.id)) {
        throw Error('peer does not exist in store');
      }

      // update the peer store
      if (this.hasPeer(peerInfo.id)) {
        this.updatePeer(peerInfo);
      } else {
        this.updatePeer(peerInfo);
      }

      this.emit('found', peerInfo.publicKey);
    } catch (err) {
      // Couldn't decode message
      // We don't want the multicast discovery to error on every message it coudln't decode!
    }
  }
}

export default MulticastBroadcaster;
