import type Logger from '@matrixai/logger';
import type { Authenticate } from '@/client/types';
import type { NodeId } from '@/nodes/types';
import * as grpc from '@grpc/grpc-js';
import { utils as grpcUtils } from '@/grpc';
import { promisify } from '@/utils';
import {
  TestServiceService,
  TestServiceClient,
} from '@/proto/js/polykey/v1/test_service_grpc_pb';
import createTestService from './testService';

async function openTestServer(
  authenticate: Authenticate,
  logger?: Logger,
): Promise<[grpc.Server, number]> {
  const testService = createTestService({ authenticate, logger });
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
  authenticate: Authenticate,
  logger?: Logger,
): Promise<[grpc.Server, number]> {
  const testService = createTestService({ authenticate, logger });
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
  createTestService,
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
