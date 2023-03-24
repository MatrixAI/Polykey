import type { SessionToken } from '@/sessions/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { PolykeyClient, PolykeyAgent } from '@';
import { Session } from '@/sessions';
import config from '@/config';
import * as keysUtils from '@/keys/utils/index';
import WebSocketClient from '@/websockets/WebSocketClient';

describe('PolykeyClient', () => {
  const password = 'password';
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
      nodePath,
      logger,
      keyRingConfig: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
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
      sessionTokenPath: path.join(nodePath, config.defaults.tokenBase),
      fs,
      logger,
    });
    await session.writeToken('dummy' as SessionToken);
    // Using fresh: true means that any token would be destroyed
    const webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [pkAgent.keyRing.getNodeId()],
      host: pkAgent.webSocketServerClient.getHost(),
      port: pkAgent.webSocketServerClient.getPort(),
      logger,
    });
    const pkClient = await PolykeyClient.createPolykeyClient({
      streamFactory: () => webSocketClient.startConnection(),
      nodePath,
      fs,
      logger,
      fresh: true,
      manifest: {},
    });
    expect(await session.readToken()).toBeUndefined();
    await session.writeToken('abc' as SessionToken);
    await pkClient.stop();
    expect(await session.readToken()).toBeDefined();
    await pkClient.destroy();
    expect(await session.readToken()).toBeUndefined();
    await webSocketClient.destroy(true);
  });
});
