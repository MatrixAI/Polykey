// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var Peer_pb = require('./Peer_pb.js');

function serialize_peerInterface_PeerMessage(arg) {
  if (!(arg instanceof Peer_pb.PeerMessage)) {
    throw new Error('Expected argument of type peerInterface.PeerMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_peerInterface_PeerMessage(buffer_arg) {
  return Peer_pb.PeerMessage.deserializeBinary(new Uint8Array(buffer_arg));
}


// ////////////////
// Peer Service //
// ////////////////
var PeerService = exports.PeerService = {
  messagePeer: {
    path: '/peerInterface.Peer/MessagePeer',
    requestStream: false,
    responseStream: false,
    requestType: Peer_pb.PeerMessage,
    responseType: Peer_pb.PeerMessage,
    requestSerialize: serialize_peerInterface_PeerMessage,
    requestDeserialize: deserialize_peerInterface_PeerMessage,
    responseSerialize: serialize_peerInterface_PeerMessage,
    responseDeserialize: deserialize_peerInterface_PeerMessage,
  },
};

exports.PeerClient = grpc.makeGenericClientConstructor(PeerService);
