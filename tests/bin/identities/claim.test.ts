import type {
  IdentityClaimId,
  IdentityId,
  ProviderId,
} from '@/identities/types';
import type { Host } from '@/network/types';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyAgent from '@/PolykeyAgent';
import { sysexits } from '@/utils';
import * as identitiesUtils from '@/identities/utils';
import * as execUtils from '../../utils/exec';
import TestProvider from '../../identities/TestProvider';
import { globalRootKeyPems } from '../../fixtures/globalRootKeyPems';
import { runTestIfPlatforms } from '../../utils';

describe('claim', () => {
  const logger = new Logger('claim test', LogLevel.WARN, [new StreamHandler()]);
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
      path.join(global.tmpDir, 'polykey-test-'),
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
  runTestIfPlatforms()('claims an identity', async () => {
    // Need an authenticated identity
    const mockedBrowser = jest
      .spyOn(identitiesUtils, 'browser')
      .mockImplementation(() => {});
    await execUtils.pkStdio(
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
    );
    // Claim identity
    const { exitCode, stdout } = await execUtils.pkStdio(
      [
        'identities',
        'claim',
        testToken.providerId,
        testToken.identityId,
        '--format',
        'json',
      ],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    );
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toEqual(['Claim Id: 0', 'Url: test.com']);
    // Check for claim on the provider
    const claim = await testProvider.getClaim(
      testToken.identityId,
      '0' as IdentityClaimId,
    );
    expect(claim).toBeDefined();
    expect(claim!.id).toBe('0');
    expect(claim!.payload.data.type).toBe('identity');
    mockedBrowser.mockRestore();
  });
  runTestIfPlatforms()('cannot claim unauthenticated identities', async () => {
    const { exitCode } = await execUtils.pkStdio(
      ['identities', 'claim', testToken.providerId, testToken.identityId],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    );
    expect(exitCode).toBe(sysexits.NOPERM);
  });
  runTestIfPlatforms()('should fail on invalid inputs', async () => {
    let exitCode;
    // Invalid provider
    ({ exitCode } = await execUtils.pkStdio(
      ['identities', 'claim', '', testToken.identityId],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    ));
    expect(exitCode).toBe(sysexits.USAGE);
    // Invalid identity
    ({ exitCode } = await execUtils.pkStdio(
      ['identities', 'claim', testToken.providerId, ''],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    ));
    expect(exitCode).toBe(sysexits.USAGE);
  });
});
