import Cyclist from './Cyclist';
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
import * as peerInterface from '../../../../proto/js/Peer_pb';
import { sleep } from '../../../utils';

class MTPConnection extends Duplex {
  private peerId: string;

  private port: number;
  private host: string;
  socket: dgram.Socket;
  remoteAddress: Address;
  private outgoing: Cyclist<peerInterface.MTPPacket>;
  private incoming: Cyclist<peerInterface.MTPPacket>;
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

    this.outgoing = new Cyclist(BUFFER_SIZE);
    this.incoming = new Cyclist(BUFFER_SIZE);
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
      console.log('case1: syn packet');
      // a connecting boolean of 'true' is only used for clients that are waiting for the
      // server to send back a synack packet. if it is false, it means the server is waiting
      // for the client to connect.
      this.connecting = false;
      this.recvId = uint16(syn.getConnection() + 1);
      this.sendId = syn.getConnection();
      this.seq = (Math.random() * UINT16) | 0;
      this.ack = syn.getSeq();
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
        console.log('case2: socket Is Bound');
        this.connecting = true;
        this.recvId = 0; // tmp value for v8 opt
        this.sendId = 0; // tmp value for v8 opt
        this.seq = (Math.random() * UINT16) | 0;
        this.ack = 0;
        this.synack = undefined;

        this.recvId = uint16(Math.floor(Math.random() * 89999) + 10000);
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
        console.log('case3: socket Is not Bound');

        this.connecting = true;
        this.recvId = 0; // tmp value for v8 opt
        this.sendId = 0; // tmp value for v8 opt
        this.seq = (Math.random() * UINT16) | 0;
        this.ack = 0;
        this.synack = undefined;

        socket.on('listening', () => {
          this.recvId = uint16(Math.floor(Math.random() * 89999) + 10000);
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
        MTPConnection.createPacket(
          this.peerId,
          this.recvId,
          this.sendId,
          this.seq,
          this.ack,
          PACKET_FIN,
          null,
        ),
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

  destroy(
    err?: Error | undefined,
    callback?: ((error: Error | null) => void) | undefined,
  ) {
    this.end();
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
      return this.writeOnce('connect', data, enc, callback);
    }

    while (this._writable) {
      const payload = this.payload(data);
      this.sendOutgoing(
        MTPConnection.createPacket(
          this.peerId,
          this.recvId,
          this.sendId,
          this.seq,
          this.ack,
          PACKET_DATA,
          payload,
        ),
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

    if (uint32(first.getSent() - now) < timeout) {
      return;
    }

    // BUG: there is a bug here wherby packets are always inflight and
    // never get cleared, in other words it just keeps transmitting
    for (let i = 0; i < this.inflightPackets; i++) {
      const packet = this.outgoing.get(offset + i);
      if (!packet) {
        throw Error('packet doesn not exist');
      }
      if (uint32(packet.getSent() - now) >= timeout) {
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

  async recvIncoming(packet: peerInterface.MTPPacket) {
    let internalPacket: peerInterface.MTPPacket | undefined = packet;
    // connection is closed
    if (this.closed) {
      return;
    }

    // temporary to slow down looping traffic for debugging
    await sleep(1000);

    // send synack
    if (
      internalPacket.getId() === PACKET_SYN &&
      this.connecting &&
      this.synack
    ) {
      this.transmit(this.synack);
      return;
    }

    // packet is a reset packet
    if (internalPacket.getId() === PACKET_RESET) {
      console.log('PACKET_RESET!!');
      // this.push(null);
      // this.end();
      // this.closing();
      // return;
    }

    // still connecting
    if (this.connecting) {
      // if the id
      if (internalPacket.getId() !== PACKET_STATE) {
        return this.incoming.put(internalPacket.getSeq(), internalPacket);
      }

      this.ack = uint16(internalPacket.getSeq() - 1);
      this.recvAck(internalPacket.getAck());
      this.connecting = false;
      this.emit('connect');

      internalPacket = this.incoming.del(internalPacket.getSeq());
      if (!internalPacket) {
        return;
      }
    }

    if (uint16(internalPacket.getSeq() - this.ack) >= BUFFER_SIZE) {
      return this.sendAck(); // old packet
    }

    this.recvAck(internalPacket.getAck()); // TODO: other calcs as well

    if (internalPacket.getAck() === PACKET_STATE) {
      return;
    }
    this.incoming.put(internalPacket.getSeq(), internalPacket);

    while ((internalPacket = this.incoming.del(this.ack + 1))) {
      this.ack = uint16(this.ack + 1);

      if (internalPacket.getId() === PACKET_DATA) {
        this.push(internalPacket.getData_asU8());
      }
      if (internalPacket.getId() === PACKET_FIN) {
        this.push(null);
      }
    }

    // TODO: reenable this.sendAck after the below bug has been fixed:
    // // for some reason this sendAck makes the whole loop get stuck resending the ack
    // // then the other side acknowledging the ack packet and vice versa, never ending
    // // this is perhaps because somewhere in the loop, the code can't tell what is an
    // // ack what is note. so the fix for now is to just disable ack-knowledging (seems
    // // to work with out it ¯\_(ツ)_/¯)
    // this.sendAck();
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

  private sendOutgoing(packet: peerInterface.MTPPacket) {
    this.outgoing.put(packet.getSeq(), packet);
    this.seq = uint16(this.seq + 1);
    this.inflightPackets++;
    this.transmit(packet);
  }

  private transmit(packet: peerInterface.MTPPacket) {
    try {
      packet.setSent(
        packet.getSent() === 0
          ? packet.getTimestamp()
          : MTPConnection.timestamp(),
      );
      const message = packetToBuffer(packet);
      this.alive = true;
      this.socket.send(message, 0, message.length, this.port, this.host);
    } catch (error) {
      console.log(
        'MTPConnection: error when trying to transmit packet: ',
        error,
      );
    }
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
    const packet = new peerInterface.MTPPacket();
    packet.setId(id);
    packet.setPeerid(peerId);
    packet.setConnection(id === PACKET_SYN ? recvId : sendId);
    packet.setSeq(seq);
    packet.setAck(ack);
    packet.setTimestamp(MTPConnection.timestamp());
    packet.setTimediff(0);
    packet.setWindow(DEFAULT_WINDOW_SIZE);
    if (data) {
      packet.setData(data);
    }
    packet.setSent(0);
    return packet;
  }

  public static timestamp = (() => {
    const offset = process.hrtime();
    const then = Date.now() * 1000;
    return () => {
      const diff = process.hrtime(offset);
      return uint32(then + 1000000 * diff[0] + ((diff[1] / 1000) | 0));
    };
  })();

  public static connect(
    localPeerId: string,
    port: number,
    host?: string,
    socket?: dgram.Socket,
  ) {
    const internalSocket = socket ?? dgram.createSocket('udp4');

    const connection = new MTPConnection(
      localPeerId,
      port,
      host ?? '0.0.0.0',
      internalSocket,
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
        if (packet.getId() === PACKET_SYN) {
          return;
        }

        if (packet.getConnection() !== connection.RecvID) {
          return;
        }

        connection.recvIncoming(packet);
      } catch (error) {
        console.log(error);

        // no throw
      }
    });

    return connection;
  }
}

export default MTPConnection;
