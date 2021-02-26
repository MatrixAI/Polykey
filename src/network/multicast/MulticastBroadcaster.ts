import dgram from 'dgram';
import { EventEmitter } from 'events';
import { PK_NODE_MULTICAST_PORT, PK_NODE_MULTICAST_HOST } from '../../config';
import KeyManager from '../../keys/KeyManager';
import { Node, NodePeer } from '../../nodes/Node';

// This module is based heavily on libp2p's mDNS module:
// https://github.com/libp2p/js-libp2p-mdns
// It is supposed to discover nodes on the local network
// This module was also generated with the help of:
// https://nrempel.com/using-udp-multicast-with-node-js/
//
// """
// In computer networking, the multicast DNS (mDNS) protocol
// resolves hostnames to IP addresses within small networks
// that do not include a local name server
// """

class MulticastBroadcaster extends EventEmitter {
  getNodeInfo: () => Node;
  hasNode: (id: string) => boolean;
  addNode: (nodeInfo: NodePeer) => void;
  updateNode: (nodeInfo: NodePeer) => void;
  private keyManager: KeyManager;

  private socket: dgram.Socket;

  private interval = 1e5;
  private broadcastInterval: ReturnType<typeof setInterval> | null = null;
  constructor(
    getNodeInfo: () => Node,
    hasNode: (id: string) => boolean,
    addNode: (nodeInfo: NodePeer) => void,
    updateNode: (nodeInfo: NodePeer) => void,
    keyManager: KeyManager,
  ) {
    super();

    this.getNodeInfo = getNodeInfo;
    this.hasNode = hasNode;
    this.addNode = addNode;
    this.updateNode = updateNode;
    this.keyManager = keyManager;

    // Create socket
    this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    this.socket.bind(PK_NODE_MULTICAST_PORT as number);

    // Set up listener
    this.socket.on(
      'listening',
      (() => {
        this.socket.addMembership(PK_NODE_MULTICAST_HOST);
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
      const nodeInfoPem = this.getNodeInfo().toX509Pem(
        this.keyManager.getPrivateKey(),
      );
      this.socket.send(
        nodeInfoPem,
        0,
        nodeInfoPem.length,
        PK_NODE_MULTICAST_PORT as number,
        PK_NODE_MULTICAST_HOST,
      );
    };

    // Immediately start a query, then do it every interval.
    broadcast();
    this.broadcastInterval = setInterval(broadcast, this.interval);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async handleBroadcastMessage(request: any, rinfo: any) {
    try {
      // construct a node info object
      const nodeInfo = new NodePeer(request);

      // only relevant if node public key exists in store and type is of PING
      if (this.getNodeInfo().id == nodeInfo.id) {
        throw Error('node message is from self');
      } else if (!this.hasNode(nodeInfo.id)) {
        throw Error('node does not exist in store');
      }

      // update the node store
      if (this.hasNode(nodeInfo.id)) {
        this.updateNode(nodeInfo);
      } else {
        this.updateNode(nodeInfo);
      }

      this.emit('found', nodeInfo.publicKey);
    } catch (err) {
      // Couldn't decode message
      // We don't want the multicast discovery to error on every message it coudln't decode!
    }
  }
}

export default MulticastBroadcaster;
