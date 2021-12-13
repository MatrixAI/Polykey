import type * as grpc from '@grpc/grpc-js';
import type { ClientServiceClient } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { PolykeyAgent } from '@';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import { KeyManager } from '@/keys';
import { ForwardProxy } from '@/network';
import * as grpcUtils from '@/grpc/utils';
import * as clientUtils from '@/client/utils';
import * as testUtils from './utils';

// Mocks.
jest.mock('@/keys/utils', () => ({
  ...jest.requireActual('@/keys/utils'),
  generateDeterministicKeyPair:
    jest.requireActual('@/keys/utils').generateKeyPair,
}));

describe('Sessions client service', () => {
  const password = 'password';
  const logger = new Logger('SessionsClientServerTest', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let client: ClientServiceClient;
  let server: grpc.Server;
  let port: number;
  let dataDir: string;
  let polykeyAgent: PolykeyAgent;
  let keyManager: KeyManager;
  let passwordFile: string;
  let callCredentials: grpc.Metadata;

  beforeAll(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );

    passwordFile = path.join(dataDir, 'password');
    await fs.promises.writeFile(passwordFile, 'password');
    const keysPath = path.join(dataDir, 'keys');

    keyManager = await KeyManager.createKeyManager({
      keysPath,
      password,
      logger,
    });

    const fwdProxy = new ForwardProxy({
      authToken: 'abc',
      logger: logger,
    });

    polykeyAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: dataDir,
      logger,
      fwdProxy,
      keyManager,
    });

    [server, port] = await testUtils.openTestClientServer({
      polykeyAgent,
      secure: false,
    });

    client = await testUtils.openSimpleClientClient(port);
  }, global.polykeyStartupTimeout);
  afterAll(async () => {
    await testUtils.closeTestClientServer(server);
    testUtils.closeSimpleClientClient(client);

    await polykeyAgent.stop();
    await polykeyAgent.destroy();

    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
    await fs.promises.rm(passwordFile);
  });
  beforeEach(async () => {
    const sessionToken = await polykeyAgent.sessionManager.createToken();
    callCredentials = testUtils.createCallCredentials(sessionToken);
  });
  test('can request a session', async () => {
    const unlock = grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      client,
      client.sessionsUnlock,
    );

    const pCall = unlock(new utilsPB.EmptyMessage(), callCredentials);
    const meta = await pCall.meta;
    const token = clientUtils.decodeAuthToSession(meta);
    const result = await polykeyAgent.sessionManager.verifyToken(token!);
    expect(result).toBeTruthy();
  });
  test('can lock all sessions', async () => {
    const lockall = grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      client,
      client.sessionsLockAll,
    );

    await lockall(new utilsPB.EmptyMessage(), callCredentials);
    const prevToken = clientUtils.decodeAuthToSession(callCredentials);
    const result = await polykeyAgent.sessionManager.verifyToken(prevToken!);
    expect(result).toBeFalsy();
  });
});
