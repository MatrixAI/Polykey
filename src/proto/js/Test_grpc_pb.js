// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var Test_pb = require('./Test_pb.js');

function serialize_testInterface_EchoMessage(arg) {
  if (!(arg instanceof Test_pb.EchoMessage)) {
    throw new Error('Expected argument of type testInterface.EchoMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_testInterface_EchoMessage(buffer_arg) {
  return Test_pb.EchoMessage.deserializeBinary(new Uint8Array(buffer_arg));
}


var TestService = exports.TestService = {
  unary: {
    path: '/testInterface.Test/Unary',
    requestStream: false,
    responseStream: false,
    requestType: Test_pb.EchoMessage,
    responseType: Test_pb.EchoMessage,
    requestSerialize: serialize_testInterface_EchoMessage,
    requestDeserialize: deserialize_testInterface_EchoMessage,
    responseSerialize: serialize_testInterface_EchoMessage,
    responseDeserialize: deserialize_testInterface_EchoMessage,
  },
  serverStream: {
    path: '/testInterface.Test/ServerStream',
    requestStream: false,
    responseStream: true,
    requestType: Test_pb.EchoMessage,
    responseType: Test_pb.EchoMessage,
    requestSerialize: serialize_testInterface_EchoMessage,
    requestDeserialize: deserialize_testInterface_EchoMessage,
    responseSerialize: serialize_testInterface_EchoMessage,
    responseDeserialize: deserialize_testInterface_EchoMessage,
  },
  clientStream: {
    path: '/testInterface.Test/ClientStream',
    requestStream: true,
    responseStream: false,
    requestType: Test_pb.EchoMessage,
    responseType: Test_pb.EchoMessage,
    requestSerialize: serialize_testInterface_EchoMessage,
    requestDeserialize: deserialize_testInterface_EchoMessage,
    responseSerialize: serialize_testInterface_EchoMessage,
    responseDeserialize: deserialize_testInterface_EchoMessage,
  },
  duplexStream: {
    path: '/testInterface.Test/DuplexStream',
    requestStream: true,
    responseStream: true,
    requestType: Test_pb.EchoMessage,
    responseType: Test_pb.EchoMessage,
    requestSerialize: serialize_testInterface_EchoMessage,
    requestDeserialize: deserialize_testInterface_EchoMessage,
    responseSerialize: serialize_testInterface_EchoMessage,
    responseDeserialize: deserialize_testInterface_EchoMessage,
  },
};

exports.TestClient = grpc.makeGenericClientConstructor(TestService);
