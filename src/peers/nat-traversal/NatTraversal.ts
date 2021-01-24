import net from 'net';
import dgram from 'dgram';
import { EventEmitter } from 'events';
import { promiseAll, sleep } from '../../utils';
import PeerInfo, { Address } from '../PeerInfo';
import PeerConnection from '../peer-connection/PeerConnection';
import * as peerInterface from '../../proto/js/Peer_pb';
import { MTPConnection, MTPServer } from './micro-transport-protocol/MTPServer';

class NatTraversal extends EventEmitter {
  private listPeers: () => string[];
  private getPeer: (id: string) => PeerInfo | null;
  private connectToPeer: (id: string) => PeerConnection;
  private getPeerInfo: () => PeerInfo;
  private hasPeer: (id: string) => boolean;
  private updatePeer: (peerInfo: PeerInfo) => void;

  // This is storing the peer ids that don't respond to connection requests
  private unresponsiveNodes: Map<string, number> = new Map();

  server: MTPServer;

  // this is a list of all sockets that are waiting to be turned into holePunchedConnections
  // so this node (if private) requests adjacent, connected nodes to create a hole punched
  // connection to this node for all other udp hole punch coordination requests. e.g. if
  // another node wants to connect to this one via a intermediary public node, then the
  // coordination (i.e. creating rules in the routing table by sending packets to the other
  // private node's public ip address)
  // peerId -> dgram.Socket
  private pendingHolePunchedSockets: Map<string, dgram.Socket> = new Map();

  // these connections are from adjacent public nodes back to this (private) node
  // to facilitate udp hole punching
  // peerId -> connection
  private holePunchedConnections: Map<string, MTPConnection> = new Map();

  // these servers are localhost relays only and are intended to allow our gRPC
  // peer server able to serve over a udp hole punched connection
  // peerId -> tcp relay server
  private outgoingTCPHolePunchedRelayServers: Map<string, net.Server> = new Map();

  // these servers are relays for other private nodes who cannot use udp hole
  // punching to connect to other peers.
  // these will only be useful in the case of the current node being public and
  // also able to relay a private node's gRPC connection
  // peerId -> peer relay servers
  private peerTCPHolePunchedRelayServers: Map<string, net.Server> = new Map();

  // interval with which the server requests new direct hole punched connections
  // from adjacent peers that are in the store but have not yet been requested yet
  // without this purposeful seeking of connections from private nodes to public nodes
  // the private node could not receive hole punch coordination requests from the public nodes
  // in the case of another private node trying to connect to it.
  private intermittentConnectionInterval: NodeJS.Timeout;

  constructor(
    listPeers: () => string[],
    getPeer: (id: string) => PeerInfo | null,
    connectToPeer: (id: string) => PeerConnection,
    getPeerInfo: () => PeerInfo,
    hasPeer: (id: string) => boolean,
    updatePeer: (peerInfo: PeerInfo) => void,
  ) {
    super();

    this.listPeers = listPeers;
    this.getPeer = getPeer;
    this.connectToPeer = connectToPeer;
    this.getPeerInfo = getPeerInfo;
    this.hasPeer = hasPeer;
    this.updatePeer = updatePeer;
    this.server = new MTPServer(this.connectionHandler.bind(this), this.handleNATMessageUDP.bind(this));
    const port = parseInt(process.env.PK_PEER_PORT ?? '0');
    this.server.listenPort(port, () => {
      const address = this.server.address();
      console.log(`main MTP server is now listening on address: '${address.toString()}'`);
    });

    // this is just to make sure every other peer has a back connection to this node
    // the idea behind this is that if we are a node that is behind a NAT, then if
    // another node wants to connect via an adjacent node were already connected to,
    // then that node that has to be able to notify us of the connection attempt for
    // coordination purposes.
    // TODO: this should only be done if the node detects that it is behind a NAT layer
    this.intermittentConnectionInterval = setInterval(async () => {
      const promiseList: Promise<void>[] = [];
      for (const peerId of this.listPeers()) {
        if (!this.server.incomingConnections.has(peerId)) {
          const count = this.unresponsiveNodes.get(peerId) ?? 0;
          if (count < 3) {
            this.unresponsiveNodes.set(peerId, count + 1);
            const peerInfo = this.getPeer(peerId)!;
            const udpAddress = await this.requestUDPAddress(peerInfo.id);
            promiseList.push(this.sendDirectHolePunchConnectionRequest(udpAddress));
          }
        }
      }
      await promiseAll(promiseList);
    }, 30000);
  }

  // request the MTP UDP address of a peer
  // there are only two addresses for a peer:
  // 1) the tcp address which is where the raw gRPC service is exposed
  // 2) the udp address which is where that gRPC service is relayed on using MTP
  async requestUDPAddress(peerId: string): Promise<Address> {
    const pc = this.connectToPeer(peerId);

    const request = new peerInterface.NatMessage
    request.setType(peerInterface.NatMessageType.UDP_ADDRESS)
    const response = await pc.sendPeerRequest(peerInterface.SubServiceType.NAT_TRAVERSAL, request.serializeBinary());
    const decodedResponse = peerInterface.NatMessage.deserializeBinary(response)
    const type = decodedResponse.getType()
    const subMessage = decodedResponse.getSubMessage_asU8()
    if (type != peerInterface.NatMessageType.UDP_ADDRESS) {
      throw Error('peer did not send back proper response');
    }
    const { address: addressString } = peerInterface.UDPAddressMessage.deserializeBinary(subMessage).toObject();
    const address = Address.parse(addressString);
    address.updateHost(this.getPeer(peerId)!.peerAddress?.host);
    return address;
  }

  // This request will timeout after 'timeout' milliseconds (defaults to 10 seconds)
  async requestUDPHolePunchDirectly(targetPeerId: string, timeout = 10000): Promise<Address> {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.hasPeer(targetPeerId)) {
          throw Error(`target peer id does not exist in store: ${targetPeerId}`);
        } else if (this.outgoingTCPHolePunchedRelayServers.has(targetPeerId)) {
          // the outgoing tcp server might already be set up for this peer
          const addressInfo = this.outgoingTCPHolePunchedRelayServers.get(targetPeerId)!.address() as net.AddressInfo;
          return Address.fromAddressInfo(addressInfo);
        } else if (!this.holePunchedConnections.has(targetPeerId)) {
          throw Error(`target peer id does not exist in hole punched connections: ${targetPeerId}`);
        }

        const conn = this.holePunchedConnections.get(targetPeerId)!;
        // need to set up a local relay server between the new connection and the gRPC server!
        // this will include 2 socket pipes:
        // 1. one from the grpc connection to the local relay server (tcp packets)
        // 2. another one from the local relay server to the hole punched server address (udp/mtp packets)
        const newServer = net
          .createServer((tcpConn) => {
            tcpConn.on('data', (data) => conn.write(data));
            conn.on('data', (data) => tcpConn.write(data));
          })
          .listen(0, '127.0.01', () => {
            this.outgoingTCPHolePunchedRelayServers.set(targetPeerId, newServer);
            resolve(Address.fromAddressInfo(newServer.address() as net.AddressInfo));
          });
      } catch (error) {
        reject(error);
      }
    });
  }

  // This request will timeout after 'timeout' milliseconds (defaults to 10 seconds)
  async requestUDPHolePunchViaPeer(targetPeerId: string, adjacentPeerId: string, timeout = 10000): Promise<Address> {
    return new Promise(async (resolve, reject) => {
      setTimeout(() => reject(Error('hole punch connection request timed out')), timeout);
      try {
        if (!this.hasPeer(targetPeerId)) {
          throw Error(`target peer id does not exist in store: ${targetPeerId}`);
        } else if (!this.hasPeer(adjacentPeerId)) {
          throw Error(`adjacent peer id does not exist in store: ${adjacentPeerId}`);
        }
        const udpAddress = await this.requestUDPAddress(adjacentPeerId);
        await this.sendHolePunchRequest(udpAddress, targetPeerId);

        this.on('hole-punch-connection', (peerId: string, conn: MTPConnection) => {
          // need to set up a local relay server between the new connection and the gRPC server!
          // this will include 2 socket pipes:
          // 1. one from the grpc connection to the local relay server (tcp packets)
          // 2. another one from the local relay server to the hole punched server address (udp/mtp packets)
          const newServer = net
            .createServer((tcpConn) => {
              tcpConn.on('data', (data) => conn.write(data));
              conn.on('data', (data) => tcpConn.write(data));
            })
            .listen(0, '127.0.01', () => {
              this.outgoingTCPHolePunchedRelayServers.set(peerId, newServer);
              resolve(Address.fromAddressInfo(newServer.address() as net.AddressInfo));
            });
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // This request will timeout after 'timeout' milliseconds (defaults to 10 seconds)
  async requestUDPRelay(targetPeerId: string, adjacentPeerId: string, timeout = 10000): Promise<Address> {
    return new Promise(async (resolve, reject) => {
      setTimeout(() => reject(Error('relay connection request timed out')), timeout);
      try {
        if (!this.hasPeer(targetPeerId)) {
          throw Error(`target peer id does not exist in store: ${targetPeerId}`);
        } else if (!this.hasPeer(adjacentPeerId)) {
          throw Error(`adjacent peer id does not exist in store: ${adjacentPeerId}`);
        }
        const udpAddress = await this.requestUDPAddress(adjacentPeerId);
        await this.sendHolePunchRequest(udpAddress, targetPeerId);

        this.on('hole-punch-connection', (peerId: string, conn: MTPConnection) => {
          // need to set up a local relay server between the new connection and the gRPC server!
          // this will include 2 socket pipes:
          // 1. one from the grpc connection to the local relay server (tcp packets)
          // 2. another one from the local relay server to the hole punched server address (udp/mtp packets)
          const newServer = net
            .createServer((tcpConn) => {
              tcpConn.on('data', (data) => conn.write(data));
              conn.on('data', (data) => tcpConn.write(data));
            })
            .listen(0, '127.0.01', () => {
              this.outgoingTCPHolePunchedRelayServers.set(peerId, newServer);
              resolve(Address.fromAddressInfo(newServer.address() as net.AddressInfo));
            });
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // ===================================================== //
  // ================ initiation messages ================ //
  // ===================================================== //
  // these messages are the first step in nat traversal
  // the handlers at the bottom of this file are the last step
  // this method is for creating a direct hole punch from an
  // adjacent peer back to this one in case of a restrictive NAT layer
  // the resulting connection will be used in coordinating NAT traversal
  // requests from other peers via the peer adjacent to this one
  async sendDirectHolePunchConnectionRequest(udpAddress: Address) {
    const message = new peerInterface.PeerInfoMessage
    const peerInfo = this.getPeerInfo()
    message.setPublicKey(peerInfo.publicKey)
    message.setRootCertificate(peerInfo.rootCertificate)
    if (peerInfo.peerAddress) {
      message.setPeerAddress(peerInfo.peerAddress?.toString())
    }
    if (peerInfo.apiAddress) {
      message.setApiAddress(peerInfo.apiAddress?.toString())
    }
    this.sendNATMessage(udpAddress, peerInterface.NatMessageType.DIRECT_CONNECTION, message.serializeBinary());
  }

  // this request is for when the current node cannot connect directly
  // to the target peer and wants to use an adjacent node. Note the adjacent
  // node must also be known before requesting and that is what the udpAddress
  // parameter is for
  async sendHolePunchRequest(udpAddress: Address, targetPeerId: string) {
    return new Promise<void>((resolve, reject) => {
      try {
        // create socket
        const socket = dgram.createSocket('udp4');
        socket.bind();
        socket.on('listening', () => {
          // create request
          const request = new peerInterface.HolePunchConnectionMessage
          request.setOriginPeerId(this.getPeerInfo().id)
          request.setTargetPeerId(targetPeerId)
          request.setUdpAddress(Address.fromAddressInfo(socket.address()).toString())

          this.sendNATMessage(udpAddress, peerInterface.NatMessageType.HOLE_PUNCH_CONNECTION, request.serializeBinary(), socket);
          resolve();
        });

        socket.on('message', (message: Buffer, rinfo: dgram.RemoteInfo) => {
          const address = new Address(rinfo.address, rinfo.port);
          this.handleNATMessageUDP(message, address);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // this is just a convenience function to wrap a message in a NATMessage to then send via the MTP server socket
  private sendNATMessage(
    udpAddress: Address,
    type: peerInterface.NatMessageType,
    message: Uint8Array,
    socket?: dgram.Socket,
  ) {
    const request = new peerInterface.NatMessage
    request.setType(type)
    request.setSubMessage(message)
    if (socket) {
      socket.send(request.serializeBinary(), udpAddress.port, udpAddress.host);
    } else {
      this.server.socket.send(request.serializeBinary(), udpAddress.port, udpAddress.host);
    }
  }

  // ==== Handler Methods ==== //
  connectionHandler(conn: MTPConnection) {
    // first check if the connection is for nat message handler
    // if it isn't try to send it to the gRPC service relayed via an internal MTP connection
    const grpcAddress = this.getPeerInfo().peerAddress!;
    const grpcConn = net.createConnection({ port: grpcAddress?.port, host: grpcAddress?.host });
    grpcConn.on('data', (data) => conn.write(data));
    conn.on('data', async (data) => {
      // first try the nat message handler, might be a hole punch or relay request
      try {
        return await this.handleNATMessageUDP(data, conn.address());
      } catch (error) {
        // don't want to throw so just log
        console.log(`new MTP connection error: ${error}`);
      }
      // this is now assumed to be a message for grpc so need to pipe it over
      grpcConn.write(data);
    });
  }

  async handleNatMessageGRPC(request: Uint8Array): Promise<Uint8Array> {
    const decodedRequest = peerInterface.NatMessage.deserializeBinary(request)
    const type = decodedRequest.getType()
    const subMessage = decodedRequest.getSubMessage_asU8()
    let response: Uint8Array;
    switch (type) {
      case peerInterface.NatMessageType.UDP_ADDRESS:
        {
          const encodedResponse = new peerInterface.UDPAddressMessage
          encodedResponse.setAddress(this.server.address().toString())
          response = encodedResponse.serializeBinary()
        }
        break;
      case peerInterface.NatMessageType.DIRECT_CONNECTION:
        throw Error('not implemented');
      case peerInterface.NatMessageType.HOLE_PUNCH_CONNECTION:
        throw Error('not implemented');
      case peerInterface.NatMessageType.RELAY_CONNECTION:
        // the relay connection request will come through the grpc channel
        response = await this.handleRelayRequest(subMessage);
        break;
      default: {
        throw Error('git message type not supported');
      }
    }
    // encode a git response
    const encodedResponse = new peerInterface.NatMessage
    encodedResponse.setType(type)
    encodedResponse.setSubMessage(response)
    return encodedResponse.serializeBinary();
  }

  private async handleNATMessageUDP(message: Buffer, address: Address) {
    const decodedRequest = peerInterface.NatMessage.deserializeBinary(message)
    const type = decodedRequest.getType()
    const isResponse = decodedRequest.getIsResponse()
    const subMessage = decodedRequest.getSubMessage_asU8()
    switch (type) {
      case peerInterface.NatMessageType.UDP_ADDRESS:
        throw Error('message type not supported via udp, try grpc connection');
      case peerInterface.NatMessageType.DIRECT_CONNECTION:
        await this.handleDirectConnectionRequest(address, isResponse, subMessage);
        break;
      case peerInterface.NatMessageType.HOLE_PUNCH_CONNECTION:
        await this.handleHolePunchRequest(address, isResponse, subMessage);
        break;
      case peerInterface.NatMessageType.RELAY_CONNECTION:
        throw Error('message type not supported via udp, try grpc connection');
      default:
        break;
    }
  }

  private async handleDirectConnectionRequest(address: Address, isResponse: boolean, request: Uint8Array) {
    try {
      const { publicKey, rootCertificate, peerAddress, apiAddress } = peerInterface.PeerInfoMessage.deserializeBinary(request).toObject();
      const peerInfo = new PeerInfo(publicKey, rootCertificate, peerAddress, apiAddress);
      if (this.hasPeer(peerInfo.id)) {
        this.updatePeer(peerInfo);
      }

      if (!isResponse) {
        // create a punched connection
        const conn = MTPConnection.connect(this.getPeerInfo().id, address.port, address.host, this.server.socket);
        // write back response
        const subMessage = new peerInterface.DirectConnectionMessage
        subMessage.setPeerId(this.getPeerInfo().id)
        const response = new peerInterface.NatMessage
        response.setType(peerInterface.NatMessageType.DIRECT_CONNECTION)
        response.setIsResponse(true)
        response.setSubMessage(subMessage.serializeBinary())
        conn.write(response.serializeBinary());
        this.holePunchedConnections.set(peerInfo.id, conn);
      } else {
        // is response
        console.log('private node confirms reverse hole punch connection');
      }
    } catch (error) {
      throw Error(`error in 'handleDirectConnectionRequest': ${error}`);
    }
  }

  private async handleHolePunchRequest(address: Address, isResponse: boolean, request: Uint8Array) {
    return await new Promise<void>(async (resolve, reject) => {
      const { originPeerId, targetPeerId, udpAddress } = peerInterface.HolePunchConnectionMessage.deserializeBinary(request).toObject();
      // TODO: make sure origin peer id is known
      const parsedAddress = Address.parse(udpAddress);
      if (isResponse) {
        // case: hole punch has already been requested and adjacent peer has returned a message
        if (this.pendingHolePunchedSockets.has(targetPeerId)) {
          throw Error(`there are no pending hole punching requests for peerId: ${targetPeerId}`);
        }
        // set a timeout
        const timeout = 10000;
        setTimeout(() => reject(Error(`hole punching request timed out after ${timeout / 1000}s`)), timeout);
        // now we can start sending packets to the target for creating the entry in the translation table
        const socket = this.pendingHolePunchedSockets.get(targetPeerId)!;
        // send a message at interval for creating the entry in the translation table
        // TODO: not sure if its completely necessary to do this multiple times
        const conn = MTPConnection.connect(this.getPeerInfo().id, parsedAddress.port, parsedAddress.host, socket);

        while (conn.connecting) {
          await sleep(1000);
        }

        this.emit('hole-punch-connection', targetPeerId, conn);

        resolve();
      } else {
        if (targetPeerId == this.getPeerInfo().id) {
          // case: some other node is trying to connect to this node via an adjacent node
          // start sending packets to udpAddress to create entry in NAT translation table
          this.server.socket.send(this.getPeerInfo().id, parsedAddress.port, parsedAddress.host);
          // send a message at interval for creating the entry in the translation table
          // TODO: not sure if its completely necessary to do this multiple times
          const sendPacketInterval = setInterval(() => {
            // check if node has already connected
            // okay to just send peerId of current node
            this.server.socket.send(this.getPeerInfo().id, parsedAddress.port, parsedAddress.host);
          }, 1000);

          while (!this.server.incomingConnections.has(originPeerId)) {
            // check if connection has been made
            await sleep(1000);
          }
          // if our code has reached here, the origin peer's hole punch has been successful!
          clearInterval(sendPacketInterval);
        } else {
          // case: this node is the adjacent node and target peer is assumed to be connected to this node
          // first check if adjacent peer has a hole punched connection for coordination, if not then throw
          if (this.holePunchedConnections.has(targetPeerId)) {
            // if this node has a connection to target peer, then tell the target peer to initiate a connection with the origin peer!
            const targetConn = this.holePunchedConnections.get(targetPeerId)!;
            const targetSubMessage = new peerInterface.HolePunchConnectionMessage
            targetSubMessage.setOriginPeerId(originPeerId)
            targetSubMessage.setTargetPeerId(targetPeerId)
            targetSubMessage.setUdpAddress(address?.toString())
            const targetRequest = new peerInterface.NatMessage
            targetRequest.setType(peerInterface.NatMessageType.HOLE_PUNCH_CONNECTION)
            targetRequest.setSubMessage(targetSubMessage.serializeBinary())
            targetConn.write(targetRequest.serializeBinary());

            // finally tell the origin peer the target peers udp address
            const originSubMessage = new peerInterface.HolePunchConnectionMessage
            originSubMessage.setOriginPeerId(originPeerId)
            originSubMessage.setTargetPeerId(targetPeerId)
            originSubMessage.setUdpAddress(targetConn.address().toString())
            const originRequest = new peerInterface.NatMessage
            originRequest.setType(peerInterface.NatMessageType.HOLE_PUNCH_CONNECTION)
            originRequest.setIsResponse(true)
            originRequest.setSubMessage(originSubMessage.serializeBinary())
            this.server.socket.send(originRequest.serializeBinary(), address.port, address.host, (err) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          } else {
            throw Error('no connection exists to target peer so cannot coordinate hole punching');
          }
        }
      }
    });
  }

  private async handleRelayRequest(request: Uint8Array): Promise<Uint8Array> {
    return await new Promise<Uint8Array>(async (resolve, reject) => {
      try {
        const { originPeerId, targetPeerId } = peerInterface.RelayConnectionMessage.deserializeBinary(request).toObject();
        // first check if there is already a relay set up for the peer
        if (this.peerTCPHolePunchedRelayServers.has(targetPeerId)) {
          const addressInfo = this.peerTCPHolePunchedRelayServers.get(targetPeerId)!.address() as net.AddressInfo;
          const relayAddress = Address.fromAddressInfo(addressInfo).toString();
          const response = new peerInterface.HolePunchConnectionMessage
          response.setOriginPeerId(originPeerId)
          response.setTargetPeerId(targetPeerId)
          response.setUdpAddress(relayAddress)
          resolve(response.serializeBinary());
        } else {
          // otherwise we need to make sure tell target peer to setup a relay
          if (!this.holePunchedConnections.has(targetPeerId)) {
            throw Error(`no hole punched connection exists to target peer id: ${targetPeerId}`);
          }
          const udpConnection = this.holePunchedConnections.get(targetPeerId)!;

          const host = process.env.PK_PEER_HOST ?? '0.0.0.0';
          const newRelayServer = net
            .createServer((newConn) => {
              udpConnection.on('data', (data) => newConn.write(data));
              newConn.on('data', (data) => udpConnection.write(data));
            })
            .listen(0, host, () => {
              // set the server
              this.peerTCPHolePunchedRelayServers.set(targetPeerId, newRelayServer);
              // send the address back to the origin peer
              const addressInfo = newRelayServer.address() as net.AddressInfo;
              const relayAddress = Address.fromAddressInfo(addressInfo).toString();
              const response = new peerInterface.HolePunchConnectionMessage
              response.setOriginPeerId(originPeerId)
              response.setTargetPeerId(targetPeerId)
              response.setUdpAddress(relayAddress)
              resolve(response.serializeBinary());
            });
        }
      } catch (error) {
        reject(error);
      }
    });
  }
}

export default NatTraversal;
