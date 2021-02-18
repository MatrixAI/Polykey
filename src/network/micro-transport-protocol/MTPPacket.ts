// adapted from https://github.com/mafintosh/utp
import MTPConnection from './MTPConnection';

const EXTENSION = 0;
const VERSION = 1;
const UINT16 = 0xffff;
const ID_MASK = 0xf << 4;
const MTU = 100;
// const MTU = 1400;

const PACKET_DATA = 0 << 4;
const PACKET_FIN = 1 << 4;
const PACKET_STATE = 2 << 4;
const PACKET_RESET = 3 << 4;
const PACKET_SYN = 4 << 4;

// all headers (20) plus nodeId (16)
const MIN_PACKET_SIZE = 20 + 16;
const DEFAULT_WINDOW_SIZE = 1 << 18;
const CLOSE_GRACE = 5000;

const BUFFER_SIZE = 512;

const uint32 = function (n: number) {
  return n >>> 0;
};

const uint16 = function (n: number) {
  return n & UINT16;
};

const timestamp = (() => {
  const offset = process.hrtime();
  const then = Date.now() * 1000;
  return () => {
    const diff = process.hrtime(offset);
    return uint32(then + 1000000 * diff[0] + ((diff[1] / 1000) | 0));
  };
})();

type MTPPacket = {
  id: number;
  connection: number;
  timestamp: number;
  timediff: number;
  window: number;
  seq: number;
  ack: number;
  nodeId: string;
  data: Buffer | null;
  sent?: number;
};

const bufferToPacket = function (buffer: Buffer) {
  const packet: MTPPacket = {
    id: buffer[0] & ID_MASK,
    connection: buffer.readUInt16BE(2),
    timestamp: buffer.readUInt32BE(4),
    timediff: buffer.readUInt32BE(8),
    window: buffer.readUInt32BE(12),
    seq: buffer.readUInt16BE(16),
    ack: buffer.readUInt16BE(18),
    nodeId: buffer.toString('hex', 20, 36),
    data: buffer.length > MIN_PACKET_SIZE ? buffer.slice(MIN_PACKET_SIZE) : null,
  };
  return packet;
};

const packetToBuffer = function (packet: MTPPacket) {
  const buffer = Buffer.alloc(MIN_PACKET_SIZE + (packet.data ? packet.data.length : 0));
  buffer[0] = packet.id | VERSION;
  buffer[1] = EXTENSION;
  buffer.writeUInt16BE(packet.connection, 2);
  buffer.writeUInt32BE(packet.timestamp, 4);
  buffer.writeUInt32BE(packet.timediff, 8);
  buffer.writeUInt32BE(packet.window, 12);
  buffer.writeUInt16BE(packet.seq, 16);
  buffer.writeUInt16BE(packet.ack, 18);
  // write node id
  const nodeIdBuf = Buffer.from(packet.nodeId, 'hex')
  buffer.writeUInt32BE(nodeIdBuf.readUInt32BE(0), 20)
  buffer.writeUInt32BE(nodeIdBuf.readUInt32BE(4), 24)
  buffer.writeUInt32BE(nodeIdBuf.readUInt32BE(8), 28)
  buffer.writeUInt32BE(nodeIdBuf.readUInt32BE(12), 32)
  // write data
  if (packet.data) {
    packet.data.copy(buffer, MIN_PACKET_SIZE);
  }
  return buffer;
};

const createPacket = function (
  connection: MTPConnection,
  id: number,
  nodeId: string,
  data: Buffer | null
): MTPPacket {
  return {
    id: id,
    connection: id === PACKET_SYN ? connection.recvId : connection.sendId,
    seq: connection.seq,
    ack: connection.ack,
    timestamp: timestamp(),
    timediff: 0,
    window: DEFAULT_WINDOW_SIZE,
    nodeId: nodeId,
    data: data,
    sent: 0,
  };
};


export {
  EXTENSION,
  VERSION,
  UINT16,
  ID_MASK,
  MTU,
  PACKET_DATA,
  PACKET_FIN,
  PACKET_STATE,
  PACKET_RESET,
  PACKET_SYN,
  MIN_PACKET_SIZE,
  CLOSE_GRACE,
  BUFFER_SIZE,
  uint32,
  uint16,
  bufferToPacket,
  packetToBuffer,
  createPacket,
  timestamp,
  MTPPacket
};
export default MTPPacket
