import type { Host } from '@/network/types';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyAgent from '@/PolykeyAgent';
import * as keysUtils from '@/keys/utils';
import * as testUtils from '../../utils';
import * as testBinUtils from '../utils';
import { runTestIfPlatforms } from '../../utils';

describe('reset', () => {
  const logger = new Logger('reset test', LogLevel.WARN, [new StreamHandler()]);
  const password = 'helloworld';
  let dataDir: string;
  let nodePath: string;
  let pkAgent: PolykeyAgent;
  let mockedGenerateKeyPair: jest.SpyInstance;
  let mockedGenerateDeterministicKeyPair: jest.SpyInstance;
  beforeAll(async () => {
    const globalKeyPair = await testUtils.setupGlobalKeypair();
    const newKeyPair = await keysUtils.generateKeyPair(1024);
    mockedGenerateKeyPair = jest
      .spyOn(keysUtils, 'generateKeyPair')
      .mockResolvedValueOnce(globalKeyPair)
      .mockResolvedValue(newKeyPair);
    mockedGenerateDeterministicKeyPair = jest
      .spyOn(keysUtils, 'generateDeterministicKeyPair')
      .mockResolvedValueOnce(globalKeyPair)
      .mockResolvedValue(newKeyPair);
    dataDir = await fs.promises.mkdtemp(
      path.join(global.tmpDir, 'polykey-test-'),
    );
    nodePath = path.join(dataDir, 'polykey');
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
  }, global.defaultTimeout * 2);
  afterAll(async () => {
    await pkAgent.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
    mockedGenerateKeyPair.mockRestore();
    mockedGenerateDeterministicKeyPair.mockRestore();
  });
  runTestIfPlatforms()('resets the keypair', async () => {
    // Can't test with target executable due to mocking
    // Get previous keypair and nodeId
    let { exitCode, stdout } = await testBinUtils.pkStdio(
      ['keys', 'root', '--private-key', '--format', 'json'],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    );
    expect(exitCode).toBe(0);
    const prevPublicKey = JSON.parse(stdout).publicKey;
    const prevPrivateKey = JSON.parse(stdout).privateKey;
    ({ exitCode, stdout } = await testBinUtils.pkStdio(
      ['agent', 'status', '--format', 'json'],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    ));
    expect(exitCode).toBe(0);
    const prevNodeId = JSON.parse(stdout).nodeId;
    // Reset keypair
    const passPath = path.join(dataDir, 'reset-password');
    await fs.promises.writeFile(passPath, 'password-new');
    ({ exitCode } = await testBinUtils.pkStdio(
      ['keys', 'reset', '--password-new-file', passPath],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    ));
    expect(exitCode).toBe(0);
    // Get new keypair and nodeId and compare against old
    ({ exitCode, stdout } = await testBinUtils.pkStdio(
      ['keys', 'root', '--private-key', '--format', 'json'],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: 'password-new',
      },
      dataDir,
    ));
    expect(exitCode).toBe(0);
    const newPublicKey = JSON.parse(stdout).publicKey;
    const newPrivateKey = JSON.parse(stdout).privateKey;
    ({ exitCode, stdout } = await testBinUtils.pkStdio(
      ['agent', 'status', '--format', 'json'],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: 'password-new',
      },
      dataDir,
    ));
    expect(exitCode).toBe(0);
    const newNodeId = JSON.parse(stdout).nodeId;
    expect(newPublicKey).not.toBe(prevPublicKey);
    expect(newPrivateKey).not.toBe(prevPrivateKey);
    expect(newNodeId).not.toBe(prevNodeId);
    // Revert side effects
    await fs.promises.writeFile(passPath, password);
    ({ exitCode } = await testBinUtils.pkStdio(
      ['keys', 'password', '--password-new-file', passPath],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: 'password-new',
      },
      dataDir,
    ));
    expect(exitCode).toBe(0);
  });
});
