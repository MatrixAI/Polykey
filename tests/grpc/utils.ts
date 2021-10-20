import type { NodeId } from '@/nodes/types';
import type { TLSConfig } from '@/network/types';
import type { Host, Port, ProxyConfig } from '@/network/types';

import Logger from '@matrixai/logger';
import * as grpc from '@grpc/grpc-js';
import { GRPCClient, utils as grpcUtils, errors as grpcErrors } from '@/grpc';
import { promisify } from '@/utils';
import {
  TestServiceService,
  ITestServiceServer,
  TestServiceClient,
} from '@/proto/js/polykey/v1/test_service_grpc_pb';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';

/**
 * Test GRPC service
 */
const testService: ITestServiceServer = {
  unary: async (
    call: grpc.ServerUnaryCall<utilsPB.EchoMessage, utilsPB.EchoMessage>,
    callback: grpc.sendUnaryData<utilsPB.EchoMessage>,
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
      const message = new utilsPB.EchoMessage();
      message.setChallenge(challenge);
      callback(null, message);
    }
  },
  serverStream: async (
    call: grpc.ServerWritableStream<utilsPB.EchoMessage, utilsPB.EchoMessage>,
  ): Promise<void> => {
    const genWritable = grpcUtils.generatorWritable(call);
    const messageFrom = call.request;
    const messageTo = new utilsPB.EchoMessage();
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
    call: grpc.ServerReadableStream<utilsPB.EchoMessage, utilsPB.EchoMessage>,
    callback: grpc.sendUnaryData<utilsPB.EchoMessage>,
  ): Promise<void> => {
    const genReadable = grpcUtils.generatorReadable<utilsPB.EchoMessage>(call);
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
      const outgoingMessage = new utilsPB.EchoMessage();
      outgoingMessage.setChallenge(incomingMessage.getChallenge());
      // Write 2 messages
      await genDuplex.write(outgoingMessage);
      await genDuplex.write(outgoingMessage);
      // End and destroy
      await genDuplex.next(null);
    }
  },
};

class GRPCClientTest extends GRPCClient<TestServiceClient> {
  constructor({
    nodeId,
    host,
    port,
    proxyConfig,
    logger,
  }: {
    nodeId: NodeId;
    host: Host;
    port: Port;
    proxyConfig?: ProxyConfig;
    logger: Logger;
  }) {
    super({
      nodeId,
      host,
      port,
      proxyConfig,
      logger,
    });
  }

  public async start({
    tlsConfig,
    timeout = Infinity,
  }: {
    tlsConfig?: TLSConfig;
    timeout?: number;
  } = {}): Promise<void> {
    await super.start({
      clientConstructor: TestServiceClient,
      tlsConfig,
      timeout,
    });
  }

  public unary(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EchoMessage>(
      this.client,
      this.client.unary,
    )(...args);
  }

  public serverStream(...args) {
    return grpcUtils.promisifyReadableStreamCall<utilsPB.EchoMessage>(
      this.client,
      this.client.serverStream,
    )(...args);
  }

  public clientStream(...args) {
    return grpcUtils.promisifyWritableStreamCall<
      utilsPB.EchoMessage,
      utilsPB.EchoMessage
    >(
      this.client,
      this.client.clientStream,
    )(...args);
  }

  public duplexStream(...args) {
    return grpcUtils.promisifyDuplexStreamCall<
      utilsPB.EchoMessage,
      utilsPB.EchoMessage
    >(
      this.client,
      this.client.duplexStream,
    )(...args);
  }
}

async function openTestServer(): Promise<[grpc.Server, number]> {
  const server = new grpc.Server();
  server.addService(TestServiceService, testService);
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

async function openTestClient(port: number): Promise<TestServiceClient> {
  const client = new TestServiceClient(
    `127.0.0.1:${port}`,
    grpcUtils.clientInsecureCredentials(),
  );
  const waitForReady = promisify(client.waitForReady).bind(client);
  await waitForReady(Infinity);
  return client;
}

function closeTestClient(client: TestServiceClient): void {
  client.close();
}

async function openTestClientSecure(
  nodeId: NodeId,
  port: number,
  keyPrivatePem,
  certChainPem,
): Promise<TestServiceClient> {
  const clientOptions = {
    // Prevents complaints with having an ip address as the server name
    'grpc.ssl_target_name_override': nodeId,
  };
  const clientCredentials = grpcUtils.clientSecureCredentials(
    keyPrivatePem,
    certChainPem,
  );
  const client = new TestServiceClient(
    `127.0.0.1:${port}`,
    clientCredentials,
    clientOptions,
  );
  const waitForReady = promisify(client.waitForReady).bind(client);
  await waitForReady(Infinity);
  return client;
}

function closeTestClientSecure(client: TestServiceClient) {
  client.close();
}

async function openTestServerSecure(
  keyPrivatePem,
  certChainPem,
): Promise<[grpc.Server, number]> {
  const server = new grpc.Server();
  server.addService(TestServiceService, testService);
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
  TestServiceService,
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
