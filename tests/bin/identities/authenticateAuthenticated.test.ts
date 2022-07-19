import type { IdentityId, ProviderId } from '@/identities/types';
import type { Host } from '@/network/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyAgent from '@/PolykeyAgent';
import { sysexits } from '@/utils';
import * as identitiesUtils from '@/identities/utils';
import * as testBinUtils from '../utils';
import TestProvider from '../../identities/TestProvider';
import { globalRootKeyPems } from '../../globalRootKeyPems';
import { runTestIfPlatforms } from '../../utils';

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
  beforeEach(async () => {
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
      keysConfig: {
        privateKeyPemOverride: globalRootKeyPems[0],
      },
      logger,
    });
    testProvider = new TestProvider();
    pkAgent.identitiesManager.registerProvider(testProvider);
  });
  afterEach(async () => {
    await pkAgent.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  runTestIfPlatforms('linux', 'docker')(
    'authenticates identity with a provider and gets authenticated identity',
    async () => {
      let exitCode, stdout;
      const mockedBrowser = jest
        .spyOn(identitiesUtils, 'browser')
        .mockImplementation(() => {});
      // Authenticate an identity
      ({ exitCode, stdout } = await testBinUtils.pkStdioSwitch(global.testCmd)(
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
      ({ exitCode, stdout } = await testBinUtils.pkStdioSwitch(global.testCmd)(
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
      ({ exitCode, stdout } = await testBinUtils.pkStdioSwitch(global.testCmd)(
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
      mockedBrowser.mockRestore();
    },
  );
  runTestIfPlatforms('linux', 'docker')(
    'should fail on invalid inputs',
    async () => {
      let exitCode;
      // Authenticate
      // Invalid provider
      ({ exitCode } = await testBinUtils.pkStdioSwitch(global.testCmd)(
        ['identities', 'authenticate', '', testToken.identityId],
        {
          PK_NODE_PATH: nodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      ));
      expect(exitCode).toBe(sysexits.USAGE);
      // Invalid identity
      ({ exitCode } = await testBinUtils.pkStdioSwitch(global.testCmd)(
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
      ({ exitCode } = await testBinUtils.pkStdioSwitch(global.testCmd)(
        ['identities', 'authenticate', '--provider-id', ''],
        {
          PK_NODE_PATH: nodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      ));
      expect(exitCode).toBe(sysexits.USAGE);
    },
  );
});
