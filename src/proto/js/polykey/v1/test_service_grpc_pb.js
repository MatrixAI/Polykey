// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var polykey_v1_utils_utils_pb = require('../../polykey/v1/utils/utils_pb.js');

function serialize_polykey_v1_utils_EchoMessage(arg) {
  if (!(arg instanceof polykey_v1_utils_utils_pb.EchoMessage)) {
    throw new Error('Expected argument of type polykey.v1.utils.EchoMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_polykey_v1_utils_EchoMessage(buffer_arg) {
  return polykey_v1_utils_utils_pb.EchoMessage.deserializeBinary(new Uint8Array(buffer_arg));
}


var TestServiceService = exports.TestServiceService = {
  unary: {
    path: '/polykey.v1.TestService/Unary',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_utils_utils_pb.EchoMessage,
    responseType: polykey_v1_utils_utils_pb.EchoMessage,
    requestSerialize: serialize_polykey_v1_utils_EchoMessage,
    requestDeserialize: deserialize_polykey_v1_utils_EchoMessage,
    responseSerialize: serialize_polykey_v1_utils_EchoMessage,
    responseDeserialize: deserialize_polykey_v1_utils_EchoMessage,
  },
  serverStream: {
    path: '/polykey.v1.TestService/ServerStream',
    requestStream: false,
    responseStream: true,
    requestType: polykey_v1_utils_utils_pb.EchoMessage,
    responseType: polykey_v1_utils_utils_pb.EchoMessage,
    requestSerialize: serialize_polykey_v1_utils_EchoMessage,
    requestDeserialize: deserialize_polykey_v1_utils_EchoMessage,
    responseSerialize: serialize_polykey_v1_utils_EchoMessage,
    responseDeserialize: deserialize_polykey_v1_utils_EchoMessage,
  },
  clientStream: {
    path: '/polykey.v1.TestService/ClientStream',
    requestStream: true,
    responseStream: false,
    requestType: polykey_v1_utils_utils_pb.EchoMessage,
    responseType: polykey_v1_utils_utils_pb.EchoMessage,
    requestSerialize: serialize_polykey_v1_utils_EchoMessage,
    requestDeserialize: deserialize_polykey_v1_utils_EchoMessage,
    responseSerialize: serialize_polykey_v1_utils_EchoMessage,
    responseDeserialize: deserialize_polykey_v1_utils_EchoMessage,
  },
  duplexStream: {
    path: '/polykey.v1.TestService/DuplexStream',
    requestStream: true,
    responseStream: true,
    requestType: polykey_v1_utils_utils_pb.EchoMessage,
    responseType: polykey_v1_utils_utils_pb.EchoMessage,
    requestSerialize: serialize_polykey_v1_utils_EchoMessage,
    requestDeserialize: deserialize_polykey_v1_utils_EchoMessage,
    responseSerialize: serialize_polykey_v1_utils_EchoMessage,
    responseDeserialize: deserialize_polykey_v1_utils_EchoMessage,
  },
  unaryAuthenticated: {
    path: '/polykey.v1.TestService/UnaryAuthenticated',
    requestStream: false,
    responseStream: false,
    requestType: polykey_v1_utils_utils_pb.EchoMessage,
    responseType: polykey_v1_utils_utils_pb.EchoMessage,
    requestSerialize: serialize_polykey_v1_utils_EchoMessage,
    requestDeserialize: deserialize_polykey_v1_utils_EchoMessage,
    responseSerialize: serialize_polykey_v1_utils_EchoMessage,
    responseDeserialize: deserialize_polykey_v1_utils_EchoMessage,
  },
};

exports.TestServiceClient = grpc.makeGenericClientConstructor(TestServiceService);
