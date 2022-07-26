import type { SessionToken } from '@/sessions/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { PolykeyClient, PolykeyAgent } from '@';
import { Session } from '@/sessions';
import config from '@/config';
import { globalRootKeyPems } from './fixtures/globalRootKeyPems';

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
      keysConfig: {
        privateKeyPemOverride: globalRootKeyPems[0],
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
  test('create PolykeyClient and connect to PolykeyAgent', async () => {
    const pkClient = await PolykeyClient.createPolykeyClient({
      nodeId: pkAgent.keyManager.getNodeId(),
      host: pkAgent.grpcServerClient.getHost(),
      port: pkAgent.grpcServerClient.getPort(),
      nodePath,
      fs,
      logger,
    });
    expect(pkClient.grpcClient.nodeId).toStrictEqual(
      pkAgent.keyManager.getNodeId(),
    );
    expect(pkClient.grpcClient.host).toBe(pkAgent.grpcServerClient.getHost());
    expect(pkClient.grpcClient.port).toBe(pkAgent.grpcServerClient.getPort());
    expect(pkClient.grpcClient.secured).toBe(true);
    await pkClient.stop();
  });
  test('preserving and destroying session state', async () => {
    const session = await Session.createSession({
      sessionTokenPath: path.join(nodePath, config.defaults.tokenBase),
      fs,
      logger,
    });
    await session.writeToken('dummy' as SessionToken);
    // Using fresh: true means that any token would be destroyed
    const pkClient = await PolykeyClient.createPolykeyClient({
      nodeId: pkAgent.keyManager.getNodeId(),
      host: pkAgent.grpcServerClient.getHost(),
      port: pkAgent.grpcServerClient.getPort(),
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
  });
});
