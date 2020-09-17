// adapted from https://github.com/advance512/nat-traversal
import net from 'net';
import { EventEmitter } from 'events';
import { Address } from '../PeerInfo';
import PeerManager from '../PeerManager';
import { peerInterface } from '../../../proto/js/Peer';
import { SubServiceType } from '../../../proto/compiled/Peer_pb';
import UDPHolePunchClient from '../udp-hole-punch/UDPHolePunchClient';

let socketPipeId = 1;

class SocketPipe extends EventEmitter {
  id: number;
  localAddress: Address;
  relayAddress: Address;

  targetSocket: net.Socket;
  targetSocketPending: boolean;
  buffer: Buffer[];
  relaySocket: net.Socket;

  constructor(localAddress: Address, relayAddress: Address) {
    super();

    this.id = socketPipeId;
    socketPipeId += 1;

    this.localAddress = localAddress;
    this.relayAddress = relayAddress;

    this.targetSocketPending = true;
    this.buffer = [];

    console.log(`[client-relay:${this.id}] Created new pending SocketPipe.`);

    this.openRelayEnd();
  }

  private openRelayEnd() {
    console.log(`[client-relay:${this.id}] Socket pipe will TCP connection to connect to relay server.`);

    this.relaySocket = net.connect(this.relayAddress.port, this.relayAddress.host, () => {
      console.log(`[client-relay:${this.id}] Created new TCP connection.`);
      // Configure socket for keeping connections alive
      this.relaySocket.setKeepAlive(true, 120 * 1000);
    });

    // We have a relay socket - now register its handlers

    // On data
    this.relaySocket.on('data', (data) => {
      // Got data - do we have a target socket?
      if (this.targetSocket === undefined) {
        // Create a target socket for the relay socket - connecting to the target
        this.openTargetEnd();
        this.emit('pair');
      }

      // Is the target socket still connecting? If so, are we buffering data?
      if (this.targetSocketPending) {
        // Store the data until we have a target socket
        this.buffer[this.buffer.length] = data;
      } else {
        try {
          // Or just pass it directly
          this.targetSocket.write(data);
        } catch (ex) {
          console.error(`[client-relay:${this.id}] Error writing to target socket: `, ex);
        }
      }
    });

    // On closing
    this.relaySocket.on('close', (hadError) => {
      if (hadError) {
        console.error(`[client-relay:${this.id}] Relay socket closed with error.`);
      }

      if (this.targetSocket !== undefined) {
        // Destroy the other socket
        this.targetSocket.destroy();
      } else {
        // Signal we are closing - server closed the connection
        this.emit('close');
      }
    });

    this.relaySocket.on('error', (error) => {
      console.error(`[client-relay:${this.id}] Error with relay socket: `, error);
    });
  }

  private openTargetEnd() {
    console.log(
      `[client-relay:${
        this.id
      }] Authorized by relay server. Creating new connection to target ${this.localAddress.toString()}...`,
    );
    console.log(`[client-target:${this.id}] Socket pipe will TCP connection to connect to target server.`);

    // Or use TCP
    this.targetSocket = net.connect(this.localAddress.port, this.localAddress.host, () => {
      console.log(`[client-target:${this.id}] Successfully connected to target ${this.localAddress.toString()}.`);

      // Configure socket for keeping connections alive
      this.targetSocket.setKeepAlive(true, 120 * 1000);

      // Connected, not pending anymore
      this.targetSocketPending = false;

      // And if we have any buffered data, forward it
      try {
        for (const bufferItem of this.buffer) {
          this.targetSocket.write(bufferItem);
        }
      } catch (ex) {
        console.error(`[client-target:${this.id}] Error writing to target socket: `, ex);
      }

      // Clear the array
      this.buffer.length = 0;
    });

    // Got data from the target socket?
    this.targetSocket.on('data', (data) => {
      try {
        // Forward it!
        this.relaySocket.write(data);
      } catch (ex) {
        console.error(`target:${this.id}] Error writing to target socket: `, ex);
      }
    });

    this.targetSocket.on('error', (hadError) => {
      if (hadError) {
        console.error(`[target:${this.id}] Target socket was closed with error: `, hadError);
      }

      this.terminate();
    });
  }

  terminate() {
    console.log(`[client-relay:${this.id}] Terminating socket pipe...`);
    this.removeAllListeners();
    this.relaySocket.destroy();
  }
}

class TurnClient {
  peerManager: PeerManager;

  socketPipes: SocketPipe[];
  terminating: boolean;
  udpHolePunchClient: UDPHolePunchClient;

  // default is to support up to 10 connections at once, change this with 'numSockets' parameter
  constructor(peerManager: PeerManager) {
    this.peerManager = peerManager;

    // create udp hole punch client
    this.udpHolePunchClient = new UDPHolePunchClient(this.peerManager);

    this.socketPipes = [];
  }

  private async sendMessage(
    type: peerInterface.NatMessageType,
    publicKey: string,
    message?: Uint8Array,
  ): Promise<Uint8Array> {
    const peerConnection = this.peerManager.connectToPeer(publicKey);
    const encodedMessage = peerInterface.NatMessage.encodeDelimited({
      type,
      isResponse: false,
      subMessage: message,
    }).finish();
    const responseMessage = await peerConnection.sendPeerRequest(SubServiceType.NAT_TRAVERSAL, encodedMessage);
    const { type: responseType, isResponse, subMessage } = peerInterface.NatMessage.decodeDelimited(responseMessage);
    return subMessage;
  }

  async requestPeerConnection(peerPublicKey: string, relayPublicKey: string): Promise<Address> {
    const requestMessage = peerInterface.PeerConnectionRequest.encodeDelimited({ publicKey: peerPublicKey }).finish();

    const responseMessage = await this.sendMessage(
      peerInterface.NatMessageType.PEER_CONNECTION,
      relayPublicKey,
      requestMessage,
    );

    const { peerAddress } = peerInterface.PeerConnectionResponse.decodeDelimited(responseMessage);

    if (!peerAddress) {
      throw Error('relay does not know of requested peer');
    }
    const address = Address.parse(peerAddress);
    const relayPeerInfo = this.peerManager.getPeer(relayPublicKey);
    address.updateHost(relayPeerInfo?.peerAddress?.host);
    return address;
  }

  async requestRelayConnection(relayPublicKey: string) {
    const requestMessage = peerInterface.RelayConnectionRequest.encodeDelimited({
      publicKey: this.peerManager.peerInfo.publicKey,
    }).finish();

    const responseMessage = await this.sendMessage(
      peerInterface.NatMessageType.RELAY_CONNECTION,
      relayPublicKey,
      requestMessage,
    );

    const { serverAddress } = peerInterface.RelayConnectionResponse.decodeDelimited(responseMessage);

    const incoming = Address.parse(serverAddress);
    console.log(incoming);

    incoming.host = this.peerManager.getPeer(relayPublicKey)?.peerAddress?.host ?? incoming.host;
    // add relay node to turn server address
    this.peerManager.peerInfo.relayPublicKey = relayPublicKey;

    // Create pending socketPipes
    this.createSocketPipe(incoming);
  }

  async requestLocalHolePunchAddress(relayPublicKey: string) {
    // request hole punch
    const udpAddress = await this.requestUDPAddress(relayPublicKey);

    const localUdpAddress = await this.udpHolePunchClient.requestHolePunch(
      udpAddress,
      this.peerManager.peerInfo.peerAddress!,
    );

    // add to peer info as relay node
    this.peerManager.peerInfo.relayPublicKey = relayPublicKey;

    return localUdpAddress;
  }

  async requestHolePunchConnection(relayPublicKey: string, peerPublicKey: string) {
    const peerUDPAddress = await this.requestPeerUDPAddress(relayPublicKey, peerPublicKey);

    return this.udpHolePunchClient.createPipeServer(peerUDPAddress);
  }

  // returns the address for a local tcp server that is routed via UTP
  private async requestPeerUDPAddress(relayPublicKey: string, peerPublicKey: string): Promise<Address> {
    const requestMessage = peerInterface.PeerUdpAddressRequest.encodeDelimited({ publicKey: peerPublicKey }).finish();

    const responseMessage = await this.sendMessage(
      peerInterface.NatMessageType.PEER_UDP_ADDRESS,
      relayPublicKey,
      requestMessage,
    );

    const { address } = peerInterface.PeerUdpAddressResponse.decodeDelimited(responseMessage);

    return Address.parse(address);
  }

  private async requestUDPAddress(relayPublicKey: string) {
    const responseMessage = await this.sendMessage(peerInterface.NatMessageType.UDP_ADDRESS, relayPublicKey);

    const { address } = peerInterface.UDPAddressResponse.decodeDelimited(responseMessage);

    return Address.parse(address);
  }

  private async createSocketPipe(relayAddress: Address) {
    const localAddress = this.peerManager.peerInfo.peerAddress!;
    // wait for local address
    while (!localAddress) {
      await new Promise((resolve, reject) => setTimeout(() => resolve(), 1000));
    }

    // Create a new socketPipe
    const socketPipe = new SocketPipe(localAddress, relayAddress);
    this.socketPipes.push(socketPipe);

    socketPipe.on('pair', () => {
      // Create a new pending socketPipe
      this.createSocketPipe(relayAddress);
    });

    socketPipe.on('close', () => {
      // Server closed the connection
      // Remove paired pipe
      this.removeSocketPipe(socketPipe);

      // Create a new replacement socketPipe, that is pending and waiting, if required
      setTimeout(() => {
        if (this.terminating) {
          return;
        }

        // Create a new pending socketPipe
        this.createSocketPipe(relayAddress);
      }, 5000);
    });
  }

  private removeSocketPipe(socketPipe: SocketPipe) {
    // SocketPipe closed - is it still stored by us?
    const i = this.socketPipes.indexOf(socketPipe);
    // If so, remove it
    if (i !== -1) {
      this.socketPipes.splice(i, 1);
    }
    socketPipe.terminate();
  }

  terminate() {
    this.terminating = true;
    for (const socketPipe of this.socketPipes) {
      socketPipe.terminate();
    }
  }
}

export default TurnClient;
