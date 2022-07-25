import type { IdentityData, IdentityId, ProviderId } from '@/identities/types';
import type { Host } from '@/network/types';
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

describe('search', () => {
  const logger = new Logger('search test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'helloworld';
  const identityId = 'test_user' as IdentityId;
  // Provider setup
  const provider1 = new TestProvider('provider1' as ProviderId);
  const provider2 = new TestProvider('provider2' as ProviderId);
  const provider3 = new TestProvider('provider3' as ProviderId);
  const user1 = {
    providerId: provider1.id,
    identityId: 'user1' as IdentityId,
    name: 'User1',
    email: 'user1@test.com',
    url: 'test.com/user1',
  };
  const user2 = {
    providerId: provider1.id,
    identityId: 'user2' as IdentityId,
    name: 'User2',
    email: 'user2@test.com',
    url: 'test.com/user2',
  };
  const user3 = {
    providerId: provider1.id,
    identityId: 'user3' as IdentityId,
    name: 'User3',
    email: 'user3@test.com',
    url: 'test.com/user3',
  };
  const user4 = {
    providerId: provider2.id,
    identityId: 'user1' as IdentityId,
    name: 'User4',
    email: 'user4@test.com',
    url: 'test.com/user4',
  };
  const user5 = {
    providerId: provider2.id,
    identityId: 'user2' as IdentityId,
    name: 'User5',
    email: 'user5@test.com',
    url: 'test.com/user5',
  };
  const user6 = {
    providerId: provider2.id,
    identityId: 'user3' as IdentityId,
    name: 'User6',
    email: 'user6@test.com',
    url: 'test.com/user6',
  };
  const user7 = {
    providerId: provider3.id,
    identityId: 'user1' as IdentityId,
    name: 'User7',
    email: 'user7@test.com',
    url: 'test.com/user7',
  };
  const user8 = {
    providerId: provider3.id,
    identityId: 'user2' as IdentityId,
    name: 'User8',
    email: 'user8@test.com',
    url: 'test.com/user8',
  };
  const user9 = {
    providerId: provider3.id,
    identityId: 'user3' as IdentityId,
    name: 'User9',
    email: 'user9@test.com',
    url: 'test.com/user9',
  };
  provider1.users['user1'] = user1;
  provider1.users['user2'] = user2;
  provider1.users['user3'] = user3;
  provider2.users['user1'] = user4;
  provider2.users['user2'] = user5;
  provider2.users['user3'] = user6;
  provider3.users['user1'] = user7;
  provider3.users['user2'] = user8;
  provider3.users['user3'] = user9;
  // Connect all identities to our own except for user9
  provider1.users[identityId].connected = [
    user1.identityId,
    user2.identityId,
    user3.identityId,
  ];
  provider2.users[identityId].connected = [
    user4.identityId,
    user5.identityId,
    user6.identityId,
  ];
  provider3.users[identityId].connected = [user7.identityId, user8.identityId];
  let dataDir: string;
  let nodePath: string;
  let pkAgent: PolykeyAgent;
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
    pkAgent.identitiesManager.registerProvider(provider1);
    pkAgent.identitiesManager.registerProvider(provider2);
    pkAgent.identitiesManager.registerProvider(provider3);
  });
  afterEach(async () => {
    await pkAgent.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  runTestIfPlatforms('linux')('finds connected identities', async () => {
    // Can't test with target executable due to mocking
    let exitCode, stdout;
    let searchResults: Array<IdentityData>;
    const mockedBrowser = jest
      .spyOn(identitiesUtils, 'browser')
      .mockImplementation(() => {});
    // Search with no authenticated identities
    // Should return nothing
    ({ exitCode, stdout } = await testBinUtils.pkStdioSwitch(global.testCmd)(
      ['identities', 'search', '--format', 'json'],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    ));
    expect(exitCode).toBe(0);
    expect(stdout).toBe('');
    // Authenticate an identity for provider1
    await testBinUtils.pkStdioSwitch(global.testCmd)(
      ['identities', 'authenticate', provider1.id, identityId],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    );
    // Now our search should include the identities from provider1
    ({ exitCode, stdout } = await testBinUtils.pkStdioSwitch(global.testCmd)(
      ['identities', 'search', '--format', 'json'],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    ));
    expect(exitCode).toBe(0);
    searchResults = stdout.split('\n').slice(undefined, -1).map(JSON.parse);
    expect(searchResults).toHaveLength(3);
    expect(searchResults).toContainEqual(user1);
    expect(searchResults).toContainEqual(user2);
    expect(searchResults).toContainEqual(user3);
    // Authenticate an identity for provider2
    await testBinUtils.pkStdioSwitch(global.testCmd)(
      ['identities', 'authenticate', provider2.id, identityId],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    );
    // Now our search should include the identities from provider1 and
    // provider2
    ({ exitCode, stdout } = await testBinUtils.pkStdioSwitch(global.testCmd)(
      ['identities', 'search', '--format', 'json'],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    ));
    expect(exitCode).toBe(0);
    searchResults = stdout.split('\n').slice(undefined, -1).map(JSON.parse);
    expect(searchResults).toHaveLength(6);
    expect(searchResults).toContainEqual(user1);
    expect(searchResults).toContainEqual(user2);
    expect(searchResults).toContainEqual(user3);
    expect(searchResults).toContainEqual(user4);
    expect(searchResults).toContainEqual(user5);
    expect(searchResults).toContainEqual(user6);
    // We can narrow this search by providing search terms
    ({ exitCode, stdout } = await testBinUtils.pkStdioSwitch(global.testCmd)(
      ['identities', 'search', '4', '5', '--format', 'json'],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    ));
    expect(exitCode).toBe(0);
    searchResults = stdout.split('\n').slice(undefined, -1).map(JSON.parse);
    expect(searchResults).toHaveLength(2);
    expect(searchResults).toContainEqual(user4);
    expect(searchResults).toContainEqual(user5);
    // Authenticate an identity for provider3
    await testBinUtils.pkStdioSwitch(global.testCmd)(
      ['identities', 'authenticate', provider3.id, identityId],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    );
    // We can get results from only some providers using the --provider-id
    // option
    ({ exitCode, stdout } = await testBinUtils.pkStdioSwitch(global.testCmd)(
      [
        'identities',
        'search',
        '--provider-id',
        provider2.id,
        provider3.id,
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
    searchResults = stdout.split('\n').slice(undefined, -1).map(JSON.parse);
    expect(searchResults).toHaveLength(5);
    expect(searchResults).toContainEqual(user4);
    expect(searchResults).toContainEqual(user5);
    expect(searchResults).toContainEqual(user6);
    expect(searchResults).toContainEqual(user7);
    expect(searchResults).toContainEqual(user8);
    ({ exitCode, stdout } = await testBinUtils.pkStdioSwitch(global.testCmd)(
      [
        'identities',
        'search',
        '--provider-id',
        provider2.id,
        '--provider-id',
        provider3.id,
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
    searchResults = stdout.split('\n').slice(undefined, -1).map(JSON.parse);
    expect(searchResults).toHaveLength(5);
    expect(searchResults).toContainEqual(user4);
    expect(searchResults).toContainEqual(user5);
    expect(searchResults).toContainEqual(user6);
    expect(searchResults).toContainEqual(user7);
    expect(searchResults).toContainEqual(user8);
    // We can search for a specific identity id across providers
    // This will find identities even if they're disconnected
    ({ exitCode, stdout } = await testBinUtils.pkStdioSwitch(global.testCmd)(
      ['identities', 'search', '--identity-id', 'user3', '--format', 'json'],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    ));
    expect(exitCode).toBe(0);
    searchResults = stdout.split('\n').slice(undefined, -1).map(JSON.parse);
    expect(searchResults).toHaveLength(3);
    expect(searchResults).toContainEqual(user3);
    expect(searchResults).toContainEqual(user6);
    expect(searchResults).toContainEqual(user9);
    // We can limit the number of search results to display
    ({ exitCode, stdout } = await testBinUtils.pkStdioSwitch(global.testCmd)(
      ['identities', 'search', '--limit', '2', '--format', 'json'],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    ));
    expect(exitCode).toBe(0);
    searchResults = stdout.split('\n').slice(undefined, -1).map(JSON.parse);
    expect(searchResults).toHaveLength(2);
    mockedBrowser.mockRestore();
  });
  runTestIfPlatforms('linux')('should fail on invalid inputs', async () => {
    let exitCode;
    // Invalid identity id
    ({ exitCode } = await testBinUtils.pkStdioSwitch(global.testCmd)(
      ['identities', 'search', '--identity-id', ''],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    ));
    expect(exitCode).toBe(sysexits.USAGE);
    // Invalid auth identity id
    ({ exitCode } = await testBinUtils.pkStdioSwitch(global.testCmd)(
      ['identities', 'search', '--auth-identity-id', ''],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    ));
    expect(exitCode).toBe(sysexits.USAGE);
    // Invalid value for limit
    ({ exitCode } = await testBinUtils.pkStdioSwitch(global.testCmd)(
      ['identities', 'search', '--limit', 'NaN'],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    ));
    expect(exitCode).toBe(sysexits.USAGE);
  });
});
