// adapted from https://github.com/mafintosh/utp
import net from 'net';
import dgram from 'dgram';
import { EventEmitter } from 'events';
import { Address } from '../../PeerInfo';
import MTPConnection from './MTPConnection';
import { PACKET_SYN, MIN_PACKET_SIZE, bufferToPacket } from './utils';

class MTPServer extends EventEmitter {
  socket: dgram.Socket;
  closed: boolean;

  // peerId -> connection
  incomingConnections: Map<string, MTPConnection>;
  tertiaryMessageHandler?: (message: Uint8Array, address: Address) => Promise<void>;

  constructor(
    handleIncomingConnection: (conn: MTPConnection) => void,
    tertiaryMessageHandler?: (message: Uint8Array, address: Address) => Promise<void>,
  ) {
    super();
    this.tertiaryMessageHandler = tertiaryMessageHandler;

    this.on('connection', handleIncomingConnection);

    this.incomingConnections = new Map();
  }

  // this is the udp address for the MTP server
  address() {
    return Address.fromAddressInfo(this.socket.address() as net.AddressInfo);
  }

  // this is the method where both listenConnection and listPort call
  private listenSocket(socket: dgram.Socket, onListening: (address: Address) => void) {
    this.socket = socket;

    socket.on('message', (message, rinfo) => this.handleMessage(message, rinfo));

    socket.once('listening', () => {
      onListening(this.address());
    });
  }

  // can either listen on an existing connection
  listenConnection(connection: MTPConnection, onListening: (address: Address) => void) {
    this.listenSocket(connection.socket, onListening);
  }

  // or listen on a port
  listenPort(port: number, onListening: (address: Address) => void) {
    const socket = dgram.createSocket('udp4');
    this.listenSocket(socket, onListening);
    socket.bind(port);
  }

  close(cb: () => void) {
    let openConnections = 0;
    this.closed = true;

    const onClose = () => {
      if (--openConnections === 0) {
        if (this.socket) {
          this.socket.close();
        }
        if (cb) {
          cb();
        }
      }
    };

    for (const id in this.incomingConnections.keys()) {
      const connection = this.incomingConnections.get(id);
      if (!connection) {
        this.incomingConnections.delete(id);
        continue;
      }
      if (this.incomingConnections.get(id)?.closed) {
        continue;
      }
      openConnections++;
      connection.once('close', onClose);
      connection.end();
    }
  }

  // ==== Handler Methods ==== //
  private async handleMessage(message: Buffer, rinfo: dgram.RemoteInfo) {
    // ================================//
    // handle additional request handler
    // ================================//
    if (this.tertiaryMessageHandler) {
      try {
        const address = new Address(rinfo.address, rinfo.port);
        return await this.tertiaryMessageHandler(message, address);
      } catch (error) {
        // if anything went wrong, assume it is a direct connection request and move on
      }
    }

    // ============================================================================//
    // handle all other messages! they are direct connection requests to gRPC server
    // ============================================================================//
    if (message.length < MIN_PACKET_SIZE) {
      return;
    }

    const packet = bufferToPacket(message);

    // // not sure if this id is required but it has now been replaced with peerId pending further testing:
    // const id = rinfo.address + ':' + (packet.id === PACKET_SYN ? uint16(packet.connection + 1) : packet.connection);

    const peerId = packet.getPeerid();
    if (this.incomingConnections.has(peerId) && this.incomingConnections.get(peerId)) {
      return this.incomingConnections.get(peerId)!.recvIncoming(packet);
    }
    if (packet.getId() !== PACKET_SYN || this.closed) {
      return;
    }

    const newConnection = new MTPConnection(peerId, rinfo.port, rinfo.address, this.socket, packet);
    this.incomingConnections.set(peerId, newConnection);
    newConnection.on('close', () => {
      this.incomingConnections.delete(peerId);
    });

    this.emit('connection', newConnection);
  }
}

export { MTPConnection, MTPServer };
