import type * as grpc from '@grpc/grpc-js';
import type { SessionToken } from '@/sessions/types';
import type { ClientServiceClient } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { PolykeyAgent } from '@';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as sessionsPB from '@/proto/js/polykey/v1/sessions/sessions_pb';
import { KeyManager } from '@/keys';
import { ForwardProxy } from '@/network';
import * as grpcUtils from '@/grpc/utils';
import { sleep } from '@/utils';
import * as errors from '@/errors';
import * as testUtils from './utils';

// Mocks.
jest.mock('@/keys/utils', () => ({
  ...jest.requireActual('@/keys/utils'),
  generateDeterministicKeyPair:
    jest.requireActual('@/keys/utils').generateKeyPair,
}));

/**
 * This test file has been optimised to use only one instance of PolykeyAgent where posible.
 * Setting up the PolykeyAgent has been done in a beforeAll block.
 * Keep this in mind when adding or editing tests.
 * Any side effects need to be undone when the test has completed.
 * Preferably within a `afterEach()` since any cleanup will be skipped inside a failing test.
 *
 * - left over state can cause a test to fail in certain cases.
 * - left over state can cause similar tests to succeed when they should fail.
 * - starting or stopping the agent within tests should be done on a new instance of the polykey agent.
 * - when in doubt test each modified or added test on it's own as well as the whole file.
 * - Looking into adding a way to safely clear each domain's DB information with out breaking modules.
 */
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
    const requestJWT = grpcUtils.promisifyUnaryCall<sessionsPB.Token>(
      client,
      client.sessionsUnlock,
    );

    const passwordMessage = new sessionsPB.Password();
    passwordMessage.setPassword(passwordFile);

    const res = await requestJWT(passwordMessage);
    expect(typeof res.getToken()).toBe('string');
    const result = await polykeyAgent.sessionManager.verifyToken(
      res.getToken() as SessionToken,
    );
    expect(result).toBeTruthy();
  });
  test('can refresh session', async () => {
    const requestJWT = grpcUtils.promisifyUnaryCall<sessionsPB.Token>(
      client,
      client.sessionsUnlock,
    );

    const passwordMessage = new sessionsPB.Password();
    passwordMessage.setPassword(passwordFile);

    const res1 = await requestJWT(passwordMessage);
    const token1 = res1.getToken() as SessionToken;
    const callCredentialsRefresh = testUtils.createCallCredentials(token1);

    const sessionRefresh = grpcUtils.promisifyUnaryCall<sessionsPB.Token>(
      client,
      client.sessionsRefresh,
    );

    await sleep(1100);
    const emptyMessage = new utilsPB.EmptyMessage();
    const res2 = await sessionRefresh(emptyMessage, callCredentialsRefresh);
    expect(typeof res2.getToken()).toBe('string');
    const token2 = res2.getToken() as SessionToken;
    const result = await polykeyAgent.sessionManager.verifyToken(token2);
    expect(result).toBeTruthy();
    expect(token1).not.toEqual(token2);
  });
  test('actions over GRPC refresh the session', async () => {
    // Since we refresh the token when metadata is sent, check that
    // metadata is sent and that we can do something when it happens
    const agentStatus = grpcUtils.promisifyUnaryCall<utilsPB.EchoMessage>(
      client,
      client.agentStatus,
    );
    const emptyMessage = new utilsPB.EmptyMessage();
    const res = agentStatus(emptyMessage, callCredentials);
    let check = 0;
    res.call.on('metadata', () => (check = 1));
    await res;
    expect(check).toEqual(1);
  });
  test('session can lock all', async () => {
    const agentStatus = grpcUtils.promisifyUnaryCall<utilsPB.EchoMessage>(
      client,
      client.agentStatus,
    );

    // Locking the session.
    const sessionLockAll = grpcUtils.promisifyUnaryCall<utilsPB.EchoMessage>(
      client,
      client.sessionsLockAll,
    );

    const emptyMessage = new utilsPB.EmptyMessage();
    await sessionLockAll(emptyMessage, callCredentials);
    // Should reject the session token.
    await expect(() => agentStatus(emptyMessage)).rejects.toThrow(
      errors.ErrorClientAuthMissing,
    );
  });
});
