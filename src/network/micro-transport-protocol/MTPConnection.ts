// adapted from https://github.com/mafintosh/utp
import dgram from 'dgram';
import Logger from '@matrixai/logger';
import { Duplex } from 'readable-stream';
import CyclicalBuffer from './CyclicalBuffer';
import { Address } from '../../nodes/NodeInfo';
import MTPPacket, {
  BUFFER_SIZE,
  uint16,
  UINT16,
  PACKET_STATE,
  PACKET_SYN,
  PACKET_FIN,
  CLOSE_GRACE,
  PACKET_DATA,
  MTU,
  uint32,
  PACKET_RESET,
  MIN_PACKET_SIZE,
  createPacket,
  packetToBuffer,
  timestamp,
  bufferToPacket,
} from './MTPPacket';

class MTPConnection extends Duplex {
  private nodeId: string;
  private logger: Logger;

  private port: number;
  private host: string;
  socket: dgram.Socket;
  remoteAddress: Address;
  private outgoing: CyclicalBuffer<MTPPacket>;
  private incoming: CyclicalBuffer<MTPPacket>;
  closed: boolean;
  private inflightPackets: number;
  private alive: boolean;
  connecting: boolean;
  recvId: number;
  sendId: number;
  seq: number;
  ack: number;
  private synack?: MTPPacket;

  constructor(
    nodeId: string,
    port: number,
    host: string,
    socket: dgram.Socket,
    logger: Logger,
    syn?: MTPPacket,
    socketIsBound = false,
  ) {
    super();

    this.nodeId = nodeId;

    this.remoteAddress = new Address(host, port);

    if (isNaN(port)) {
      throw Error('port cannot be NaN');
    }
    this.port = port;
    this.host = host;
    this.socket = socket;

    this.logger = logger;

    this.outgoing = new CyclicalBuffer(BUFFER_SIZE);
    this.incoming = new CyclicalBuffer(BUFFER_SIZE);
    this.closed = false;

    this.inflightPackets = 0;
    this.closed = false;
    this.alive = false;

    // the MTPConnection object could be constructed in 3 ways:
    // 1. with a syn packet (i.e. this is the server receiving a new connection
    //    request from a client that sent a syn packet)
    // 2. without a syn packet and with an already bound socket (i.e. this is a client asking
    //    for a direct hole punch connection from a dgram socket they already setup)
    // 3. without a syn packet and no bound socket (i.e. this is the client initiating
    //    a connection and asking for a new dgram socket to be created for the connection)
    if (syn) {
      this.logger.info('case1: syn packet');
      // a connecting boolean of 'true' is only used for clients that are waiting for the
      // server to send back a synack packet. if it is false, it means the server is waiting
      // for the client to connect.
      this.connecting = false;
      this.recvId = uint16(syn.connection + 1);
      this.sendId = syn.connection;
      this.seq = (Math.random() * UINT16) | 0;
      this.ack = syn.seq;
      this.synack = createPacket(this, PACKET_STATE, this.nodeId, null);

      this.transmit(this.synack);
    } else {
      if (socketIsBound) {
        this.logger.info('case2: socket Is Bound');
        this.connecting = true;
        this.recvId = 0; // tmp value for v8 opt
        this.sendId = 0; // tmp value for v8 opt
        this.seq = (Math.random() * UINT16) | 0;
        this.ack = 0;
        this.synack = undefined;

        this.recvId = uint16(Math.floor(Math.random() * 89999) + 10000);
        this.sendId = uint16(this.recvId + 1);

        const initialPacket = createPacket(this, PACKET_SYN, this.nodeId, null);
        this.sendOutgoing(initialPacket);

        socket.on('error', (err) => {
          this.emit('error', err);
        });
      } else {
        this.logger.info('case3: socket Is not Bound');

        this.connecting = true;
        this.recvId = 0; // tmp value for v8 opt
        this.sendId = 0; // tmp value for v8 opt
        this.seq = (Math.random() * UINT16) | 0;
        this.ack = 0;
        this.synack = undefined;

        socket.on('listening', () => {
          this.recvId = uint16(Math.floor(Math.random() * 89999) + 10000);
          this.sendId = uint16(this.recvId + 1);

          const initialPacket = createPacket(
            this,
            PACKET_SYN,
            this.nodeId,
            null,
          );
          this.sendOutgoing(initialPacket);
        });

        socket.on('error', (err) => {
          this.emit('error', err);
        });

        socket.bind();
      }
    }

    const resend = setInterval(this.resend.bind(this), 500);
    const keepAlive = setInterval(this.keepAlive.bind(this), 10 * 1000);
    let tick = 0;

    const closed = () => {
      if (++tick === 2) {
        this.closing();
      }
    };

    const sendFin = () => {
      if (this.connecting) {
        return this.once('connect', sendFin);
      }
      this.sendOutgoing(createPacket(this, PACKET_FIN, this.nodeId, null));
      this.once('flush', closed);
    };

    this.once('finish', sendFin);
    this.once('close', () => {
      if (!syn) {
        setTimeout(socket.close.bind(socket), CLOSE_GRACE);
      }
      clearInterval(resend);
      clearInterval(keepAlive);
    });
    this.once('end', () => {
      process.nextTick(closed);
    });

    this.socket.on('close', () => {
      this.end()
    })
    this.socket.on('error', (err) => {
      this.logger.error(err)
      this.end()
    })
  }

  destroy(
    err?: Error | undefined,
    callback?: ((error: Error | null) => void) | undefined,
  ) {
    if (err) {
      console.log(err);
    }
    this.end(callback);
    return this;
  }

  address() {
    return new Address(this.host, this.port);
  }

  _read() {
    // do nothing...
  }

  _write(
    data: Buffer,
    enc: string,
    callback: (error?: Error | null | undefined) => void,
  ): void {
    if (this.connecting) {
      return this._writeOnce('connect', data, enc, callback);
    }

    while (this._writable()) {
      const payload = this.payload(data);
      this.sendOutgoing(createPacket(this, PACKET_DATA, this.nodeId, payload));

      if (payload.length === data.length) {
        return callback();
      }
      // in case
      data = data.slice(payload.length);
    }

    this._writeOnce('flush', data, enc, callback);
  }

  private _writeOnce(
    event: string,
    data: Buffer,
    enc: string,
    callback: (error?: Error | null | undefined) => void,
  ) {
    this.once(event, () => {
      this._write(data, enc, callback);
    });
  }

  public _writable(): boolean {
    return this.inflightPackets < BUFFER_SIZE - 1;
  }

  private payload(data: Buffer) {
    if (data.length > MTU) {
      return data.slice(0, MTU);
    }
    return data;
  }

  private resend() {
    const offset = this.seq - this.inflightPackets;

    const first = this.outgoing.get(offset);
    if (!first) {
      return;
    }

    const timeout = 500000;
    const now = timestamp();

    if (uint32(first.sent! - now) < timeout) {
      return;
    }

    // BUG: there is a bug here wherby packets are always inflight and
    // never get cleared, in other words it just keeps transmitting
    for (let i = 0; i < this.inflightPackets; i++) {
      const packet = this.outgoing.get(offset + i);
      if (!packet) {
        throw Error('packet does not exist');
      }
      if (uint32(packet.sent! - now) >= timeout) {
        this.transmit(packet);
      }
    }
  }

  private keepAlive() {
    if (this.alive) {
      return (this.alive = false);
    }
    this.sendAck();
  }

  private closing() {
    if (this.closed) {
      return;
    }
    this.closed = true;
    process.nextTick(this.emit.bind(this, 'close'));
  }

  // packet handling
  private recvAck(ack: number) {
    const offset = this.seq - this.inflightPackets;
    const acked = uint16(ack - offset) + 1;

    if (acked >= BUFFER_SIZE) {
      return; // sanity check
    }

    for (let i = 0; i < acked; i++) {
      this.outgoing.del(offset + i);
      this.inflightPackets--;
    }

    if (!this.inflightPackets) {
      this.emit('flush');
    }
  }

  async recvIncoming(packet: MTPPacket) {
    // connection is closed
    if (this.closed) {
      return;
    }

    // send synack
    if (packet.id === PACKET_SYN && this.connecting) {
      this.transmit(this.synack!);
      return;
    }

    // packet is a reset packet
    if (packet.id === PACKET_RESET) {
      this.push(null);
      this.end();
      this.closing();
      return;
    }

    // still connecting
    if (this.connecting) {
      // if the id
      if (packet.id !== PACKET_STATE) {
        return this.incoming.put(packet.seq, packet);
      }

      this.ack = uint16(packet.seq - 1);
      this.recvAck(packet.ack);
      this.connecting = false;
      this.emit('connect');

      (packet as any) = this.incoming.del(packet.seq);
      if (!packet) {
        return;
      }
    }

    if (uint16(packet.seq - this.ack) >= BUFFER_SIZE) {
      return this.sendAck(); // old packet
    }

    this.recvAck(packet.ack); // TODO: other calcs as well

    if (packet.id === PACKET_STATE) {
      return;
    }
    this.incoming.put(packet.seq, packet);

    while (((packet as any) = this.incoming.del(this.ack + 1))) {
      this.ack = uint16(this.ack + 1);

      if (packet.id === PACKET_DATA) {
        this.push(packet.data);
      }
      if (packet.id === PACKET_FIN) {
        this.push(null);
      }
    }

    this.sendAck();
  }

  private sendAck() {
    const packet = createPacket(this, PACKET_STATE, this.nodeId, null);
    this.transmit(packet); // TODO: make this delayed
  }

  private sendOutgoing(packet: MTPPacket) {
    this.outgoing.put(packet.seq, packet);
    this.seq = uint16(this.seq + 1);
    this.inflightPackets++;
    this.transmit(packet);
  }

  private transmit(packet: MTPPacket) {
    try {
      packet.sent = packet.sent === 0 ? packet.timestamp : timestamp();
      const message = packetToBuffer(packet);
      this.alive = true;
      this.socket.send(message, 0, message.length, this.port, this.host);
    } catch (error) {
      this.logger.error(
        'MTPConnection: error when trying to transmit packet: ' +
        error.toString(),
      );
      if (error.toString().includes("ERR_SOCKET_DGRAM_NOT_RUNNING")) {
        this.logger.error('dgram socket is not running, destroying connection')
        this.destroy(error, (err) => {
          this.logger.error(`MTPConnection could not be destroyed, closing connection: "${err?.toString()}"`)
          this.end()
        })
      }
    }
  }

  // ==== Helper methods ==== //
  public static connect(
    localNodeId: string,
    port: number,
    host?: string,
    socket?: dgram.Socket,
  ) {
    const internalSocket = socket ?? dgram.createSocket('udp4');

    const connection = new MTPConnection(
      localNodeId,
      port,
      host ?? '0.0.0.0',
      internalSocket,
      new Logger('MTPconnection'),
      undefined,
      socket ? true : false,
    );

    internalSocket.on('message', (message) => {
      if (message.length < MIN_PACKET_SIZE) {
        return;
      }

      // sometimes if the packet is of a particular format, google-protobuf
      // will throw an assertion error and the whole application will stop
      // so this try catch block is here to catch and then not throw any
      // errors since if the packet is not of the right protobuf type
      // we don't want to throw anyway
      try {
        const packet = bufferToPacket(message);
        if (packet.id === PACKET_SYN) {
          return;
        }

        if (packet.connection !== connection.recvId) {
          return;
        }

        connection.recvIncoming(packet);
      } catch (error) {
        // no throw
        connection.logger.error(error);
      }
    });

    return connection;
  }
}

export default MTPConnection;
