// adapted from https://github.com/mafintosh/utp
import net from 'net';
import dgram from 'dgram';
import { EventEmitter } from 'events';
import { Address } from '../../nodes/Node';
import MTPConnection from './MTPConnection';
import { promisify } from 'util';
import Logger from '@matrixai/logger';
import NatTraversal from '../nat-traversal/NatTraversal';
import {
  PACKET_SYN,
  MIN_PACKET_SIZE,
  bufferToPacket,
  uint16,
} from './MTPPacket';

class MTPServer extends EventEmitter {
  socket: dgram.Socket;
  closed: boolean;
  private logger: Logger;

  // nodeId -> connection
  private incomingConnections: Map<string, MTPConnection>;

  constructor(
    handleIncomingConnection: (conn: MTPConnection) => void,
    logger: Logger,
  ) {
    super();

    this.on('connection', handleIncomingConnection);

    this.incomingConnections = new Map();

    this.logger = logger;
  }

  // this is the udp address for the MTP server
  remoteAddress() {
    const address = this.address();
    if (process.env.PK_PEER_HOST) {
      address.updateHost(process.env.PK_PEER_HOST);
    }
    return address;
  }

  // this is the udp address for the MTP server
  address() {
    return Address.fromAddressInfo(this.socket.address() as net.AddressInfo);
  }

  // this is the method where both listenConnection and listPort call
  listenSocket(
    socket: dgram.Socket,
    onListening: (address: Address) => void,
    socketIsBound: boolean = false,
  ) {
    this.socket = socket;

    socket.on('message', (message, rinfo) =>
      this.handleMessage(message, rinfo),
    );

    if (!socketIsBound) {
      socket.once('listening', () => {
        onListening(this.address());
      });
    } else {
      onListening(this.address());
    }
  }

  // can either listen on an existing connection
  listenConnection(
    connection: MTPConnection,
    onListening: (address: Address) => void,
  ) {
    this.listenSocket(connection.socket, onListening);
  }

  // or listen on a port
  listenPort(
    port: number,
    host: string,
    onListening: (address: Address) => void,
  ) {
    const socket = dgram.createSocket('udp4');
    this.listenSocket(socket, onListening);
    socket.bind(port, host);
  }

  async close() {
    let openConnections = 0;
    this.closed = true;

    if (this.socket) {
      this.socket.removeAllListeners();
      try {
        await promisify(this.socket.close)();
      } catch (error) {
        // no throw
      }
    }

    const onClose = () => {
      if (--openConnections === 0) {
        return;
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
    return;
  }

  // ==== Handler Methods ==== //
  private async handleMessage(message: Buffer, rinfo: dgram.RemoteInfo) {
    // want to ignore any keepalive packets because its not the MTPServer's
    // job to handle these
    if (
      NatTraversal.KeepaliveRegex.test(message.toString()) ||
      NatTraversal.OkayKeepaliveRegex.test(message.toString())
    ) {
      return;
    }

    // treat the message as intended for one of the connections
    if (message.length < MIN_PACKET_SIZE) {
      return;
    }

    const packet = bufferToPacket(message);

    // I think the issue is that this id is the same for every new relay connection
    const id =
      packet.nodeId +
      ':' +
      (packet.id === PACKET_SYN
        ? uint16(packet.connection + 1)
        : packet.connection);

    const incomingConnection = this.incomingConnections.get(id);
    if (incomingConnection) {
      return incomingConnection.recvIncoming(packet);
    }
    if (packet.id !== PACKET_SYN || this.closed) {
      return;
    }

    const newConnection = new MTPConnection(
      packet.nodeId,
      rinfo.port,
      rinfo.address,
      this.socket,
      // this.logger.getLogger('MTPConnection'),
      this.logger,
      packet,
    );
    this.incomingConnections.set(id, newConnection);
    newConnection.on('close', () => {
      this.incomingConnections.delete(id);
    });

    this.emit('connection', newConnection);
  }
}

export { MTPConnection, MTPServer };
