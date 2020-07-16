// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var Git_pb = require('./Git_pb.js');

function serialize_git_InfoReply(arg) {
  if (!(arg instanceof Git_pb.InfoReply)) {
    throw new Error('Expected argument of type git.InfoReply');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_git_InfoReply(buffer_arg) {
  return Git_pb.InfoReply.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_git_InfoRequest(arg) {
  if (!(arg instanceof Git_pb.InfoRequest)) {
    throw new Error('Expected argument of type git.InfoRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_git_InfoRequest(buffer_arg) {
  return Git_pb.InfoRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_git_PackReply(arg) {
  if (!(arg instanceof Git_pb.PackReply)) {
    throw new Error('Expected argument of type git.PackReply');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_git_PackReply(buffer_arg) {
  return Git_pb.PackReply.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_git_PackRequest(arg) {
  if (!(arg instanceof Git_pb.PackRequest)) {
    throw new Error('Expected argument of type git.PackRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_git_PackRequest(buffer_arg) {
  return Git_pb.PackRequest.deserializeBinary(new Uint8Array(buffer_arg));
}


var GitServerService = exports.GitServerService = {
  // Request info about a vault as a git repo
requestInfo: {
    path: '/git.GitServer/RequestInfo',
    requestStream: false,
    responseStream: false,
    requestType: Git_pb.InfoRequest,
    responseType: Git_pb.InfoReply,
    requestSerialize: serialize_git_InfoRequest,
    requestDeserialize: deserialize_git_InfoRequest,
    responseSerialize: serialize_git_InfoReply,
    responseDeserialize: deserialize_git_InfoReply,
  },
  // Request a particular pack from remote
requestPack: {
    path: '/git.GitServer/RequestPack',
    requestStream: false,
    responseStream: false,
    requestType: Git_pb.PackRequest,
    responseType: Git_pb.PackReply,
    requestSerialize: serialize_git_PackRequest,
    requestDeserialize: deserialize_git_PackRequest,
    responseSerialize: serialize_git_PackReply,
    responseDeserialize: deserialize_git_PackReply,
  },
};

exports.GitServerClient = grpc.makeGenericClientConstructor(GitServerService);
