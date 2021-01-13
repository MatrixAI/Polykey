// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var Peer_pb = require('./Peer_pb.js');
var Agent_pb = require('./Agent_pb.js');

function serialize_agentInterface_EmptyMessage(arg) {
  if (!(arg instanceof Agent_pb.EmptyMessage)) {
    throw new Error('Expected argument of type agentInterface.EmptyMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_EmptyMessage(buffer_arg) {
  return Agent_pb.EmptyMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agentInterface_PeerInfoReadOnlyMessage(arg) {
  if (!(arg instanceof Agent_pb.PeerInfoReadOnlyMessage)) {
    throw new Error('Expected argument of type agentInterface.PeerInfoReadOnlyMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_PeerInfoReadOnlyMessage(buffer_arg) {
  return Agent_pb.PeerInfoReadOnlyMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agentInterface_StringMessage(arg) {
  if (!(arg instanceof Agent_pb.StringMessage)) {
    throw new Error('Expected argument of type agentInterface.StringMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_StringMessage(buffer_arg) {
  return Agent_pb.StringMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_peerInterface_InfoReply(arg) {
  if (!(arg instanceof Peer_pb.InfoReply)) {
    throw new Error('Expected argument of type peerInterface.InfoReply');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_peerInterface_InfoReply(buffer_arg) {
  return Peer_pb.InfoReply.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_peerInterface_InfoRequest(arg) {
  if (!(arg instanceof Peer_pb.InfoRequest)) {
    throw new Error('Expected argument of type peerInterface.InfoRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_peerInterface_InfoRequest(buffer_arg) {
  return Peer_pb.InfoRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_peerInterface_PackReply(arg) {
  if (!(arg instanceof Peer_pb.PackReply)) {
    throw new Error('Expected argument of type peerInterface.PackReply');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_peerInterface_PackReply(buffer_arg) {
  return Peer_pb.PackReply.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_peerInterface_PackRequest(arg) {
  if (!(arg instanceof Peer_pb.PackRequest)) {
    throw new Error('Expected argument of type peerInterface.PackRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_peerInterface_PackRequest(buffer_arg) {
  return Peer_pb.PackRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_peerInterface_PeerDHTFindNodeReply(arg) {
  if (!(arg instanceof Peer_pb.PeerDHTFindNodeReply)) {
    throw new Error('Expected argument of type peerInterface.PeerDHTFindNodeReply');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_peerInterface_PeerDHTFindNodeReply(buffer_arg) {
  return Peer_pb.PeerDHTFindNodeReply.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_peerInterface_PeerDHTFindNodeRequest(arg) {
  if (!(arg instanceof Peer_pb.PeerDHTFindNodeRequest)) {
    throw new Error('Expected argument of type peerInterface.PeerDHTFindNodeRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_peerInterface_PeerDHTFindNodeRequest(buffer_arg) {
  return Peer_pb.PeerDHTFindNodeRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_peerInterface_PingPeerMessage(arg) {
  if (!(arg instanceof Peer_pb.PingPeerMessage)) {
    throw new Error('Expected argument of type peerInterface.PingPeerMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_peerInterface_PingPeerMessage(buffer_arg) {
  return Peer_pb.PingPeerMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_peerInterface_PublicRelayReply(arg) {
  if (!(arg instanceof Peer_pb.PublicRelayReply)) {
    throw new Error('Expected argument of type peerInterface.PublicRelayReply');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_peerInterface_PublicRelayReply(buffer_arg) {
  return Peer_pb.PublicRelayReply.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_peerInterface_PublicRelayRequest(arg) {
  if (!(arg instanceof Peer_pb.PublicRelayRequest)) {
    throw new Error('Expected argument of type peerInterface.PublicRelayRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_peerInterface_PublicRelayRequest(buffer_arg) {
  return Peer_pb.PublicRelayRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_peerInterface_VaultNamesReply(arg) {
  if (!(arg instanceof Peer_pb.VaultNamesReply)) {
    throw new Error('Expected argument of type peerInterface.VaultNamesReply');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_peerInterface_VaultNamesReply(buffer_arg) {
  return Peer_pb.VaultNamesReply.deserializeBinary(new Uint8Array(buffer_arg));
}


// ////////////////
// Peer Service //
// ////////////////
var PeerService = exports.PeerService = {
  // general p2p stuff
pingPeer: {
    path: '/peerInterface.Peer/PingPeer',
    requestStream: false,
    responseStream: false,
    requestType: Peer_pb.PingPeerMessage,
    responseType: Peer_pb.PingPeerMessage,
    requestSerialize: serialize_peerInterface_PingPeerMessage,
    requestDeserialize: deserialize_peerInterface_PingPeerMessage,
    responseSerialize: serialize_peerInterface_PingPeerMessage,
    responseDeserialize: deserialize_peerInterface_PingPeerMessage,
  },
  // git
getGitInfo: {
    path: '/peerInterface.Peer/GetGitInfo',
    requestStream: false,
    responseStream: false,
    requestType: Peer_pb.InfoRequest,
    responseType: Peer_pb.InfoReply,
    requestSerialize: serialize_peerInterface_InfoRequest,
    requestDeserialize: deserialize_peerInterface_InfoRequest,
    responseSerialize: serialize_peerInterface_InfoReply,
    responseDeserialize: deserialize_peerInterface_InfoReply,
  },
  getGitPack: {
    path: '/peerInterface.Peer/GetGitPack',
    requestStream: false,
    responseStream: false,
    requestType: Peer_pb.PackRequest,
    responseType: Peer_pb.PackReply,
    requestSerialize: serialize_peerInterface_PackRequest,
    requestDeserialize: deserialize_peerInterface_PackRequest,
    responseSerialize: serialize_peerInterface_PackReply,
    responseDeserialize: deserialize_peerInterface_PackReply,
  },
  getVaultNames: {
    path: '/peerInterface.Peer/GetVaultNames',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.EmptyMessage,
    responseType: Peer_pb.VaultNamesReply,
    requestSerialize: serialize_agentInterface_EmptyMessage,
    requestDeserialize: deserialize_agentInterface_EmptyMessage,
    responseSerialize: serialize_peerInterface_VaultNamesReply,
    responseDeserialize: deserialize_peerInterface_VaultNamesReply,
  },
  // NAT traversal
// the only two NAT traversal methods that are exposed via gRPC are GetUDPAddress and
// RequestPublicRelay. The other two (RequestDirectHolePunch and RequestHolePunch)
// will only be available via the UDP channels
getUDPAddress: {
    path: '/peerInterface.Peer/GetUDPAddress',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.EmptyMessage,
    responseType: Agent_pb.StringMessage,
    requestSerialize: serialize_agentInterface_EmptyMessage,
    requestDeserialize: deserialize_agentInterface_EmptyMessage,
    responseSerialize: serialize_agentInterface_StringMessage,
    responseDeserialize: deserialize_agentInterface_StringMessage,
  },
  requestPublicRelay: {
    path: '/peerInterface.Peer/RequestPublicRelay',
    requestStream: false,
    responseStream: false,
    requestType: Peer_pb.PublicRelayRequest,
    responseType: Peer_pb.PublicRelayReply,
    requestSerialize: serialize_peerInterface_PublicRelayRequest,
    requestDeserialize: deserialize_peerInterface_PublicRelayRequest,
    responseSerialize: serialize_peerInterface_PublicRelayReply,
    responseDeserialize: deserialize_peerInterface_PublicRelayReply,
  },
  // CA functionality
getRootCertificate: {
    path: '/peerInterface.Peer/GetRootCertificate',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.EmptyMessage,
    responseType: Agent_pb.StringMessage,
    requestSerialize: serialize_agentInterface_EmptyMessage,
    requestDeserialize: deserialize_agentInterface_EmptyMessage,
    responseSerialize: serialize_agentInterface_StringMessage,
    responseDeserialize: deserialize_agentInterface_StringMessage,
  },
  requestCertificateSigning: {
    path: '/peerInterface.Peer/RequestCertificateSigning',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.StringMessage,
    responseType: Agent_pb.StringMessage,
    requestSerialize: serialize_agentInterface_StringMessage,
    requestDeserialize: deserialize_agentInterface_StringMessage,
    responseSerialize: serialize_agentInterface_StringMessage,
    responseDeserialize: deserialize_agentInterface_StringMessage,
  },
  // DHT Functionality
peerDHTFindNode: {
    path: '/peerInterface.Peer/PeerDHTFindNode',
    requestStream: false,
    responseStream: false,
    requestType: Peer_pb.PeerDHTFindNodeRequest,
    responseType: Peer_pb.PeerDHTFindNodeReply,
    requestSerialize: serialize_peerInterface_PeerDHTFindNodeRequest,
    requestDeserialize: deserialize_peerInterface_PeerDHTFindNodeRequest,
    responseSerialize: serialize_peerInterface_PeerDHTFindNodeReply,
    responseDeserialize: deserialize_peerInterface_PeerDHTFindNodeReply,
  },
  // This method is for public relay nodes only and by default
// it rejects all calls to it in order to protect private nodes
// from adding random peers
addPeerInfo: {
    path: '/peerInterface.Peer/AddPeerInfo',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.PeerInfoReadOnlyMessage,
    responseType: Agent_pb.EmptyMessage,
    requestSerialize: serialize_agentInterface_PeerInfoReadOnlyMessage,
    requestDeserialize: deserialize_agentInterface_PeerInfoReadOnlyMessage,
    responseSerialize: serialize_agentInterface_EmptyMessage,
    responseDeserialize: deserialize_agentInterface_EmptyMessage,
  },
};

exports.PeerClient = grpc.makeGenericClientConstructor(PeerService);
