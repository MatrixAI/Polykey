// adapted from https://github.com/advance512/nat-traversal
import PeerInfo, { Address } from '../PeerInfo';
import { EventEmitter } from 'events';
import net, { AddressInfo } from 'net';
import PeerManager from '../PeerManager';
import { peerInterface } from '../../../proto/js/Peer';
import UDPHolePunchServer from '../udp-hole-punch/UDPHolePunchServer';

class SocketPipe extends EventEmitter {
  serverSocket: net.Socket;
  clientSocket: net.Socket;
  bufferQueue: Buffer[];

  id: number;

  constructor(serverSocket: net.Socket, id: number) {
    super();
    this.id = id;
    this.serverSocket = serverSocket;
    this.bufferQueue = [];
    // Configure socket for keeping connections alive
    this.serverSocket.setKeepAlive(true, 120 * 1000);
    // New data
    this.serverSocket.on('data', (data) => {
      // if outgoing socket is connected, write data
      this.bufferQueue.push(data);
      if (this.clientSocket) {
        this.writeBuffer();
      }
    });

    this.serverSocket.on('close', (hadError: any) => {
      if (hadError) {
        console.error(`[${this}] Socket was closed due to error.`);
      }
      // Destroy the paired socket too
      if (this.clientSocket !== undefined) {
        this.clientSocket.destroy();
      }
      // Mark this socketPipe is closing
      this.emit('close');
    });

    this.serverSocket.on('error', (err: any) => {
      console.error(`Socket error: ${err}`);
    });
  }

  terminate() {
    this.serverSocket.destroy();
  }

  activate(outgoingSocket: net.Socket) {
    if (this.clientSocket) {
      throw new Error(`[${this}] Attempted to pair socket more than once.`);
    }

    console.log(`[socket-pipe: ${this.id}] Socket pipe activated!`);

    this.clientSocket = outgoingSocket;

    // Configure socket for keeping connections alive
    this.clientSocket.setKeepAlive(true, 120 * 1000);

    // If we have any data in the buffer, write it
    this.writeBuffer();
  }

  private writeBuffer() {
    while (this.bufferQueue.length > 0) {
      const buffer = this.bufferQueue.shift()!;
      this.clientSocket.write(buffer);
    }
  }
}

class EndpointServer extends EventEmitter {
  address: Address;
  edgeType: 'server' | 'client';
  pendingSocketPipes: SocketPipe[] = [];
  activeSocketPipes: SocketPipe[] = [];
  server: net.Server;

  constructor(edgeType: 'server' | 'client') {
    super();

    this.edgeType = edgeType;
  }

  async start(port: number = 0) {
    await new Promise((resolve, reject) => {
      console.log(`[${this.edgeType}] endpoint server Will listen to incoming TCP connections.`);

      this.server = net
        .createServer((socket) => {
          console.log(
            `[endpoint-server: ${this.edgeType}] Incoming TCP connection from ${socket.remoteAddress}:${socket.remotePort}`,
          );
          this.createSocketPipe(socket);
        })
        .listen(port, '0.0.0.0', () => {
          this.address = Address.fromAddressInfo(<AddressInfo>this.server.address());
          console.log(`[${this.edgeType}] Listening on adress ${this.address.toString()}...`);
          resolve();
        });
    });
  }

  private async createSocketPipe(incomingSocket: net.Socket) {
    const id = Math.max(0, ...this.activeSocketPipes.map((v) => v.id), ...this.pendingSocketPipes.map((v) => v.id)) + 1;

    const newSocketPipe = new SocketPipe(incomingSocket, id);

    console.log(`[${this.edgeType}-server-socket-pipe: ${newSocketPipe.id}] SocketPipe authorized.`);
    this.emit('new', newSocketPipe);

    newSocketPipe.on('close', () => {
      console.log(`[${this.edgeType}-server-socket-pipe: ${newSocketPipe.id}] SocketPipe closed connection`);
      this.removeSocketPipe(newSocketPipe);
    });

    return;
  }

  activateSocketPipe(pairServer: EndpointServer, connectingSocketPipe: SocketPipe) {
    // Do we have a pending socketPipe waiting?
    if (this.hasPendingSocketPipes()) {
      // Get the current pending socketPipe
      const pendingSocketPipe = this.getPendingSocketPipe();

      console.log(
        `[${this.edgeType}-server] Activating pending SocketPipe: connecting SocketPipes ${this.edgeType}-${pendingSocketPipe.id} and ${pairServer.edgeType}-${connectingSocketPipe.id}`,
      );

      // Pair the connecting socketPipe with the pending socketPipe, allow data flow in one direction
      connectingSocketPipe.activate(pendingSocketPipe.serverSocket);
      this.addActiveSocketPipe(pendingSocketPipe);

      // And vice versa, for the second direction
      pendingSocketPipe.activate(connectingSocketPipe.serverSocket);
      pairServer.addActiveSocketPipe(connectingSocketPipe);
    } else {
      console.log(
        `[${this.edgeType}-server-socket-pipe: ${pairServer.edgeType}-${connectingSocketPipe.id}] SocketPipe will be pending until a parallel connection occurs`,
      );
      // If we don't then our new connecting socketPipe is now pending and waiting for another connecting socketPipe
      pairServer.addPendingSocketPipe(connectingSocketPipe);
    }
  }

  private getPendingSocketPipe() {
    const pendingSocketPipe = this.pendingSocketPipes[0];
    this.pendingSocketPipes.splice(0, 1);
    return pendingSocketPipe;
  }

  private addActiveSocketPipe(socketPipe: SocketPipe) {
    this.activeSocketPipes.push(socketPipe);
  }

  private addPendingSocketPipe(socketPipe: SocketPipe) {
    this.pendingSocketPipes.push(socketPipe);
  }

  private removeSocketPipe(newSocketPipe: SocketPipe) {
    let i = this.pendingSocketPipes.indexOf(newSocketPipe);
    if (i !== -1) {
      this.pendingSocketPipes.splice(i, 1);
    } else {
      i = this.activeSocketPipes.indexOf(newSocketPipe);
      if (i !== -1) {
        this.activeSocketPipes.splice(i, 1);
      }
    }
  }

  private hasPendingSocketPipes() {
    return this.pendingSocketPipes.length > 0;
  }

  terminate() {
    console.log(`[${this.edgeType}] Terminating SocketListener.`);

    this.server.close();
    for (const socketPipe of this.pendingSocketPipes) {
      socketPipe.terminate();
    }
    for (const socketPipe of this.activeSocketPipes) {
      socketPipe.terminate();
    }
    this.server.unref();
  }
}

class TurnServer {
  private peerManager: PeerManager;
  private relayServer: net.Server;
  private udpHolePunchServer: UDPHolePunchServer;
  // public key -> {incoming, outgoing}
  private connectionMap: Map<string, { server: EndpointServer; client: EndpointServer }> = new Map();

  constructor(peerManager: PeerManager) {
    this.peerManager = peerManager;
    this.peerManager.setNatHandler(this.handleNatMessage.bind(this));

    this.udpHolePunchServer = new UDPHolePunchServer(this.peerManager);
  }

  private async handleNatMessage(request: Uint8Array): Promise<Uint8Array> {
    const { type, subMessage } = peerInterface.NatMessage.decodeDelimited(request);
    let response: Uint8Array;
    switch (type) {
      case peerInterface.NatMessageType.PEER_CONNECTION:
        response = await this.handlePeerConnectionRequest(subMessage);
        break;
      case peerInterface.NatMessageType.RELAY_CONNECTION:
        response = await this.handleRelayConnectionRequest(subMessage);
        break;
      case peerInterface.NatMessageType.UDP_ADDRESS:
        response = await this.handleUDPAddressRequest();
        break;
      case peerInterface.NatMessageType.PEER_UDP_ADDRESS:
        response = await this.handlePeerUDPAddressRequest(subMessage);
        break;
      default:
        throw Error(`type not supported: ${type}`);
    }
    const encodedResponse = peerInterface.NatMessage.encodeDelimited({
      type,
      isResponse: true,
      subMessage: response,
    }).finish();
    return encodedResponse;
  }

  private async handlePeerConnectionRequest(request: Uint8Array): Promise<Uint8Array> {
    const { publicKey } = peerInterface.PeerConnectionRequest.decodeDelimited(request);

    const peerAddress = this.connectionMap.get(publicKey)?.client.address.toString() ?? '';

    const responseMessage = peerInterface.PeerConnectionResponse.encodeDelimited({ peerAddress }).finish();

    return responseMessage;
  }

  private async handleRelayConnectionRequest(request: Uint8Array): Promise<Uint8Array> {
    const { publicKey } = peerInterface.RelayConnectionRequest.decodeDelimited(request);

    let server: EndpointServer;
    let client: EndpointServer;

    server = new EndpointServer('server');
    server.on('new', (connectingSocketPipe: SocketPipe) => {
      client.activateSocketPipe(server, connectingSocketPipe);
    });
    await server.start();

    client = new EndpointServer('client');
    client.on('new', (connectingSocketPipe: SocketPipe) => {
      server.activateSocketPipe(client, connectingSocketPipe);
    });
    await client.start();

    this.connectionMap.set(publicKey, { server, client });

    // send back response message
    const serverAddress = server.address.toString();
    const responseMessage = peerInterface.RelayConnectionResponse.encodeDelimited({ serverAddress }).finish();

    return responseMessage;
  }

  private async handleUDPAddressRequest(): Promise<Uint8Array> {
    // send back response message
    const address = this.udpHolePunchServer.server.address().toString();
    const responseMessage = peerInterface.UDPAddressResponse.encodeDelimited({ address }).finish();

    return responseMessage;
  }

  private async handlePeerUDPAddressRequest(request: Uint8Array): Promise<Uint8Array> {
    const { publicKey } = peerInterface.PeerUdpAddressRequest.decodeDelimited(request);

    // send back response message
    const address = this.udpHolePunchServer.getAddress(publicKey);
    const responseMessage = peerInterface.PeerUdpAddressResponse.encodeDelimited({ address }).finish();

    return responseMessage;
  }

  terminate() {
    this.connectionMap.forEach(({ server, client }) => {
      server.terminate();
      client.terminate();
    });
    this.relayServer.close();
  }
}

export default TurnServer;
