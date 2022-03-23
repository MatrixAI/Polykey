import type { IdentityId, ProviderId } from '@/identities/types';
import type { Host } from '@/network/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyAgent from '@/PolykeyAgent';
import { sysexits } from '@/utils';
import * as identitiesUtils from '@/identities/utils';
import * as keysUtils from '@/keys/utils';
import * as testBinUtils from '../utils';
import * as testUtils from '../../utils';
import TestProvider from '../../identities/TestProvider';

describe('authenticate/authenticated', () => {
  const logger = new Logger('authenticate/authenticated test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'helloworld';
  const testToken = {
    providerId: 'test-provider' as ProviderId,
    identityId: 'test_user' as IdentityId,
  };
  let dataDir: string;
  let nodePath: string;
  let pkAgent: PolykeyAgent;
  let testProvider: TestProvider;
  let mockedGenerateKeyPair: jest.SpyInstance;
  let mockedGenerateDeterministicKeyPair: jest.SpyInstance;
  beforeAll(async () => {
    const globalKeyPair = await testUtils.setupGlobalKeypair();
    mockedGenerateKeyPair = jest
      .spyOn(keysUtils, 'generateKeyPair')
      .mockResolvedValue(globalKeyPair);
    mockedGenerateDeterministicKeyPair = jest
      .spyOn(keysUtils, 'generateDeterministicKeyPair')
      .mockResolvedValue(globalKeyPair);
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    nodePath = path.join(dataDir, 'polykey');
    // Cannot use global shared agent since we need to register a provider
    pkAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath,
      networkConfig: {
        proxyHost: '127.0.0.1' as Host,
        forwardHost: '127.0.0.1' as Host,
        agentHost: '127.0.0.1' as Host,
        clientHost: '127.0.0.1' as Host,
      },
      logger,
    });
    testProvider = new TestProvider();
    pkAgent.identitiesManager.registerProvider(testProvider);
  });
  afterAll(async () => {
    await pkAgent.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
    mockedGenerateKeyPair.mockRestore();
    mockedGenerateDeterministicKeyPair.mockRestore();
  });
  test('authenticates identity with a provider and gets authenticated identity', async () => {
    let exitCode, stdout;
    const mockedBrowser = jest
      .spyOn(identitiesUtils, 'browser')
      .mockImplementation(() => {});
    // Authenticate an identity
    ({ exitCode, stdout } = await testBinUtils.pkStdio(
      [
        'identities',
        'authenticate',
        testToken.providerId,
        testToken.identityId,
      ],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    ));
    expect(exitCode).toBe(0);
    expect(stdout).toContain('randomtestcode');
    // Check that the identity was authenticated
    ({ exitCode, stdout } = await testBinUtils.pkStdio(
      ['identities', 'authenticated', '--format', 'json'],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    ));
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toEqual({
      providerId: testToken.providerId,
      identityId: testToken.identityId,
    });
    // Check using providerId flag
    ({ exitCode, stdout } = await testBinUtils.pkStdio(
      [
        'identities',
        'authenticated',
        '--provider-id',
        testToken.providerId,
        '--format',
        'json',
      ],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    ));
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toEqual({
      providerId: testToken.providerId,
      identityId: testToken.identityId,
    });
    // Revert side effects
    await pkAgent.identitiesManager.delToken(
      testToken.providerId,
      testToken.identityId,
    );
    mockedBrowser.mockRestore();
  });
  test('should fail on invalid inputs', async () => {
    let exitCode;
    // Authenticate
    // Invalid provider
    ({ exitCode } = await testBinUtils.pkStdio(
      ['identities', 'authenticate', '', testToken.identityId],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    ));
    expect(exitCode).toBe(sysexits.USAGE);
    // Invalid identity
    ({ exitCode } = await testBinUtils.pkStdio(
      ['identities', 'authenticate', testToken.providerId, ''],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    ));
    expect(exitCode).toBe(sysexits.USAGE);
    // Authenticated
    // Invalid provider
    ({ exitCode } = await testBinUtils.pkStdio(
      ['identities', 'authenticate', '--provider-id', ''],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    ));
    expect(exitCode).toBe(sysexits.USAGE);
  });
});
