import net from 'net';
import dgram from 'dgram';
import getPort from 'get-port';
import { pki } from 'node-forge';
import { EventEmitter } from 'events';
import { promiseAll } from '../../utils';
import { promisifyGrpc } from '../../bin/utils';
import * as peerInterface from '../../../proto/js/Peer_pb';
import * as agentInterface from '../../../proto/js/Agent_pb';
import PeerConnection from '../peer-connection/PeerConnection';
import { PeerInfo, PeerInfoReadOnly, Address } from '../PeerInfo';
import { MTPConnection, MTPServer } from './micro-transport-protocol/MTPServer';

class NatTraversal extends EventEmitter {
  private listPeers: () => string[];
  private getPeerInfo: (id: string) => PeerInfoReadOnly | null;
  private connectToPeer: (id: string) => PeerConnection;
  private getLocalPeerInfo: () => PeerInfo;
  private hasPeer: (id: string) => boolean;
  private updatePeerInfo: (peerInfo: PeerInfoReadOnly) => void;

  // this is requried for converting the PeerInfo into pem format
  private getPrimaryPrivateKey: () => pki.rsa.PrivateKey;

  // This is storing the peer ids that don't respond to connection requests
  private unresponsiveNodes: Map<string, number> = new Map();

  // This is storing the peer ids that don't respond to relay requests
  private unresponsiveRelayNodes: Map<string, number> = new Map();

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
    getPeerInfo: (id: string) => PeerInfoReadOnly | null,
    connectToPeer: (id: string) => PeerConnection,
    getLocalPeerInfo: () => PeerInfo,
    hasPeer: (id: string) => boolean,
    updatePeerInfo: (peerInfo: PeerInfoReadOnly) => void,
    getPrimaryPrivateKey: () => pki.rsa.PrivateKey,
  ) {
    super();

    this.listPeers = listPeers;
    this.getPeerInfo = getPeerInfo;
    this.connectToPeer = connectToPeer;
    this.getLocalPeerInfo = getLocalPeerInfo;
    this.hasPeer = hasPeer;
    this.updatePeerInfo = updatePeerInfo;
    this.getPrimaryPrivateKey = getPrimaryPrivateKey;
    this.server = new MTPServer(this.connectionHandler.bind(this), this.handleNatUdpMessage.bind(this));
  }

  async start(): Promise<Address> {
    return new Promise<Address>((resolve, reject) => {
      try {
        // start the MTPServer
        const port = parseInt(process.env.PK_PEER_PORT ?? '0');
        this.server.listenPort(port, process.env.PK_PEER_HOST ?? '0.0.0.0', () => {
          const address = this.server.address();
          console.log(`main MTP server is now listening on address: '${address.toString()}'`);

          // this is just to make sure every other peer has a back connection to this node
          // the idea behind this is that if we are a node that is behind a NAT, then if
          // another node wants to connect via an adjacent node were already connected to,
          // then that node that has to be able to notify us of the connection attempt for
          // coordination purposes.
          // TODO: this should only be done if the node detects that it is behind a NAT layer
          const intermittentConnectionCallback = async () => {
            const promiseList: Promise<any>[] = [];
            for (const peerId of this.listPeers()) {
              // if (!this.server.incomingConnections.has(peerId)) {
              //   const count = this.unresponsiveNodes.get(peerId) ?? 0;
              // if (count < 3) {
              //     this.unresponsiveNodes.set(peerId, count + 1);
              //     const peerInfo = this.getPeerInfo(peerId)!;

              //     // ask for direct hole punch
              //     const udpAddress = await this.requestUDPAddress(peerInfo.id);
              //     // promiseList.push(this.sendDirectHolePunchConnectionRequest(udpAddress));

              //     // ask for relay
              //     promiseList.push(this.requestUDPRelay(peerInfo.id, udpAddress))
              //   }
              // }
              // if (process.env.SEND_REQ) {
              //   if (!this.outgoingTCPHolePunchedRelayServers.has(peerId)) {
              //     const count = this.unresponsiveRelayNodes.get(peerId) ?? 0;
              //     if (count < 3) {
              //       this.unresponsiveRelayNodes.set(peerId, count + 1);
              //       const peerInfo = this.getPeerInfo(peerId)!;
              //       // ask for direct hole punch
              //       const udpAddress = await this.requestUDPAddress(peerInfo.id);
              //       this.requestUDPRelay(peerInfo.id, udpAddress)
              //     }
              //   }
              // }
            }
            await promiseAll(promiseList);
          }
          this.intermittentConnectionInterval = setInterval(intermittentConnectionCallback, 6000);
          // this.intermittentConnectionInterval = setInterval(intermittentConnectionCallback, 30000);

          // finally return the address
          resolve(address)
        });
      } catch (error) {
        reject(error)
      }
    })
  }

  async stop() {
    if (this.intermittentConnectionInterval) {
      this.intermittentConnectionInterval.unref()
    }
    await this.server.close()
  }

  // request the MTP UDP address of a peer
  // there are only two addresses for a peer:
  // 1) the tcp address which is where the raw gRPC service is exposed
  // 2) the udp address which is where that gRPC service is relayed on using MTP
  async requestUDPAddress(peerId: string): Promise<Address> {
    const peerConnection = this.connectToPeer(peerId);
    const client = await peerConnection.getPeerClient(true);

    // tell node to add this peer's PeerInfo (target peer will only accept if it is a public relay)
    const peerInfo = this.getLocalPeerInfo()
    const peerInfoPem = peerInfo.toX509Pem(this.getPrimaryPrivateKey())
    const peerInfoReadOnly = new PeerInfoReadOnly(peerInfoPem)
    await promisifyGrpc(client.addPeerInfo.bind(client))(
      peerInfoReadOnly.toPeerInfoReadOnlyMessage()
    )

    // get udp address
    const response = await promisifyGrpc(client.getUDPAddress.bind(client))(
      new agentInterface.EmptyMessage
    ) as agentInterface.StringMessage;
    const addressString = response.getS()
    const address = Address.parse(addressString);
    address.updateHost(this.getPeerInfo(peerId)!.peerAddress?.host);
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
        // want to send a MTP connection request to the public node
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

  ///////////////////////////////////
  // PRIVATE NODE REQUESTING RELAY //
  ///////////////////////////////////
  // requestUDPRelay is how a private peer tells a public peer that it needs a public
  // relay set up where it can relay it's peerServer to. In this way, any other private
  // peer that wants to connect to that peer need only send its request to the public
  // address. Note: this request will timeout after 'timeout' milliseconds (defaults to 10 seconds)
  async requestUDPRelay(publicRelayPeerId: string, udpAddress: Address, timeout = 10000): Promise<Address> {
    console.log('requesting up udp relay');

    return new Promise(async (resolve, reject) => {
      setTimeout(() => reject(Error('relay connection request timed out')), timeout);
      try {
        // const socket = dgram.createSocket('udp4')
        // socket.bind()
        console.log('requestUDPRelay');
        console.log(udpAddress);
        // const conn = MTPConnection.connect(this.getLocalPeerInfo().id, udpAddress.port, udpAddress.host, socket);
        const conn = MTPConnection.connect(this.getLocalPeerInfo().id, udpAddress.port, udpAddress.host);
        // tell the remote node that this is a public relay request
        const request = new peerInterface.NatUdpMessage
        request.setType(peerInterface.NatUdpMessageType.PUBLIC_RELAY_REQUEST)
        const subMessage = new agentInterface.StringMessage
        subMessage.setS(this.getLocalPeerInfo().id)
        request.setSubMessage(subMessage.serializeBinary())
        conn.write(request.serializeBinary(), (err) => {
          if (err) {
          console.log('error when writing to public node: ', err);
          reject(err)
          }
        })

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
            this.outgoingTCPHolePunchedRelayServers.set(publicRelayPeerId, newServer);
            resolve(Address.fromAddressInfo(newServer.address() as net.AddressInfo));
          });
        conn.on('data', (data) => {
          console.log('meemememememmem');

          // assume first response is a nat message containing the address
          // of the public relay node
          try {
            const decodedMessage = peerInterface.NatUdpMessage.deserializeBinary(data)

            const subMessage = decodedMessage.getSubMessage_asU8()
            const responseDecoded = agentInterface.StringMessage.deserializeBinary(subMessage)
            const address = Address.parse(responseDecoded.getS())
            console.log('===================================');
            console.log(`public relay setup on TCP address: `, address.toString());
            console.log('===================================');
            resolve(address)
          } catch (error) {
            reject(Error('first message was not a nat message!'))
          }
        })
      } catch (error) {
        console.log('error hereerer: ', error);

        reject(error);
      }
    });
  }
  /////////////////////////////////
  // PUBLIC NODE PROVIDING RELAY //
  /////////////////////////////////
  async handleUDPPublicRelayRequest(conn: MTPConnection, isResponse: boolean, request: Uint8Array) {
    return await new Promise<string>(async (resolve, reject) => {
      try {
        const { s: peerId } = agentInterface.StringMessage.deserializeBinary(request).toObject();
        const host = process.env.PK_PEER_HOST ?? '0.0.0.0';
        // get a port within the range if it has been specified
        let port: number = 0
        if (process.env.RELAY_LOWER_RANGE_PORT || process.env.RELAY_UPPER_RANGE_PORT) {
          const lowerPort = parseInt(process.env.RELAY_LOWER_RANGE_PORT ?? '0')
          const upperPort = parseInt(process.env.RELAY_UPPER_RANGE_PORT ?? '65535')
          port = await getPort({ host, port: getPort.makeRange(lowerPort, upperPort) })
        }
        const newRelayServer = net
          .createServer((newConn) => {
            conn.on('data', (data) => {
              console.log('dddddddd');

              newConn.write(data)
            });
            newConn.on('data', (data) => {
              console.log('sssssssssssssss');
              conn.write(data)
            });
          })
          .listen(port, host, () => {
            try {
              // set the server
              this.peerTCPHolePunchedRelayServers.set(peerId, newRelayServer);
              // create the address
              const addressInfo = newRelayServer.address() as net.AddressInfo;
              const relayAddress = Address.fromAddressInfo(addressInfo);
              relayAddress.updateHost(process.env.PK_PEER_HOST ?? relayAddress.host)
              // update the peer info for any other peers requesting this information
              // console.log('handlePublicRelayRequest: update peer');
              const updatedPeerInfo = this.getPeerInfo(peerId)
              // console.log('handlePublicRelayRequest: updatedPeerInfo: ', updatedPeerInfo);
              if (updatedPeerInfo) {
                // console.log('handlePublicRelayRequest: updating');
                updatedPeerInfo.peerAddress = relayAddress
                this.updatePeerInfo(updatedPeerInfo)
                // console.log('handlePublicRelayRequest: updated: ', updatedPeerInfo);
                // console.log('handlePublicRelayRequest: from peer store: ', this.getPeerInfo(updatedPeerInfo.id));
              }
              // write back to the node its tcp address
              const responseMessage = new peerInterface.NatUdpMessage()
              responseMessage.setType(peerInterface.NatUdpMessageType.PUBLIC_RELAY_REQUEST)
              const subMessage = new agentInterface.StringMessage
              subMessage.setS(relayAddress.toString())
              responseMessage.setSubMessage(subMessage.serializeBinary())
              console.log('writing back to the original connection');
              console.log('');


              conn.write(responseMessage.serializeBinary())
              // send the address back to the origin peer
              resolve(relayAddress.toString());
            } catch (error) {
              console.log(error);
              console.log('eeeerrrrrrooooorrr: ', error);

              reject(error)
            }
          });
      } catch (error) {
        reject(error)
      }
    })
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
    const message = new peerInterface.DirectConnectionMessage
    const peerInfo = this.getLocalPeerInfo()
    message.setPeerId(peerInfo.id)
    this.sendNATMessage(udpAddress, peerInterface.NatUdpMessageType.DIRECT_CONNECTION, message.serializeBinary());
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
          request.setOriginPeerId(this.getLocalPeerInfo().id)
          request.setTargetPeerId(targetPeerId)
          request.setUdpAddress(Address.fromAddressInfo(socket.address()).toString())
          this.sendNATMessage(udpAddress, peerInterface.NatUdpMessageType.HOLE_PUNCH_CONNECTION, request.serializeBinary(), socket);
          resolve();
        });

        socket.on('message', (message: Buffer, rinfo: dgram.RemoteInfo) => {
          const address = new Address(rinfo.address, rinfo.port);
          this.handleNatUdpMessage(message, address);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // this is just a convenience function to wrap a message in a NATMessage to then send via the MTP server socket
  private sendNATMessage(
    udpAddress: Address,
    type: peerInterface.NatUdpMessageType,
    message: Uint8Array,
    socket?: dgram.Socket,
  ) {
    const request = new peerInterface.NatUdpMessage
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
    // // first check if the connection is for a public relay
    // // if it isn't try to send it to the gRPC service relayed via an internal MTP connection
    // const grpcAddress = this.getLocalPeerInfo().peerAddress!;
    // const grpcConn = net.createConnection({ port: grpcAddress?.port, host: grpcAddress?.host });
    // grpcConn.on('data', (data) => conn.write(data));
    conn.on('data', async (data) => {
      console.log('new connection data');
      // first try the nat message handler, might be a hole punch or relay request
      try {
        const decodedRequest = peerInterface.NatUdpMessage.deserializeBinary(data)

        const type = decodedRequest.getType()
        const isResponse = decodedRequest.getIsResponse()
        const subMessage = decodedRequest.getSubMessage_asU8()
        switch (type) {
          case peerInterface.NatUdpMessageType.DIRECT_CONNECTION:
            throw Error('DIRECT_CONNECTION is not supported via MTP')
          case peerInterface.NatUdpMessageType.HOLE_PUNCH_CONNECTION:
            throw Error('HOLE_PUNCH_CONNECTION is not supported via MTP')
          case peerInterface.NatUdpMessageType.PUBLIC_RELAY_REQUEST:
            await this.handleUDPPublicRelayRequest(conn, isResponse, subMessage);
            break;
          default:
            break;
        }
      } catch (error) {
        // don't want to throw so just log
        console.log(`new MTP connection error: ${error}`);
      }
      // // this is now assumed to be a message for grpc so need to pipe it over
      // grpcConn.write(data);
    });
  }

  handleGetUDPAddress(): string {
    return this.server.remoteAddress().toString()
  }

  private async handleNatUdpMessage(message: Buffer, address: Address) {

    const decodedRequest = peerInterface.NatUdpMessage.deserializeBinary(message)

    const type = decodedRequest.getType()
    const isResponse = decodedRequest.getIsResponse()
    const subMessage = decodedRequest.getSubMessage_asU8()
    switch (type) {
      case peerInterface.NatUdpMessageType.DIRECT_CONNECTION:
        await this.handleDirectConnectionRequest(address, isResponse, subMessage);
        break;
      case peerInterface.NatUdpMessageType.HOLE_PUNCH_CONNECTION:
        // await this.handleHolePunchRequest(address, isResponse, subMessage);
        break;
      case peerInterface.NatUdpMessageType.PUBLIC_RELAY_REQUEST:
        throw Error('PUBLIC_RELAY_REQUEST is only supported over MTP connections')
      default:
        break;
    }
  }

  private async handleDirectConnectionRequest(address: Address, isResponse: boolean, request: Uint8Array) {
    try {
      if (!isResponse) {
        const { peerId } = peerInterface.DirectConnectionMessage.deserializeBinary(request).toObject();
        // create a punched connection
        const conn = MTPConnection.connect(this.getLocalPeerInfo().id, address.port, address.host, this.server.socket);
        // write back response
        const subMessage = new peerInterface.DirectConnectionMessage
        subMessage.setPeerId(this.getLocalPeerInfo().id)
        const response = new peerInterface.NatUdpMessage
        response.setType(peerInterface.NatUdpMessageType.DIRECT_CONNECTION)
        response.setIsResponse(true)
        response.setSubMessage(subMessage.serializeBinary())
        conn.write(response.serializeBinary());
        this.holePunchedConnections.set(peerId, conn);
      } else {
        const { peerId } = peerInterface.DirectConnectionMessage.deserializeBinary(request).toObject();

        // is response
        console.log('===================================');
        console.log(`reverse hole punch successful`);
        console.log('===================================');
      }
    } catch (error) {
      throw Error(`error in 'handleDirectConnectionRequest': ${error}`);
    }
  }

  // private async handleHolePunchRequest(address: Address, isResponse: boolean, request: Uint8Array) {
  //   return await new Promise<void>(async (resolve, reject) => {
  //     try {
  //       const { originPeerId, targetPeerId, udpAddress } = peerInterface.HolePunchConnectionMessage.deserializeBinary(request).toObject();
  //       // TODO: make sure origin peer id is known
  //       const parsedAddress = Address.parse(udpAddress);
  //       if (isResponse) {
  //         // case: hole punch has already been requested and adjacent peer has returned a message
  //         if (this.pendingHolePunchedSockets.has(targetPeerId)) {
  //           throw Error(`there are no pending hole punching requests for peerId: ${targetPeerId}`);
  //         }
  //         // set a timeout
  //         const timeout = 10000;
  //         setTimeout(() => reject(Error(`hole punching request timed out after ${timeout / 1000}s`)), timeout);
  //         // now we can start sending packets to the target for creating the entry in the translation table
  //         const socket = this.pendingHolePunchedSockets.get(targetPeerId)!;
  //         // send a message at interval for creating the entry in the translation table
  //         // TODO: not sure if its completely necessary to do this multiple times
  //         const conn = MTPConnection.connect(this.getLocalPeerInfo().id, parsedAddress.port, parsedAddress.host, socket);

  //         while (conn.connecting) {
  //           await sleep(1000);
  //         }

  //         this.emit('hole-punch-connection', targetPeerId, conn);

  //         resolve();
  //       } else {
  //         if (targetPeerId == this.getLocalPeerInfo().id) {
  //           // case: some other node is trying to connect to this node via an adjacent node
  //           // start sending packets to udpAddress to create entry in NAT translation table
  //           this.server.socket.send(this.getLocalPeerInfo().id, parsedAddress.port, parsedAddress.host);
  //           // send a message at interval for creating the entry in the translation table
  //           // TODO: not sure if its completely necessary to do this multiple times
  //           const sendPacketInterval = setInterval(() => {
  //             // check if node has already connected
  //             // okay to just send peerId of current node
  //             this.server.socket.send(this.getLocalPeerInfo().id, parsedAddress.port, parsedAddress.host);
  //           }, 1000);

  //           while (!this.server.incomingConnections.has(originPeerId)) {
  //             // check if connection has been made
  //             await sleep(1000);
  //           }
  //           // if our code has reached here, the origin peer's hole punch has been successful!
  //           clearInterval(sendPacketInterval);
  //         } else {
  //           // case: this node is the adjacent node and target peer is assumed to be connected to this node
  //           // first check if adjacent peer has a hole punched connection for coordination, if not then throw
  //           if (this.holePunchedConnections.has(targetPeerId)) {
  //             // if this node has a connection to target peer, then tell the target peer to initiate a connection with the origin peer!
  //             const targetConn = this.holePunchedConnections.get(targetPeerId)!;
  //             const targetSubMessage = new peerInterface.HolePunchConnectionMessage
  //             targetSubMessage.setOriginPeerId(originPeerId)
  //             targetSubMessage.setTargetPeerId(targetPeerId)
  //             targetSubMessage.setUdpAddress(address?.toString())
  //             const targetRequest = new peerInterface.NatUdpMessage
  //             targetRequest.setType(peerInterface.NatUdpMessageType.HOLE_PUNCH_CONNECTION)
  //             targetRequest.setSubMessage(targetSubMessage.serializeBinary())
  //             targetConn.write(targetRequest.serializeBinary());

  //             // finally tell the origin peer the target peers udp address
  //             const originSubMessage = new peerInterface.HolePunchConnectionMessage
  //             originSubMessage.setOriginPeerId(originPeerId)
  //             originSubMessage.setTargetPeerId(targetPeerId)
  //             originSubMessage.setUdpAddress(targetConn.address().toString())
  //             const originRequest = new peerInterface.NatUdpMessage
  //             originRequest.setType(peerInterface.NatUdpMessageType.HOLE_PUNCH_CONNECTION)
  //             originRequest.setIsResponse(true)
  //             originRequest.setSubMessage(originSubMessage.serializeBinary())
  //             this.server.socket.send(originRequest.serializeBinary(), address.port, address.host, (err) => {
  //               if (err) {
  //                 reject(err);
  //               } else {
  //                 resolve();
  //               }
  //             });
  //           } else {
  //             throw Error('no connection exists to target peer so cannot coordinate hole punching');
  //           }
  //         }
  //       }
  //     } catch (error) {
  //       reject(error)
  //     }
  //   });
  // }

  // //////////////////
  // // Public relay //
  // //////////////////
  // // requestPublicRelay will contact the peer corresponding to 'publicPeerId' and
  // // ask it to set up a publicly accessible relay of this peers peerServer, relayed
  // // through udp.
  // async requestPublicRelay(publicPeerId: string) {
  //   const pc = this.connectToPeer(publicPeerId);
  //   const client = await pc.getPeerClient();

  //   const request = new peerInterface.PublicRelayRequest;
  //   const peerInfo = this.getLocalPeerInfo()
  //   request.setOriginPeerId(peerInfo.id);
  //   request.setTargetPeerId(peerInfo.id);
  //   const res = await promisifyGrpc(client.requestPublicRelay.bind(client))(request) as peerInterface.PublicRelayReply;

  //   const relayAddress = res.getRelayAddress()
  //   return Address.parse(relayAddress)
  // }

  // async handlePublicRelayRequest(originPeerId: string, targetPeerId: string): Promise<string> {
  //   return await new Promise<string>(async (resolve, reject) => {
  //     try {
  //       // first check if there is already a relay set up for the peer
  //       if (this.peerTCPHolePunchedRelayServers.has(targetPeerId)) {
  //         const addressInfo = this.peerTCPHolePunchedRelayServers.get(targetPeerId)!.address() as net.AddressInfo;
  //         const relayAddress = Address.fromAddressInfo(addressInfo);
  //         relayAddress.updateHost(process.env.PK_PEER_HOST ?? relayAddress.host)
  //         resolve(relayAddress.toString());
  //       } else if (originPeerId == targetPeerId) {
  //         if (!this.holePunchedConnections.has(targetPeerId)) {
  //           throw Error(`no hole punched connection exists to target peer id: ${targetPeerId}`);
  //         }
  //         const udpConnection = this.holePunchedConnections.get(targetPeerId)!;

  //         const host = process.env.PK_PEER_HOST ?? '0.0.0.0';
  //         // get a port within the range if it has been specified
  //         let port: number = 0
  //         if (process.env.RELAY_LOWER_RANGE_PORT || process.env.RELAY_UPPER_RANGE_PORT) {
  //           const lowerPort = parseInt(process.env.RELAY_LOWER_RANGE_PORT ?? '0')
  //           const upperPort = parseInt(process.env.RELAY_UPPER_RANGE_PORT ?? '65535')
  //           port = await getPort({ host, port: getPort.makeRange(lowerPort, upperPort) })
  //         }
  //         const newRelayServer = net
  //           .createServer((newConn) => {
  //             udpConnection.on('data', (data) => newConn.write(data));
  //             newConn.on('data', (data) => udpConnection.write(data));
  //           })
  //           .listen(port, host, () => {
  //             // set the server
  //             this.peerTCPHolePunchedRelayServers.set(targetPeerId, newRelayServer);
  //             // create the address
  //             const addressInfo = newRelayServer.address() as net.AddressInfo;
  //             const relayAddress = Address.fromAddressInfo(addressInfo);
  //             relayAddress.updateHost(process.env.PK_PEER_HOST ?? relayAddress.host)
  //             // update the peer info for any other peers requesting this information
  //             console.log('handlePublicRelayRequest: update peer');
  //             const updatedPeerInfo = this.getPeerInfo(targetPeerId)
  //             console.log('handlePublicRelayRequest: updatedPeerInfo: ', updatedPeerInfo);
  //             if (updatedPeerInfo) {
  //               console.log('handlePublicRelayRequest: updating');
  //               updatedPeerInfo.peerAddress = relayAddress
  //               this.updatePeerInfo(updatedPeerInfo)
  //               console.log('handlePublicRelayRequest: updated: ', updatedPeerInfo);
  //               console.log('handlePublicRelayRequest: from peer store: ', this.getPeerInfo(updatedPeerInfo.id));
  //             }
  //             // send the address back to the origin peer
  //             resolve(relayAddress.toString());
  //           });
  //       } else {
  //         throw Error('target peer does not have a public relay on this node')
  //       }
  //     } catch (error) {
  //       reject(error);
  //     }
  //   });
  // }
}

export default NatTraversal;
