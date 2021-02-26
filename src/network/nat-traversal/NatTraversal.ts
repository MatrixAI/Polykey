import dgram from 'dgram';
import { PK_BOOTSTRAP_HOSTS, PUBLIC_RELAY_NODE } from '../../config';
import { promisifyGrpc } from '../../bin/utils';
import * as agentInterface from '../../../proto/js/Agent_pb';
import NodeConnection from '../../nodes/node-connection/NodeConnection';
import { Address, Node, NodePeer } from '../../nodes/Node';
import NodeRelay from '../relays/NodeRelay';
import { pki } from 'node-forge';
import Logger from '@matrixai/logger';
import { promisify } from 'util';

class NatTraversal {
  private listNodes: () => string[];
  private getNodeInfo: (nodeId: string) => NodePeer | null;
  private updateNodeInfo: (nodeInfo: NodePeer) => void;
  private connectToNode: (nodeId: string) => NodeConnection;
  private getLocalNodeInfo: () => Node;
  private getPrivateKey: () => pki.rsa.PrivateKey;
  private logger: Logger;
  private nodeDisconnect: Map<string, NodeJS.Timeout>;

  private localSocket: dgram.Socket;

  // node node id -> address
  private keepAliveAddressList: Map<
    string,
    { address: Address; attempts: number }
  > = new Map();
  // nodeId -> attempts to reconnect
  private unresponsiveNodes: Map<string, number> = new Map();
  // only happens on non-relay nodes
  // eslint-disable-next-line no-undef
  private keepAliveInterval: NodeJS.Timeout;

  // === Node Relays === //
  // nodeId -> {socket: dgram.Socket, relay?: NodeRelay}
  private nodeRelays: Map<
    string,
    { socket: dgram.Socket; relay?: NodeRelay }
  > = new Map();

  // === Node Hole Punches === //
  constructor(
    listNodes: () => string[],
    getNodeInfo: (nodeId: string) => NodePeer,
    updateNodeInfo: (nodeInfo: NodePeer) => void,
    connectToNode: (nodeId: string) => NodeConnection,
    getLocalNodeInfo: () => Node,
    getPrivateKey: () => pki.rsa.PrivateKey,
    logger: Logger,
  ) {
    this.listNodes = listNodes;
    this.getNodeInfo = getNodeInfo;
    this.updateNodeInfo = updateNodeInfo;
    this.connectToNode = connectToNode;
    this.getLocalNodeInfo = getLocalNodeInfo;
    this.getPrivateKey = getPrivateKey;
    this.logger = logger;
    this.nodeDisconnect = new Map<string, NodeJS.Timeout>();
  }

  async start(socket: dgram.Socket): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        this.localSocket = socket;
        this.localSocket.addListener(
          'message',
          this.natClientMessageHandler.bind(this),
        );
        // don't need to send keepalive packets if node is a relay node
        if (!PUBLIC_RELAY_NODE) {
          this.keepAliveInterval = setInterval(async () => {
            for (const nodeId of this.listNodes()) {
              try {
                let address: Address;
                let currentAttempts: number;
                const entry = this.keepAliveAddressList.get(nodeId);
                if (entry) {
                  address = entry.address;
                  currentAttempts = entry.attempts;
                } else {
                  // connect to node (direct only)
                  const client = await this.connectToNode(nodeId).getNodeClient(
                    true,
                  );
                  // get udp address
                  const req = new agentInterface.NodeInfoReadOnlyMessage();
                  req.setNodeId(this.getLocalNodeInfo().id);
                  req.setPem(
                    this.getLocalNodeInfo().toX509Pem(this.getPrivateKey()),
                  );
                  const res = (await promisifyGrpc(
                    client.getUDPAddress.bind(client),
                  )(req)) as agentInterface.StringMessage;
                  address = Address.parse(res.getS());
                  currentAttempts = 0;
                }
                if (currentAttempts >= 2) {
                  this.logger.info(`node has become unresponsive: '${nodeId}'`);
                  this.unresponsiveNodes.set(
                    nodeId,
                    (this.unresponsiveNodes.get(nodeId) ?? 0) + 1,
                  );
                  this.keepAliveAddressList.delete(nodeId);
                } else {
                  // send an initial keepalive packet to create the NAT layer table entry
                  this.localSocket.send(
                    `keepalive-${this.getLocalNodeInfo().id}`,
                    address.port,
                    address.host,
                  );
                  this.keepAliveAddressList.set(nodeId, {
                    address,
                    attempts: currentAttempts + 1,
                  });
                }
              } catch (error) {
                // no throw
              }
            }
          }, 5000);
        }
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  stop() {
    if (this.localSocket) {
      try {
        this.localSocket.close();
      } catch (error) {
        // no throw
      }
    }
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }
  }

  static KeepaliveRegex = /^keepalive-([\w]{32})$/;
  static OkayKeepaliveRegex = /^okay-keepalive-([\w]{32})$/;

  private async natClientMessageHandler(
    message: Buffer,
    rinfo: dgram.RemoteInfo,
  ) {
    const address = Address.fromAddressInfo(rinfo);
    try {
      if (NatTraversal.OkayKeepaliveRegex.test(message.toString())) {
        const nodeId = message
          .toString()
          .match(NatTraversal.OkayKeepaliveRegex)![1];
        const entry = this.keepAliveAddressList.get(nodeId);
        this.unresponsiveNodes.delete(nodeId);
        this.keepAliveAddressList.set(nodeId, {
          address: entry?.address ?? address,
          attempts: 0,
        });
        this.logger.info(
          `okay-keepalive packet from public relay node: ${nodeId} at address: ${address.toString()}`,
        );
      }
    } catch (error) {
      // no throw
      this.logger.error(error);
    }
  }

  private natServerMessageHandler(nodeId: string) {
    const handler = async (message: Buffer, rinfo: dgram.RemoteInfo) => {
      const address = Address.fromAddressInfo(rinfo);
      try {
        // send back okay-keepalive message only if public relay node
        if (
          NatTraversal.KeepaliveRegex.test(message.toString()) &&
          PUBLIC_RELAY_NODE
        ) {
          const fromNodeId = message
            .toString()
            .match(NatTraversal.KeepaliveRegex)![1];
          // only send back keep alive if node is a public relay node
          // (i.e. only public relay nodes offer nat traversal)
          const socket = this.nodeRelays.get(nodeId)!.socket;
          socket.send(
            `okay-keepalive-${this.getLocalNodeInfo().id}`,
            address.port,
            address.host,
          );
          this.nodeDisconnect.get(nodeId)?.refresh();
          // set up a relay for the new node if it doesn't exist yet
          if (!this.nodeRelays.get(fromNodeId)?.relay) {
            const relay = new NodeRelay(
              this.getLocalNodeInfo().id,
              socket,
              address,
              this.logger.getChild('NodeRelay'),
            );
            await relay.start();
            // finally set the node relay
            this.nodeRelays.set(fromNodeId, { socket, relay });
            // update node storeZ with new relayed address
            const nodeInfoReadOnly = this.getNodeInfo(fromNodeId);
            if (nodeInfoReadOnly) {
              nodeInfoReadOnly.nodeAddress = relay.relayedAddress;
              this.updateNodeInfo(nodeInfoReadOnly);
            }
            this.logger.info(`created node relay for nodeId: ${fromNodeId}`);
          }
        }
      } catch (error) {
        // no throw
        this.logger.error(error);
      }
    };
    return handler;
  }

  // Public methods
  async getUDPAddressForNode(nodeId: string): Promise<Address> {
    // eslint-disable-next-line no-async-promise-executor
    return await new Promise<Address>(async (resolve, reject) => {
      try {
        const entry = this.nodeRelays.get(nodeId);
        if (entry) {
          this.logger.info(`removing node relay for nodeId: ${nodeId}`);
          try {
            await this.nodeRelays.get(nodeId)?.relay?.stop();
            await promisify(entry.socket.close.bind(entry.socket))();
          } catch (error) {
            // no throw
          }
          this.nodeRelays.delete(nodeId);
        }
        this.logger.info(`creating new UDP Socket for nodeId: ${nodeId}`);
        const host = PK_BOOTSTRAP_HOSTS ?? '0.0.0.0';
        const socket = dgram.createSocket(
          'udp4',
          this.natServerMessageHandler(nodeId).bind(this),
        );
        this.nodeDisconnect.set(
          nodeId,
          setTimeout(() => {
            socket.close();
            this.logger.info(`disconnected from nodeID: ${nodeId}`);
          }, 10000),
        );
        socket.bind(0, host, () => {
          const address = Address.fromAddressInfo(socket.address());
          if (PK_BOOTSTRAP_HOSTS) {
            address.updateHost(PK_BOOTSTRAP_HOSTS);
          }
          this.nodeRelays.set(nodeId, { socket });
          this.logger.info(
            `new UDP Socket for nodeId: ${nodeId} successfully created at: ${address.toString()}`,
          );
          resolve(address);
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  getNodeRelayAddress(nodeId: string): Address | undefined {
    return this.nodeRelays.get(nodeId)?.relay?.relayedAddress;
  }
  getLocalSocket(): dgram.Socket {
    return this.localSocket;
  }
}

export default NatTraversal;
