// based on https://github.com/SamDecrock/node-udp-hole-punching

import net from 'net';
import { Address } from '../PeerInfo';
import PeerManager from '../PeerManager';
import { peerInterface } from '../../../proto/js/Peer';
import UDPToTCPSocketPipe from './socket-pipes/UDPToTCPSocketPipe';
import TCPToUDPSocketPipe from './socket-pipes/TCPToUDPSocketPipe';
import { connect, MTPConnection, createServer } from './MicroTransportProtocol';

class UDPHolePunchClient {
  private peerManager: PeerManager;

  private outgoingSocketPipes: Map<number, TCPToUDPSocketPipe> = new Map();
  private incomingSocketPipes: Map<number, UDPToTCPSocketPipe> = new Map();

  constructor(peerManager: PeerManager) {
    this.peerManager = peerManager;
  }

  async requestHolePunch(address: Address, peerServerAddress: Address) {
    const relayConnection = connect(address.port, address.host);
    // const relayConnection = connect(address.port, address.host)
    const relayServer = createServer((conn: MTPConnection) => {
      const socketPipe = new TCPToUDPSocketPipe(peerServerAddress, conn);
      this.outgoingSocketPipes.set(socketPipe.id, socketPipe);
    });
    await new Promise((resolve, reject) => {
      relayServer.listen(relayConnection, () => {
        console.log(`relay connection listening on: ${relayServer.address().host}:${relayServer.address().port}`);
        resolve();
      });
    });

    const request = peerInterface.HolePunchRegisterRequest.encodeDelimited({
      publicKey: this.peerManager.peerInfo.publicKey,
    }).finish();
    relayConnection.write(request);

    const connectedAddress = await new Promise<Address>((resolve, reject) => {
      let buf: Buffer[] = [];
      relayConnection.on('data', (data) => {
        buf.push(data);
        try {
          const { connectedAddress } = peerInterface.HolePunchRegisterResponse.decodeDelimited(Buffer.concat(buf));
          resolve(Address.parse(connectedAddress));
        } catch (error) {}
      });
    });

    return connectedAddress;
  }

  // returns the address for a local tcp server that is routed via UTP
  async createPipeServer(peerUDPAddress: Address): Promise<Address> {
    console.log('connecting to', peerUDPAddress);

    // create a TCP server and bind it to a random port
    const server = net.createServer((socket) => {
      // create a new socket pipe
      const socketPipe = new UDPToTCPSocketPipe(socket, peerUDPAddress);
      this.incomingSocketPipes.set(socketPipe.id, socketPipe);
    });

    return await new Promise((resolve, reject) => {
      server.listen(0, () => {
        console.log('TCP server routing to UDP server');
        resolve(Address.fromAddressInfo(<net.AddressInfo>server.address()));
      });
    });
  }
}

export default UDPHolePunchClient;
