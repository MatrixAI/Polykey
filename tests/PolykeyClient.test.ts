import type { SessionToken } from '@/sessions/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { WebSocketClient } from '@matrixai/ws';
import { PolykeyClient, PolykeyAgent } from '@';
import { Session } from '@/sessions';
import config from '@/config';
import * as keysUtils from '@/keys/utils/index';
import * as clientUtils from '@/client/utils';
import * as errors from '@/errors';
import * as testUtils from './utils/utils';

describe('PolykeyClient', () => {
  const password = 'password';
  const localhost = '127.0.0.1';
  const logger = new Logger('PolykeyClient Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  let nodePath: string;
  let pkAgent: PolykeyAgent;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    nodePath = path.join(dataDir, 'polykey');
    pkAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      options: {
        nodePath,
        agentServiceHost: localhost,
        clientServiceHost: localhost,
        keys: {
          passwordOpsLimit: keysUtils.passwordOpsLimits.min,
          passwordMemLimit: keysUtils.passwordMemLimits.min,
          strictMemoryLock: false,
        },
      },
      logger,
    });
  });
  afterEach(async () => {
    await pkAgent.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('preserving and destroying session state', async () => {
    const session = await Session.createSession({
      sessionTokenPath: path.join(nodePath, config.paths.tokenBase),
      fs,
      logger,
    });
    await session.writeToken('dummy' as SessionToken);
    // Using fresh: true means that any token would be destroyed
    const webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: pkAgent.clientServiceHost,
      port: pkAgent.clientServicePort,
      logger,
    });
    const pkClient = await PolykeyClient.createPolykeyClient({
      streamFactory: () => webSocketClient.connection.newStream(),
      nodePath,
      fs,
      logger,
      fresh: true,
    });
    expect(await session.readToken()).toBeUndefined();
    await session.writeToken('abc' as SessionToken);
    await pkClient.stop();
    expect(await session.readToken()).toBeDefined();
    await pkClient.destroy();
    expect(await session.readToken()).toBeUndefined();
    await webSocketClient.destroy({ force: true });
  });
  test('end to end with authentication logic', async () => {
    const webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: true,
        verifyCallback: async (certs) => {
          await clientUtils.verifyServerCertificateChain(
            [pkAgent.keyRing.getNodeId()],
            certs,
          );
        },
      },
      host: pkAgent.clientServiceHost,
      port: pkAgent.clientServicePort,
      logger: logger.getChild(WebSocketClient.name),
    });
    const pkClient = await PolykeyClient.createPolykeyClient({
      streamFactory: () => webSocketClient.connection.newStream(),
      nodePath,
      fs,
      logger: logger.getChild(PolykeyClient.name),
      fresh: true,
    });

    const callP = pkClient.rpcClientClient.methods.agentStatus({});
    await expect(callP).rejects.toThrow(errors.ErrorPolykeyRemote);
    await testUtils.expectRemoteError(callP, errors.ErrorClientAuthMissing);
    // Correct auth runs without error
    await pkClient.rpcClientClient.methods.agentStatus({
      metadata: {
        authorization: clientUtils.encodeAuthFromPassword(password),
      },
    });
  });
});
