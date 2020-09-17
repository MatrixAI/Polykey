// adapted from https://github.com/mafintosh/utp
import net from 'net';
import dgram from 'dgram';
import cyclist from 'cyclist';
import { EventEmitter } from 'events';
import { Duplex } from 'readable-stream';
import { Address } from '../PeerInfo';

const EXTENSION = 0;
const VERSION = 1;
const UINT16 = 0xffff;
const ID_MASK = 0xf << 4;
const MTU = 1400;

const PACKET_DATA = 0 << 4;
const PACKET_FIN = 1 << 4;
const PACKET_STATE = 2 << 4;
const PACKET_RESET = 3 << 4;
const PACKET_SYN = 4 << 4;

const MIN_PACKET_SIZE = 20;
const DEFAULT_WINDOW_SIZE = 1 << 18;
const CLOSE_GRACE = 5000;

const BUFFER_SIZE = 512;

const uint32 = function (n) {
  return n >>> 0;
};

const uint16 = function (n) {
  return n & UINT16;
};

const timestamp = (function () {
  const offset = process.hrtime();
  const then = Date.now() * 1000;

  return function () {
    const diff = process.hrtime(offset);
    return uint32(then + 1000000 * diff[0] + ((diff[1] / 1000) | 0));
  };
})();

type Packet = {
  id: number;
  connection: number;
  timestamp: number;
  timediff: number;
  window: number;
  seq: number;
  ack: number;
  data: Buffer | null;
  sent?: number;
};
const bufferToPacket = function (buffer: Buffer) {
  const packet: Packet = {
    id: buffer[0] & ID_MASK,
    connection: buffer.readUInt16BE(2),
    timestamp: buffer.readUInt32BE(4),
    timediff: buffer.readUInt32BE(8),
    window: buffer.readUInt32BE(12),
    seq: buffer.readUInt16BE(16),
    ack: buffer.readUInt16BE(18),
    data: buffer.length > 20 ? buffer.slice(20) : null,
  };
  return packet;
};

const packetToBuffer = function (packet: Packet) {
  const buffer = Buffer.alloc(20 + (packet.data ? packet.data.length : 0));
  buffer[0] = packet.id | VERSION;
  buffer[1] = EXTENSION;
  buffer.writeUInt16BE(packet.connection, 2);
  buffer.writeUInt32BE(packet.timestamp, 4);
  buffer.writeUInt32BE(packet.timediff, 8);
  buffer.writeUInt32BE(packet.window, 12);
  buffer.writeUInt16BE(packet.seq, 16);
  buffer.writeUInt16BE(packet.ack, 18);
  if (packet.data) {
    packet.data.copy(buffer, 20);
  }
  return buffer;
};

const createPacket = function (connection, id, data): Packet {
  return {
    id: id,
    connection: id === PACKET_SYN ? connection._recvId : connection._sendId,
    seq: connection._seq,
    ack: connection._ack,
    timestamp: timestamp(),
    timediff: 0,
    window: DEFAULT_WINDOW_SIZE,
    data: data,
    sent: 0,
  };
};

class MTPConnection extends Duplex {
  private port: number;
  private host: string;
  socket: dgram.Socket;
  remoteAddress: Address;
  private _outgoing: any;
  private _incoming: any;
  private _closed: boolean;
  private _inflightPackets: number;
  private _alive: boolean;
  private _connecting: boolean;
  private _recvId: number;
  public get RecvID(): number {
    return this._recvId;
  }

  private _sendId: number;
  private _seq: number;
  private _ack: number;
  private _synack?: Packet;
  constructor(port: number, host: string, socket: dgram.Socket, syn?: Packet) {
    super();

    this.remoteAddress = new Address(host, port);

    if (isNaN(port)) {
      throw Error('port cannot be NaN');
    }
    this.port = port;
    this.host = host;
    this.socket = socket;

    this._outgoing = cyclist(BUFFER_SIZE);
    this._incoming = cyclist(BUFFER_SIZE);
    this._closed = false;

    this._inflightPackets = 0;
    this._closed = false;
    this._alive = false;

    if (syn) {
      this._connecting = false;
      this._recvId = uint16(syn.connection + 1);
      this._sendId = syn.connection;
      this._seq = (Math.random() * UINT16) | 0;
      this._ack = syn.seq;
      this._synack = createPacket(this, PACKET_STATE, null);

      this._transmit(this._synack);
    } else {
      this._connecting = true;
      this._recvId = 0; // tmp value for v8 opt
      this._sendId = 0; // tmp value for v8 opt
      this._seq = (Math.random() * UINT16) | 0;
      this._ack = 0;
      this._synack = undefined;

      socket.on('listening', () => {
        this._recvId = socket.address().port; // using the port gives us system wide clash protection
        this._sendId = uint16(this._recvId + 1);
        this._sendOutgoing(createPacket(this, PACKET_SYN, null));
      });

      socket.on('error', (err) => {
        this.emit('error', err);
      });

      socket.bind();
    }

    const resend = setInterval(this._resend.bind(this), 500);
    const keepAlive = setInterval(this._keepAlive.bind(this), 10 * 1000);
    let tick = 0;

    const closed = () => {
      if (++tick === 2) {
        this._closing();
      }
    };

    const sendFin = () => {
      if (this._connecting) {
        return this.once('connect', sendFin);
      }
      this._sendOutgoing(createPacket(this, PACKET_FIN, null));
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

  _write(data: any[], enc: string, callback: () => void) {
    if (this._connecting) {
      return this._writeOnce('connect', data, enc, callback);
    }

    while (this._writable()) {
      const payload = this._payload(data);

      this._sendOutgoing(createPacket(this, PACKET_DATA, payload));

      if (payload.length === data.length) {
        return callback();
      }
      data = data.slice(payload.length);
    }

    this._writeOnce('flush', data, enc, callback);
  }

  _writeOnce(event, data, enc, callback) {
    this.once(event, () => {
      this._write(data, enc, callback);
    });
  }

  _writable() {
    return this._inflightPackets < BUFFER_SIZE - 1;
  }

  _payload(data) {
    if (data.length > MTU) {
      return data.slice(0, MTU);
    }
    return data;
  }

  _resend() {
    const offset = this._seq - this._inflightPackets;
    const first = this._outgoing.get(offset);
    if (!first) {
      return;
    }

    const timeout = 500000;
    const now = timestamp();

    if (uint32(first.sent - now) < timeout) {
      return;
    }

    for (let i = 0; i < this._inflightPackets; i++) {
      const packet = this._outgoing.get(offset + i);
      if (uint32(packet.sent - now) >= timeout) {
        this._transmit(packet);
      }
    }
  }

  _keepAlive() {
    if (this._alive) {
      return (this._alive = false);
    }
    this._sendAck();
  }

  _closing() {
    if (this._closed) {
      return;
    }
    this._closed = true;
    process.nextTick(this.emit.bind(this, 'close'));
  }

  // packet handling

  _recvAck(ack) {
    const offset = this._seq - this._inflightPackets;
    const acked = uint16(ack - offset) + 1;

    if (acked >= BUFFER_SIZE) {
      return; // sanity check
    }

    for (let i = 0; i < acked; i++) {
      this._outgoing.del(offset + i);
      this._inflightPackets--;
    }

    if (!this._inflightPackets) {
      this.emit('flush');
    }
  }

  _recvIncoming(packet) {
    if (this._closed) {
      return;
    }

    if (packet.id === PACKET_SYN && this._connecting) {
      this._transmit(this._synack);
      return;
    }
    if (packet.id === PACKET_RESET) {
      this.push(null);
      this.end();
      this._closing();
      return;
    }
    if (this._connecting) {
      if (packet.id !== PACKET_STATE) {
        return this._incoming.put(packet.seq, packet);
      }

      this._ack = uint16(packet.seq - 1);
      this._recvAck(packet.ack);
      this._connecting = false;
      this.emit('connect');

      packet = this._incoming.del(packet.seq);
      if (!packet) {
        return;
      }
    }

    if (uint16(packet.seq - this._ack) >= BUFFER_SIZE) {
      return this._sendAck(); // old packet
    }

    this._recvAck(packet.ack); // TODO: other calcs as well

    if (packet.id === PACKET_STATE) {
      return;
    }
    this._incoming.put(packet.seq, packet);

    while ((packet = this._incoming.del(this._ack + 1))) {
      this._ack = uint16(this._ack + 1);

      if (packet.id === PACKET_DATA) {
        this.push(packet.data);
      }
      if (packet.id === PACKET_FIN) {
        this.push(null);
      }
    }

    this._sendAck();
  }

  _sendAck() {
    this._transmit(createPacket(this, PACKET_STATE, null)); // TODO: make this delayed
  }

  _sendOutgoing(packet) {
    this._outgoing.put(packet.seq, packet);
    this._seq = uint16(this._seq + 1);
    this._inflightPackets++;
    this._transmit(packet);
  }

  _transmit(packet) {
    try {
      packet.sent = packet.sent === 0 ? packet.timestamp : timestamp();
      const message = packetToBuffer(packet);
      this._alive = true;
      this.socket.send(message, 0, message.length, this.port, this.host);
    } catch (error) {}
  }
}

class UTPServer extends EventEmitter {
  _socket: dgram.Socket;
  _connections: {};
  _closed: boolean;
  constructor() {
    super();

    this._connections = {};
  }

  address() {
    return Address.fromAddressInfo(<net.AddressInfo>this._socket.address());
  }

  listenSocket(socket: dgram.Socket, onlistening: (...args: any[]) => void) {
    this._socket = socket;

    const connections = this._connections;

    socket.on('message', (message, rinfo) => {
      if (message.length < MIN_PACKET_SIZE) {
        return;
      }
      const packet = bufferToPacket(message);

      const id = rinfo.address + ':' + (packet.id === PACKET_SYN ? uint16(packet.connection + 1) : packet.connection);

      if (connections[id]) {
        return connections[id]._recvIncoming(packet);
      }
      if (packet.id !== PACKET_SYN || this._closed) {
        return;
      }

      connections[id] = new MTPConnection(rinfo.port, rinfo.address, socket, packet);
      connections[id].on('close', () => {
        delete connections[id];
      });

      this.emit('connection', connections[id]);
    });

    socket.once('listening', () => {
      this.emit('listening');
    });

    if (onlistening) {
      this.once('listening', onlistening);
    }
  }

  listen(connection: MTPConnection, onlistening: (...args: any[]) => void) {
    this.listenSocket(connection.socket, onlistening);
  }

  listenPort(port: number, onlistening: (...args: any[]) => void) {
    const socket = dgram.createSocket('udp4');
    this.listenSocket(socket, onlistening);
    socket.bind(port);
  }

  close(cb) {
    let openConnections = 0;
    this._closed = true;

    function onClose() {
      if (--openConnections === 0) {
        if (this._socket) {
          this._socket.close();
        }
        if (cb) {
          cb();
        }
      }
    }

    for (const id in this._connections) {
      if (this._connections[id]._closed) {
        continue;
      }
      openConnections++;
      this._connections[id].once('close', onClose);
      this._connections[id].end();
    }
  }
}

function createServer(onconnection) {
  const server = new UTPServer();
  if (onconnection) {
    server.on('connection', onconnection);
  }
  return server;
}

function connect(port: number, host?: string) {
  const socket = dgram.createSocket('udp4');

  const connection = new MTPConnection(port, host || '127.0.0.1', socket, undefined);

  socket.on('message', (message) => {
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

    connection._recvIncoming(packet);
  });

  return connection;
}

export { connect, MTPConnection, createServer, UTPServer };
