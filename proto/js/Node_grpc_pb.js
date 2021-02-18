// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var Node_pb = require('./Node_pb.js');
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

function serialize_agentInterface_NodeInfoReadOnlyMessage(arg) {
  if (!(arg instanceof Agent_pb.NodeInfoReadOnlyMessage)) {
    throw new Error('Expected argument of type agentInterface.NodeInfoReadOnlyMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agentInterface_NodeInfoReadOnlyMessage(buffer_arg) {
  return Agent_pb.NodeInfoReadOnlyMessage.deserializeBinary(new Uint8Array(buffer_arg));
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

function serialize_nodeInterface_InfoReply(arg) {
  if (!(arg instanceof Node_pb.InfoReply)) {
    throw new Error('Expected argument of type nodeInterface.InfoReply');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_nodeInterface_InfoReply(buffer_arg) {
  return Node_pb.InfoReply.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_nodeInterface_InfoRequest(arg) {
  if (!(arg instanceof Node_pb.InfoRequest)) {
    throw new Error('Expected argument of type nodeInterface.InfoRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_nodeInterface_InfoRequest(buffer_arg) {
  return Node_pb.InfoRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_nodeInterface_NodeDHTFindNodeReply(arg) {
  if (!(arg instanceof Node_pb.NodeDHTFindNodeReply)) {
    throw new Error('Expected argument of type nodeInterface.NodeDHTFindNodeReply');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_nodeInterface_NodeDHTFindNodeReply(buffer_arg) {
  return Node_pb.NodeDHTFindNodeReply.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_nodeInterface_NodeDHTFindNodeRequest(arg) {
  if (!(arg instanceof Node_pb.NodeDHTFindNodeRequest)) {
    throw new Error('Expected argument of type nodeInterface.NodeDHTFindNodeRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_nodeInterface_NodeDHTFindNodeRequest(buffer_arg) {
  return Node_pb.NodeDHTFindNodeRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_nodeInterface_PackReply(arg) {
  if (!(arg instanceof Node_pb.PackReply)) {
    throw new Error('Expected argument of type nodeInterface.PackReply');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_nodeInterface_PackReply(buffer_arg) {
  return Node_pb.PackReply.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_nodeInterface_PackRequest(arg) {
  if (!(arg instanceof Node_pb.PackRequest)) {
    throw new Error('Expected argument of type nodeInterface.PackRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_nodeInterface_PackRequest(buffer_arg) {
  return Node_pb.PackRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_nodeInterface_PingNodeMessage(arg) {
  if (!(arg instanceof Node_pb.PingNodeMessage)) {
    throw new Error('Expected argument of type nodeInterface.PingNodeMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_nodeInterface_PingNodeMessage(buffer_arg) {
  return Node_pb.PingNodeMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_nodeInterface_VaultNamesReply(arg) {
  if (!(arg instanceof Node_pb.VaultNamesReply)) {
    throw new Error('Expected argument of type nodeInterface.VaultNamesReply');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_nodeInterface_VaultNamesReply(buffer_arg) {
  return Node_pb.VaultNamesReply.deserializeBinary(new Uint8Array(buffer_arg));
}


// ////////////////
// Node Service //
// ////////////////
var NodeService = exports.NodeService = {
  // general p2p stuff
pingNode: {
    path: '/nodeInterface.Node/PingNode',
    requestStream: false,
    responseStream: false,
    requestType: Node_pb.PingNodeMessage,
    responseType: Node_pb.PingNodeMessage,
    requestSerialize: serialize_nodeInterface_PingNodeMessage,
    requestDeserialize: deserialize_nodeInterface_PingNodeMessage,
    responseSerialize: serialize_nodeInterface_PingNodeMessage,
    responseDeserialize: deserialize_nodeInterface_PingNodeMessage,
  },
  // git
getGitInfo: {
    path: '/nodeInterface.Node/GetGitInfo',
    requestStream: false,
    responseStream: false,
    requestType: Node_pb.InfoRequest,
    responseType: Node_pb.InfoReply,
    requestSerialize: serialize_nodeInterface_InfoRequest,
    requestDeserialize: deserialize_nodeInterface_InfoRequest,
    responseSerialize: serialize_nodeInterface_InfoReply,
    responseDeserialize: deserialize_nodeInterface_InfoReply,
  },
  getGitPack: {
    path: '/nodeInterface.Node/GetGitPack',
    requestStream: false,
    responseStream: false,
    requestType: Node_pb.PackRequest,
    responseType: Node_pb.PackReply,
    requestSerialize: serialize_nodeInterface_PackRequest,
    requestDeserialize: deserialize_nodeInterface_PackRequest,
    responseSerialize: serialize_nodeInterface_PackReply,
    responseDeserialize: deserialize_nodeInterface_PackReply,
  },
  getVaultNames: {
    path: '/nodeInterface.Node/GetVaultNames',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.EmptyMessage,
    responseType: Node_pb.VaultNamesReply,
    requestSerialize: serialize_agentInterface_EmptyMessage,
    requestDeserialize: deserialize_agentInterface_EmptyMessage,
    responseSerialize: serialize_nodeInterface_VaultNamesReply,
    responseDeserialize: deserialize_nodeInterface_VaultNamesReply,
  },
  // // === NAT traversal === //
// // BindAddress is for a client to request a public relay node to bind its UDP address
// // this method returns the udp address of the public relay nodes' main udp socket
// // it will bind the local udp socket to the remote one which creates a NAT table entry
// // note: only public relay nodes can respond
// rpc BindAddress (agentInterface.NodeInfoReadOnlyMessage) returns (agentInterface.StringMessage) {};
// // === Hole Punching
//
getUDPAddress: {
    path: '/nodeInterface.Node/GetUDPAddress',
    requestStream: false,
    responseStream: false,
    requestType: Agent_pb.NodeInfoReadOnlyMessage,
    responseType: Agent_pb.StringMessage,
    requestSerialize: serialize_agentInterface_NodeInfoReadOnlyMessage,
    requestDeserialize: deserialize_agentInterface_NodeInfoReadOnlyMessage,
    responseSerialize: serialize_agentInterface_StringMessage,
    responseDeserialize: deserialize_agentInterface_StringMessage,
  },
  // CA functionality
getRootCertificate: {
    path: '/nodeInterface.Node/GetRootCertificate',
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
    path: '/nodeInterface.Node/RequestCertificateSigning',
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
nodeDHTFindNode: {
    path: '/nodeInterface.Node/NodeDHTFindNode',
    requestStream: false,
    responseStream: false,
    requestType: Node_pb.NodeDHTFindNodeRequest,
    responseType: Node_pb.NodeDHTFindNodeReply,
    requestSerialize: serialize_nodeInterface_NodeDHTFindNodeRequest,
    requestDeserialize: deserialize_nodeInterface_NodeDHTFindNodeRequest,
    responseSerialize: serialize_nodeInterface_NodeDHTFindNodeReply,
    responseDeserialize: deserialize_nodeInterface_NodeDHTFindNodeReply,
  },
};

exports.NodeClient = grpc.makeGenericClientConstructor(NodeService);
