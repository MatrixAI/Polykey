/**
 * GRPC Test Service
 * These are test service handlers that provide unary, server
 * streaming, client streaming and bidirectional streaming
 * @module
 */
import type { Authenticate } from '@/client/types';
import type { SessionToken } from '@/sessions/types';
import type { ITestServiceServer } from '@/proto/js/polykey/v1/test_service_grpc_pb';
import type { Host, Port } from '@/network/types';
import Logger from '@matrixai/logger';
import * as grpc from '@grpc/grpc-js';
import * as grpcUtils from '@/grpc/utils';
import * as grpcErrors from '@/grpc/errors';
import * as clientUtils from '@/client/utils';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import { sleep } from '@/utils';
import * as testUtils from '../../utils';

function createTestService({
  authenticate,
  logger = new Logger('TestService'),
}: {
  authenticate: Authenticate;
  logger?: Logger;
}) {
  const nodeId = testUtils.generateRandomNodeId();
  const host = '127.0.0.1' as Host;
  const port = 0 as Port;
  const testService: ITestServiceServer = {
    unary: async (
      call: grpc.ServerUnaryCall<utilsPB.EchoMessage, utilsPB.EchoMessage>,
      callback: grpc.sendUnaryData<utilsPB.EchoMessage>,
    ): Promise<void> => {
      logger.info('Received unary call on TestService');
      // Reflect leading metadata
      const meta = new grpc.Metadata();
      const token = clientUtils.decodeAuthToSession(call.metadata);
      if (token != null) {
        clientUtils.encodeAuthFromSession(
          (token + '-reflect') as SessionToken,
          meta,
        );
        call.sendMetadata(meta);
      }
      const challenge = call.request.getChallenge();
      if (challenge === 'error') {
        // If the challenge was error
        // we'll send back an error
        callback(
          grpcUtils.fromError(
            new grpcErrors.ErrorGRPC('test error', { data: { grpc: true } }),
          ),
        );
      } else {
        // Otherwise we will echo the challenge
        const message = new utilsPB.EchoMessage();
        message.setChallenge(challenge);
        callback(null, message);
      }
    },
    serverStream: async (
      call: grpc.ServerWritableStream<utilsPB.EchoMessage, utilsPB.EchoMessage>,
    ): Promise<void> => {
      logger.info('Received server stream call on TestService');
      // Reflect leading metadata
      const meta = new grpc.Metadata();
      const token = clientUtils.decodeAuthToSession(call.metadata);
      if (token != null) {
        clientUtils.encodeAuthFromSession(
          (token + '-reflect') as SessionToken,
          meta,
        );
        call.sendMetadata(meta);
      }
      const genWritable = grpcUtils.generatorWritable(call, false);
      const messageFrom = call.request;
      const messageTo = new utilsPB.EchoMessage();
      const challenge = messageFrom.getChallenge();
      if (challenge === 'error') {
        await genWritable.throw(
          new grpcErrors.ErrorGRPC('test error', { data: { grpc: true } }),
        );
      } else {
        // Will send back a number of message
        // equal to the character length of the challenge string
        for (let i = 0; i < messageFrom.getChallenge().length; i++) {
          messageTo.setChallenge(messageFrom.getChallenge());
          await genWritable.next(messageTo);
        }
        // Finish the writing
        await genWritable.next(null);
      }
    },
    clientStream: async (
      call: grpc.ServerReadableStream<utilsPB.EchoMessage, utilsPB.EchoMessage>,
      callback: grpc.sendUnaryData<utilsPB.EchoMessage>,
    ): Promise<void> => {
      logger.info('Received client stream call on TestService');
      // Reflect leading metadata
      const meta = new grpc.Metadata();
      const token = clientUtils.decodeAuthToSession(call.metadata);
      if (token != null) {
        clientUtils.encodeAuthFromSession(
          (token + '-reflect') as SessionToken,
          meta,
        );
        call.sendMetadata(meta);
      }
      const genReadable = grpcUtils.generatorReadable<utilsPB.EchoMessage>(
        call,
        {
          nodeId,
          host,
          port,
          command: 'genReadable',
        },
      );
      let data = '';
      try {
        for await (const m of genReadable) {
          const d = m.getChallenge();
          data += d;
        }
      } catch (e) {
        // Reflect the error back
        callback(e, null);
      }
      const response = new utilsPB.EchoMessage();
      response.setChallenge(data);
      callback(null, response);
    },
    duplexStream: async (
      call: grpc.ServerDuplexStream<utilsPB.EchoMessage, utilsPB.EchoMessage>,
    ) => {
      logger.info('Received duplex stream call on TestService');
      // Reflect leading metadata
      const meta = new grpc.Metadata();
      const token = clientUtils.decodeAuthToSession(call.metadata);
      if (token != null) {
        clientUtils.encodeAuthFromSession(
          (token + '-reflect') as SessionToken,
          meta,
        );
        call.sendMetadata(meta);
      }
      const genDuplex = grpcUtils.generatorDuplex(
        call,
        {
          nodeId,
          host,
          port,
          command: 'genDuplex',
        },
        false,
      );
      const readStatus = await genDuplex.read();
      // If nothing to read, end and destroy
      if (readStatus.done) {
        // It is not possible to write once read is done
        // in fact the stream is destroyed
        await genDuplex.next(null);
        return;
      }
      const incomingMessage = readStatus.value;
      if (incomingMessage.getChallenge() === 'error') {
        await genDuplex.throw(
          new grpcErrors.ErrorGRPC('test error', { data: { grpc: true } }),
        );
      } else {
        const outgoingMessage = new utilsPB.EchoMessage();
        outgoingMessage.setChallenge(incomingMessage.getChallenge());
        // Write 2 messages
        await genDuplex.write(outgoingMessage);
        await genDuplex.write(outgoingMessage);
        // End and destroy
        await genDuplex.next(null);
      }
    },
    unaryAuthenticated: async (
      call: grpc.ServerUnaryCall<utilsPB.EchoMessage, utilsPB.EchoMessage>,
      callback: grpc.sendUnaryData<utilsPB.EchoMessage>,
    ): Promise<void> => {
      logger.info('Received unary call on TestService');
      // Authenticate the metadata
      const meta = await authenticate(call.metadata);
      call.sendMetadata(meta);
      const challenge = call.request.getChallenge();
      if (challenge === 'error') {
        // If the challenge was error
        // we'll send back an error
        callback(
          grpcUtils.fromError(
            new grpcErrors.ErrorGRPC('test error', { data: { grpc: true } }),
          ),
        );
      } else {
        // Otherwise we will echo the challenge
        const message = new utilsPB.EchoMessage();
        message.setChallenge(challenge);
        callback(null, message);
      }
    },
    serverStreamFail: async (
      call: grpc.ServerWritableStream<utilsPB.EchoMessage, utilsPB.EchoMessage>,
    ): Promise<void> => {
      const genWritable = grpcUtils.generatorWritable(call, false);
      try {
        const echoMessage = new utilsPB.EchoMessage().setChallenge('Hello!');
        for (let i = 0; i < 10; i++) {
          await sleep(100);
          await genWritable.write(echoMessage);
        }
        const message = call.request.getChallenge();
        if (message === 'exit') process.exit(0);
        if (message === 'kill') process.kill(process.pid);
        if (message === 'sigkill') process.kill(process.pid, 9);
        for (let i = 0; i < 10; i++) {
          await sleep(100);
          await genWritable.write(echoMessage);
        }
        await genWritable.write(null);
      } catch (err) {
        await genWritable.throw(err);
      }
    },
    unaryFail: async (
      call: grpc.ServerUnaryCall<utilsPB.EchoMessage, utilsPB.EchoMessage>,
      callback: grpc.sendUnaryData<utilsPB.EchoMessage>,
    ): Promise<void> => {
      try {
        // Wait a long time and then close the server.
        await sleep(2000);
        const message = call.request.getChallenge();
        if (message === 'exit') process.exit(0);
        if (message === 'kill') process.kill(process.pid);
        if (message === 'sigkill') process.kill(process.pid, 9);
        await sleep(2000);
        callback(null, new utilsPB.EchoMessage().setChallenge('hello!'));
      } catch (err) {
        callback(grpcUtils.fromError(err));
      }
    },
  };
  return testService;
}

export default createTestService;
