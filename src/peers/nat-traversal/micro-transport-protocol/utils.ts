import * as peerInterface from '../../../proto/js/Peer_pb';

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

function bufferToPacket(buffer: Uint8Array): peerInterface.MTPPacket {
  return peerInterface.MTPPacket.deserializeBinary(buffer);
}

function packetToBuffer(packet: peerInterface.MTPPacket): Uint8Array {
  return packet.serializeBinary();
}

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
  DEFAULT_WINDOW_SIZE,
  CLOSE_GRACE,
  BUFFER_SIZE,
  uint32,
  uint16,
  bufferToPacket,
  packetToBuffer,
};
