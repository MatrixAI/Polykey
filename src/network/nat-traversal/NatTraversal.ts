import dgram from 'dgram'
import { promisifyGrpc } from '../../bin/utils';
import * as agentInterface from '../../../proto/js/Agent_pb';
import NodeConnection from '../../nodes/node-connection/NodeConnection';
import { Address, NodeInfo, NodeInfoReadOnly } from '../../nodes/NodeInfo';
import NodeRelay from '../relays/NodeRelay';
import { pki } from 'node-forge';
import Logger from '@matrixai/logger'
import { promisify } from 'util';

class NatTraversal {
  private listNodes: () => string[];
  private getNode: (nodeId: string) => NodeInfoReadOnly | null;
  private updateNode: (nodeInfo: NodeInfoReadOnly) => void;
  private connectToNode: (nodeId: string) => NodeConnection;
  private getLocalNodeInfo: () => NodeInfo;
  private getPrivateKey: () => pki.rsa.PrivateKey;
  private logger: Logger;

  private localSocket: dgram.Socket

  // node node id -> address
  private keepAliveAddressList: Map<string, { address: Address, attempts: number }> = new Map
  // nodeId -> attempts to reconnect
  private unresponsiveNodes: Map<string, number> = new Map
  // only happens on non-relay nodes
  private keepAliveInterval: NodeJS.Timeout

  // relayed UDP sockets
  // nodeId -> dgram.Socket
  private relayedSockets: Map<string, dgram.Socket> = new Map

  // === Node Relays === //
  private nodeRelays: Map<string, NodeRelay> = new Map

  // === Node Hole Punches === //
  constructor(
    listNodes: () => string[],
    getNode: (nodeId: string) => NodeInfoReadOnly,
    updateNode: (nodeInfo: NodeInfoReadOnly) => void,
    connectToNode: (nodeId: string) => NodeConnection,
    getLocalNodeInfo: () => NodeInfo,
    getPrivateKey: () => pki.rsa.PrivateKey,
    logger: Logger
  ) {
    this.listNodes = listNodes
    this.getNode = getNode
    this.updateNode = updateNode
    this.connectToNode = connectToNode
    this.getLocalNodeInfo = getLocalNodeInfo
    this.getPrivateKey = getPrivateKey
    this.logger = logger
  }

  async start(socket: dgram.Socket): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        this.localSocket = socket
        this.localSocket.addListener('message', this.natClientMessageHandler.bind(this))
        // don't need to send keepalive packets if node is a relay node
        if (!process.env.PUBLIC_RELAY_NODE) {
          this.keepAliveInterval = setInterval(async () => {
            for (const nodeId of this.listNodes()) {
              if (!this.unresponsiveNodes.get(nodeId) ?? 0 < 5) {
                try {
                  let address: Address
                  let currentAttempts: number
                  const entry = this.keepAliveAddressList.get(nodeId)
                  if (entry) {
                    address = entry.address
                    currentAttempts = entry.attempts
                  } else {
                    // connect to node (direct only)
                    const client = await this.connectToNode(nodeId).getNodeClient(true)
                    // get udp address
                    const req = new agentInterface.NodeInfoReadOnlyMessage()
                    req.setNodeId(this.getLocalNodeInfo().id)
                    req.setPem(this.getLocalNodeInfo().toX509Pem(this.getPrivateKey()))
                    const res = (await promisifyGrpc(client.getUDPAddress.bind(client))(req)) as agentInterface.StringMessage;
                    address = Address.parse(res.getS())
                    currentAttempts = 0
                  }
                  if (currentAttempts >= 5) {
                    this.logger.info(`node has become unresponsive: '${nodeId}'`)
                    this.unresponsiveNodes.set(nodeId, (this.unresponsiveNodes.get(nodeId) ?? 0) + 1)
                    this.keepAliveAddressList.delete(nodeId)
                  } else {
                    // send an initial keepalive packet to create the NAT layer table entry
                    this.localSocket.send(`keepalive-${this.getLocalNodeInfo().id}`, address.port, address.host)
                    this.keepAliveAddressList.set(nodeId, { address, attempts: currentAttempts + 1 })
                  }
                } catch (error) {
                  // no throw
                }
              }
            }
          }, 5000)
        }
        resolve()
      } catch (error) {
        reject(error)
      }
    })
  }

  stop() {
    if (this.localSocket) {
      this.localSocket.close()
    }
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval)
    }
  }

  static KeepaliveRegex = /^keepalive-([\w]{32})$/
  static OkayKeepaliveRegex = /^okay-keepalive-([\w]{32})$/

  private async natClientMessageHandler(message: Buffer, rinfo: dgram.RemoteInfo) {
    const address = Address.fromAddressInfo(rinfo)
    try {
      if (NatTraversal.OkayKeepaliveRegex.test(message.toString())) {
        const nodeId = message.toString().match(NatTraversal.OkayKeepaliveRegex)![1]
        const entry = this.keepAliveAddressList.get(nodeId)
        this.unresponsiveNodes.delete(nodeId)
        this.keepAliveAddressList.set(nodeId, { address: entry?.address ?? address, attempts: 0 })
        this.logger.info(`okay-keepalive packet from public relay node: ${nodeId} at address: ${address.toString()}`);
      }
    } catch (error) {
      // no throw
      this.logger.error(error);
    }
  }

  private natServerMessageHandler(nodeId: string) {
    const handler = async (message: Buffer, rinfo: dgram.RemoteInfo) => {
      const address = Address.fromAddressInfo(rinfo)
      try {
        // send back okay-keepalive message only if public relay node
        if (NatTraversal.KeepaliveRegex.test(message.toString()) && process.env.PUBLIC_RELAY_NODE) {
          const fromNodeId = message.toString().match(NatTraversal.KeepaliveRegex)![1]
          // only send back keep alive if node is a public relay node
          // (i.e. only public relay nodes offer nat traversal)
          const socket = this.relayedSockets.get(nodeId)!
          socket.send(`okay-keepalive-${this.getLocalNodeInfo().id}`, address.port, address.host)

          // set up a relay for the new node if it doesn't exist yet
          const nodeInfoReadOnly = this.getNode(fromNodeId)
          if (!this.nodeRelays.has(fromNodeId) && nodeInfoReadOnly) {
            const nodeRelay = new NodeRelay(this.getLocalNodeInfo().id, socket, address)
            await nodeRelay.start()
            // update node store with new relayed address
            nodeInfoReadOnly.nodeAddress = nodeRelay.relayedAddress
            this.updateNode(nodeInfoReadOnly)
            // finally set the node relay
            this.nodeRelays.set(fromNodeId, nodeRelay)
            this.logger.info(`created node relay for nodeId: ${fromNodeId}`)
          }
        }
      } catch (error) {
        // no throw
        this.logger.error(error);
      }
    }
    return handler
  }

  // Public methods
  async getUDPAddressForNode(nodeId: string): Promise<Address> {
    return await new Promise<Address>(async (resolve, reject) => {
      try {
        if (this.nodeRelays.has(nodeId)) {
          this.logger.info(`removing existing MTP Relay for nodeId: ${nodeId}`)
          await this.nodeRelays.get(nodeId)?.stop()
          this.nodeRelays.delete(nodeId)
        }
        if (this.relayedSockets.has(nodeId)) {
          this.logger.info(`removing existing UDP Socket for nodeId: ${nodeId}`)
          const socket = this.relayedSockets.get(nodeId)
          if (socket) {
            await promisify(socket.close.bind(socket))()
          }
          this.relayedSockets.delete(nodeId)
        }
        this.logger.info(`creating new UDP Socket for nodeId: ${nodeId}`)
        const host = process.env.PK_PEER_HOST ?? '0.0.0.0'
        const socket = dgram.createSocket('udp4', this.natServerMessageHandler(nodeId).bind(this))
        socket.bind(0, host, () => {
          const address = Address.fromAddressInfo(socket.address())
          if (process.env.PK_PEER_HOST) {
            address.updateHost(process.env.PK_PEER_HOST)
          }
          this.relayedSockets.set(nodeId, socket)
          this.logger.info(`new UDP Socket for nodeId: ${nodeId} successfully created at: ${address.toString()}`)
          resolve(address)
        })
      } catch (error) {
        reject(error)
      }
    })
  }
  getNodeRelayAddress(nodeId: string): Address | undefined {
    return this.nodeRelays.get(nodeId)?.relayedAddress
  }
  getLocalSocket(): dgram.Socket {
    return this.localSocket
  }
}

export default NatTraversal
