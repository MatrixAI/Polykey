import type { NodeId } from '@/nodes/types';
import type { TLSConfig } from '@/network/types';

import * as grpc from '@grpc/grpc-js';
import { GRPCClient, utils as grpcUtils, errors as grpcErrors } from '@/grpc';
import * as testPB from '@/proto/js/Test_pb';
import { TestService, ITestServer, TestClient } from '@/proto/js/Test_grpc_pb';
import { promisify } from '@/utils';

/**
 * Test GRPC service
 */
const testService: ITestServer = {
  unary: async (
    call: grpc.ServerUnaryCall<testPB.EchoMessage, testPB.EchoMessage>,
    callback: grpc.sendUnaryData<testPB.EchoMessage>,
  ): Promise<void> => {
    const challenge = call.request.getChallenge();
    if (challenge === 'error') {
      // If the challenge was error
      // we'll send back an error
      callback(
        grpcUtils.fromError(
          new grpcErrors.ErrorGRPC('test error', { grpc: true }),
        ),
      );
    } else {
      // Otherwise we will echo the challenge
      const message = new testPB.EchoMessage();
      message.setChallenge(challenge);
      callback(null, message);
    }
  },
  serverStream: async (
    call: grpc.ServerWritableStream<testPB.EchoMessage, testPB.EchoMessage>,
  ): Promise<void> => {
    const genWritable = grpcUtils.generatorWritable(call);
    const messageFrom = call.request;
    const messageTo = new testPB.EchoMessage();
    const challenge = messageFrom.getChallenge();
    if (challenge === 'error') {
      await genWritable.throw(
        new grpcErrors.ErrorGRPC('test error', { grpc: true }),
      );
    } else {
      // Will send back a number of messsage
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
    call: grpc.ServerReadableStream<testPB.EchoMessage, testPB.EchoMessage>,
    callback: grpc.sendUnaryData<testPB.EchoMessage>,
  ): Promise<void> => {
    const genReadable = grpcUtils.generatorReadable<testPB.EchoMessage>(call);
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
    const response = new testPB.EchoMessage();
    response.setChallenge(data);
    callback(null, response);
  },
  duplexStream: async (
    call: grpc.ServerDuplexStream<testPB.EchoMessage, testPB.EchoMessage>,
  ) => {
    const genDuplex = grpcUtils.generatorDuplex(call);
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
        new grpcErrors.ErrorGRPC('test error', { grpc: true }),
      );
    } else {
      const outgoingMessage = new testPB.EchoMessage();
      outgoingMessage.setChallenge(incomingMessage.getChallenge());
      // Write 2 messages
      await genDuplex.write(outgoingMessage);
      await genDuplex.write(outgoingMessage);
      // End and destroy
      await genDuplex.next(null);
    }
  },
};

class GRPCClientTest extends GRPCClient<TestClient> {
  public async start({
    tlsConfig,
    timeout = Infinity,
  }: {
    tlsConfig?: TLSConfig;
    timeout?: number;
  } = {}): Promise<void> {
    await super.start({
      clientConstructor: TestClient,
      tlsConfig,
      timeout,
    });
  }

  public unary(...args) {
    return grpcUtils.promisifyUnaryCall<testPB.EchoMessage>(
      this.client,
      this.client.unary,
    )(...args);
  }

  public serverStream(...args) {
    return grpcUtils.promisifyReadableStreamCall<testPB.EchoMessage>(
      this.client,
      this.client.serverStream,
    )(...args);
  }

  public clientStream(...args) {
    return grpcUtils.promisifyWritableStreamCall<
      testPB.EchoMessage,
      testPB.EchoMessage
    >(
      this.client,
      this.client.clientStream,
    )(...args);
  }

  public duplexStream(...args) {
    return grpcUtils.promisifyDuplexStreamCall<
      testPB.EchoMessage,
      testPB.EchoMessage
    >(
      this.client,
      this.client.duplexStream,
    )(...args);
  }
}

async function openTestServer(): Promise<[grpc.Server, number]> {
  const server = new grpc.Server();
  server.addService(TestService, testService);
  const bindAsync = promisify(server.bindAsync).bind(server);
  const port = await bindAsync(
    `127.0.0.1:0`,
    grpcUtils.serverInsecureCredentials(),
  );
  server.start();
  return [server, port];
}

async function closeTestServer(server: grpc.Server): Promise<void> {
  const tryShutdown = promisify(server.tryShutdown).bind(server);
  await tryShutdown();
}

function closeTestServerForce(server: grpc.Server): void {
  server.forceShutdown();
}

async function openTestClient(port: number): Promise<TestClient> {
  const client = new TestClient(
    `127.0.0.1:${port}`,
    grpcUtils.clientInsecureCredentials(),
  );
  const waitForReady = promisify(client.waitForReady).bind(client);
  await waitForReady(Infinity);
  return client;
}

function closeTestClient(client: TestClient): void {
  client.close();
}

async function openTestClientSecure(
  nodeId: NodeId,
  port: number,
  keyPrivatePem,
  certChainPem,
): Promise<TestClient> {
  const clientOptions = {
    // Prevents complaints with having an ip address as the server name
    'grpc.ssl_target_name_override': nodeId,
  };
  const clientCredentials = grpcUtils.clientSecureCredentials(
    keyPrivatePem,
    certChainPem,
  );
  const client = new TestClient(
    `127.0.0.1:${port}`,
    clientCredentials,
    clientOptions,
  );
  const waitForReady = promisify(client.waitForReady).bind(client);
  await waitForReady(Infinity);
  return client;
}

function closeTestClientSecure(client: TestClient) {
  client.close();
}

async function openTestServerSecure(
  keyPrivatePem,
  certChainPem,
): Promise<[grpc.Server, number]> {
  const server = new grpc.Server();
  server.addService(TestService, testService);
  const bindAsync = promisify(server.bindAsync).bind(server);
  const serverCredentials = grpcUtils.serverSecureCredentials(
    keyPrivatePem,
    certChainPem,
  );
  const port = await bindAsync(`127.0.0.1:0`, serverCredentials);
  server.start();
  return [server, port];
}

async function closeTestServerSecure(server: grpc.Server): Promise<void> {
  const tryShutdown = promisify(server.tryShutdown).bind(server);
  await tryShutdown();
}

function closeTestServerSecureForce(server: grpc.Server): void {
  server.forceShutdown();
}

export {
  TestService,
  testService,
  GRPCClientTest,
  openTestServer,
  closeTestServer,
  closeTestServerForce,
  openTestClient,
  closeTestClient,
  openTestServerSecure,
  closeTestServerSecure,
  closeTestServerSecureForce,
  openTestClientSecure,
  closeTestClientSecure,
};
