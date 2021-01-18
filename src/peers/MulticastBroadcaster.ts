import dgram from 'dgram';
import PeerInfo from './PeerInfo';
import { EventEmitter } from 'events';
import { peerInterface } from '../../proto/js/Peer';
import KeyManager from '../keys/KeyManager';
import { protobufToString, stringToProtobuf } from '../utils';

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
  updatePeer: (peerInfo: PeerInfo) => void;
  private keyManager: KeyManager;

  private socket: dgram.Socket;

  private interval = 1e5;
  private broadcastInterval: NodeJS.Timeout | null = null;
  constructor(
    getPeerInfo: () => PeerInfo,
    hasPeer: (id: string) => boolean,
    updatePeer: (peerInfo: PeerInfo) => void,
    keyManager: KeyManager,
  ) {
    super();

    this.getPeerInfo = getPeerInfo;
    this.hasPeer = hasPeer;
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
        const address = this.socket.address();

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
      const peerInfo = this.getPeerInfo();
      const encodedPeerInfo = peerInterface.PeerInfoMessage.encodeDelimited({
        publicKey: peerInfo.publicKey,
        peerAddress: peerInfo.peerAddress?.toString(),
        apiAddress: peerInfo.apiAddress?.toString(),
      }).finish();
      // sign it for authenticity
      const signedPeerInfo = await this.keyManager.signData(Buffer.from(protobufToString(encodedPeerInfo)));
      const encodedPeerMessage = peerInterface.PeerMessage.encodeDelimited({
        type: peerInterface.SubServiceType.PING_PEER,
        publicKey: this.getPeerInfo().publicKey,
        subMessage: signedPeerInfo.toString(),
      }).finish();
      this.socket.send(encodedPeerMessage, 0, encodedPeerMessage.length, UDP_MULTICAST_PORT, UDP_MULTICAST_ADDR);
    };

    // Immediately start a query, then do it every interval.
    broadcast();
    this.broadcastInterval = setInterval(broadcast, this.interval);
  }

  private async handleBroadcastMessage(request: any, rinfo: any) {
    try {
      const { publicKey: signingKey, type, subMessage } = peerInterface.PeerMessage.decodeDelimited(request);

      // only relevant if peer public key exists in store and type is of PING
      if (!this.hasPeer(signingKey)) {
        throw Error('peer does not exist in store');
      } else if (this.getPeerInfo().publicKey == signingKey) {
        throw Error('peer message is from self');
      } else if (!(type == peerInterface.SubServiceType.PING_PEER)) {
        throw Error(`peer message is not of type PING, type is: ${peerInterface.SubServiceType[type]}`);
      }

      // verify the subMessage
      const verifiedMessage = await this.keyManager.verifyData(subMessage, Buffer.from(signingKey));
      const encodedMessage = stringToProtobuf(verifiedMessage.toString());

      const { publicKey, rootCertificate, peerAddress, apiAddress } = peerInterface.PeerInfoMessage.decodeDelimited(
        encodedMessage,
      );

      // construct a peer info object
      const peerInfo = new PeerInfo(publicKey, rootCertificate, peerAddress, apiAddress);
      // update the peer store
      this.updatePeer(peerInfo);

      this.emit('found', publicKey);
    } catch (err) {
      // Couldn't decode message
      // We don't want the multicast discovery to error on every message it coudln't decode!
    }
  }
}

export default MulticastBroadcaster;
