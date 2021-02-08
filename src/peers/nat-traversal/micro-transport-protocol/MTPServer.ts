// adapted from https://github.com/mafintosh/utp
import net from 'net';
import dgram from 'dgram';
import { EventEmitter } from 'events';
import { Address } from '../../PeerInfo';
import MTPConnection from './MTPConnection';
import { promisify } from 'util';
import * as peerInterface from '../../../../proto/js/Peer_pb';
import * as agentInterface from '../../../../proto/js/Agent_pb';
import { PACKET_SYN, MIN_PACKET_SIZE, bufferToPacket, uint16 } from './utils';
import Logger from '@matrixai/js-logger';

class MTPServer extends EventEmitter {
  socket: dgram.Socket;
  closed: boolean;
  private logger: Logger;

  // peerId -> connection
  private incomingConnections: Map<string, MTPConnection>;
  // tertiaryMessageHandler?: (message: Uint8Array, address: Address) => Promise<void>;

  constructor(
    handleIncomingConnection: (conn: MTPConnection) => void,
    // tertiaryMessageHandler?: (message: Uint8Array, address: Address) => Promise<void>,
    logger: Logger,
  ) {
    super();
    // this.tertiaryMessageHandler = tertiaryMessageHandler;

    this.on('connection', handleIncomingConnection);

    this.incomingConnections = new Map();

    this.logger = logger;
  }

  // this is the udp address for the MTP server
  remoteAddress() {
    const address = this.address();
    address.updateHost(process.env.PK_PEER_HOST ?? '0.0.0.0');
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
      await promisify(this.socket.close)();
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
    // since this could very well be a server on a private node, we need to have
    // keepalive packets to keep the address translation rule in the NAT layer
    if (message.toString() == 'keepalive') {
      this.logger.info(
        'privateNode: got a keepalive packet, sending ok response',
      );
      this.socket.send('okay-keepalive', rinfo.port, rinfo.address, (err) => {
        if (err) {
          this.logger.error(
            'privateNode: sending okay-keepalive packet failed with error: ' +
              err.toString(),
          );
        } else {
          this.logger.info('privateNode: sending okay-keepalive succeeded');
        }
      });
    }

    // treat the message as intended for one of the connections
    if (message.length < MIN_PACKET_SIZE) {
      return;
    }

    const packet = bufferToPacket(message);

    // I think the issue is that this id is the same for every new relay connection
    const id =
      packet.getPeerid() +
      ':' +
      (packet.getId() === PACKET_SYN
        ? uint16(packet.getConnection() + 1)
        : packet.getConnection());
    this.logger.info('privateNode: handleMessage id: ' + id.toString());

    const incomingConnection = this.incomingConnections.get(id);
    if (incomingConnection) {
      this.logger.info('privateNode: sending packet to an incoming connection');
      return incomingConnection.recvIncoming(packet);
    }
    if (packet.getId() !== PACKET_SYN || this.closed) {
      return;
    }

    const peerId = packet.getPeerid();
    const newConnection = new MTPConnection(
      peerId,
      rinfo.port,
      rinfo.address,
      this.socket,
      this.logger.getLogger('MTPConnection'),
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
