import cyclist from 'cyclist';
import dgram from 'dgram';
import { Duplex } from 'readable-stream';
import { Address } from '../../PeerInfo';
import {
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
  DEFAULT_WINDOW_SIZE,
  MIN_PACKET_SIZE,
  bufferToPacket,
  packetToBuffer,
} from './utils';
import { peerInterface } from '../../../../proto/js/Peer';

class MTPConnection extends Duplex {
  private peerId: string;

  private port: number;
  private host: string;
  socket: dgram.Socket;
  remoteAddress: Address;
  private outgoing: any;
  private incoming: any;
  closed: boolean;
  private inflightPackets: number;
  private alive: boolean;
  connecting: boolean;
  private recvId: number;
  public get RecvID(): number {
    return this.recvId;
  }

  private sendId: number;
  private seq: number;
  private ack: number;
  private synack?: peerInterface.MTPPacket;

  constructor(
    peerId: string,
    port: number,
    host: string,
    socket: dgram.Socket,
    syn?: peerInterface.MTPPacket,
    socketIsBound = false,
  ) {
    super();

    this.peerId = peerId;

    this.remoteAddress = new Address(host, port);

    if (isNaN(port)) {
      throw Error('port cannot be NaN');
    }
    this.port = port;
    this.host = host;
    this.socket = socket;

    this.outgoing = cyclist(BUFFER_SIZE);
    this.incoming = cyclist(BUFFER_SIZE);
    this.closed = false;

    this.inflightPackets = 0;
    this.closed = false;
    this.alive = false;

    if (syn) {
      this.connecting = false;
      this.recvId = uint16(syn.connection + 1);
      this.sendId = syn.connection;
      this.seq = (Math.random() * UINT16) | 0;
      this.ack = syn.seq;
      this.synack = MTPConnection.createPacket(
        this.peerId,
        this.recvId,
        this.sendId,
        this.seq,
        this.ack,
        PACKET_STATE,
        null,
      );

      this.transmit(this.synack);
    } else {
      if (socketIsBound) {
        this.connecting = true;
        this.recvId = 0; // tmp value for v8 opt
        this.sendId = 0; // tmp value for v8 opt
        this.seq = (Math.random() * UINT16) | 0;
        this.ack = 0;
        this.synack = undefined;

        this.recvId = Math.floor(Math.random() * 900000) + 100000;
        this.sendId = uint16(this.recvId + 1);

        const initialPacket = MTPConnection.createPacket(
          this.peerId,
          this.recvId,
          this.sendId,
          this.seq,
          this.ack,
          PACKET_SYN,
          null,
        );

        this.sendOutgoing(initialPacket);

        socket.on('error', (err) => {
          this.emit('error', err);
        });
      } else {
        this.connecting = true;
        this.recvId = 0; // tmp value for v8 opt
        this.sendId = 0; // tmp value for v8 opt
        this.seq = (Math.random() * UINT16) | 0;
        this.ack = 0;
        this.synack = undefined;

        socket.on('listening', () => {
          this.recvId = Math.floor(Math.random() * 89999) + 10000;
          this.sendId = uint16(this.recvId + 1);

          const initialPacket = MTPConnection.createPacket(
            this.peerId,
            this.recvId,
            this.sendId,
            this.seq,
            this.ack,
            PACKET_SYN,
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
      this.sendOutgoing(
        MTPConnection.createPacket(this.peerId, this.recvId, this.sendId, this.seq, this.ack, PACKET_FIN, null),
      );
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
  }

  destroy(err?: Error | undefined, callback?: ((error: Error | null) => void) | undefined) {
    this.end();
    return this;
  }

  address() {
    return new Address(this.host, this.port);
  }

  _read() {
    // do nothing...
  }

  _write(data: any[], enc: string, callback: (error?: Error | null | undefined) => void): void {
    if (this.connecting) {
      return this.writeOnce('connect', data, enc, callback);
    }

    while (this._writable) {
      const payload = this.payload(data);
      this.sendOutgoing(
        MTPConnection.createPacket(this.peerId, this.recvId, this.sendId, this.seq, this.ack, PACKET_DATA, payload),
      );

      if (payload.length === data.length) {
        return callback();
      }
      data = data.slice(payload.length);
    }

    this.writeOnce('flush', data, enc, callback);
  }

  private writeOnce(event, data, enc, callback) {
    this.once(event, () => {
      this._write(data, enc, callback);
    });
  }

  public _writable(): boolean {
    return this.inflightPackets < BUFFER_SIZE - 1;
  }

  private payload(data) {
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
    const now = MTPConnection.timestamp();

    if (uint32(first.sent - now) < timeout) {
      return;
    }

    for (let i = 0; i < this.inflightPackets; i++) {
      const packet = this.outgoing.get(offset + i);
      if (uint32(packet.sent - now) >= timeout) {
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

  recvIncoming(packet: peerInterface.MTPPacket) {
    if (this.closed) {
      return;
    }

    if (packet.id === PACKET_SYN && this.connecting) {
      this.transmit(this.synack!);
      return;
    }

    if (packet.id === PACKET_RESET) {
      this.push(null);
      this.end();
      this.closing();
      return;
    }

    if (this.connecting) {
      if (packet.id !== PACKET_STATE) {
        return this.incoming.put(packet.seq, packet);
      }

      this.ack = uint16(packet.seq - 1);
      this.recvAck(packet.ack);
      this.connecting = false;
      this.emit('connect');

      packet = this.incoming.del(packet.seq);
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

    while ((packet = this.incoming.del(this.ack + 1))) {
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
    const packet = MTPConnection.createPacket(
      this.peerId,
      this.recvId,
      this.sendId,
      this.seq,
      this.ack,
      PACKET_STATE,
      null,
    );
    this.transmit(packet); // TODO: make this delayed
  }

  private sendOutgoing(packet) {
    this.outgoing.put(packet.seq, packet);
    this.seq = uint16(this.seq + 1);
    this.inflightPackets++;
    this.transmit(packet);
  }

  private transmit(packet: peerInterface.MTPPacket) {
    try {
      packet.sent = packet.sent === 0 ? packet.timestamp : MTPConnection.timestamp();
      const message = packetToBuffer(packet);
      this.alive = true;
      this.socket.send(message, 0, message.length, this.port, this.host);
    } catch (error) {}
  }

  // ==== Helper methods ==== //
  public static createPacket(
    peerId: string,
    recvId: number,
    sendId: number,
    seq: number,
    ack: number,
    id: number,
    data: Uint8Array | null,
  ): peerInterface.MTPPacket {
    return new peerInterface.MTPPacket({
      id: id,
      peerId: peerId,
      connection: id === PACKET_SYN ? recvId : sendId,
      seq: seq,
      ack: ack,
      timestamp: MTPConnection.timestamp(),
      timediff: 0,
      window: DEFAULT_WINDOW_SIZE,
      data: data ? data : undefined,
      sent: 0,
    });
  }

  public static timestamp = (() => {
    const offset = process.hrtime();
    const then = Date.now() * 1000;
    return () => {
      const diff = process.hrtime(offset);
      return uint32(then + 1000000 * diff[0] + ((diff[1] / 1000) | 0));
    };
  })();

  public static connect(localPeerId: string, port: number, host?: string, socket?: dgram.Socket) {
    const internalSocket = socket ?? dgram.createSocket('udp4');
    const connection = new MTPConnection(
      localPeerId,
      port,
      host || '127.0.0.1',
      internalSocket,
      undefined,
      socket ? true : false,
    );

    internalSocket.on('message', (message) => {
      if (message.length < MIN_PACKET_SIZE) {
        return;
      }

      const packet = bufferToPacket(message);
      if (packet.id === PACKET_SYN) {
        return;
      }

      if (packet.connection !== connection.RecvID) {
        return;
      }

      connection.recvIncoming(packet);
    });

    return connection;
  }
}

export default MTPConnection;
