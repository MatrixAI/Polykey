import type { TLSConfig } from '@/network/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as keysUtils from '@/keys/utils';
import { Status } from '@/status';
import { PolykeyAgent } from '@';
import config from '@/config';
import * as testUtils from '../../utils';
import * as testBinUtils from '../utils';

describe('renew', () => {
  const logger = new Logger('renew test', LogLevel.WARN, [new StreamHandler()]);
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
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    nodePath = path.join(dataDir, 'polykey');
    pkAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath,
      logger,
    });
  }, globalThis.maxTimeout);
  afterAll(async () => {
    await pkAgent.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
    mockedGenerateKeyPair.mockRestore();
    mockedGenerateDeterministicKeyPair.mockRestore();
  });
  test('resets the keypair', async () => {
    const rootKeyPair1 = pkAgent.keyManager.getRootKeyPairPem();
    const nodeId1 = pkAgent.keyManager.getNodeId();
    // @ts-ignore - get protected property
    const fwdTLSConfig1 = pkAgent.fwdProxy.tlsConfig;
    // @ts-ignore - get protected property
    const revTLSConfig1 = pkAgent.revProxy.tlsConfig;
    // @ts-ignore - get protected property
    const serverTLSConfig1 = pkAgent.grpcServerClient.tlsConfig;
    const expectedTLSConfig1: TLSConfig = {
      keyPrivatePem: rootKeyPair1.privateKey,
      certChainPem: await pkAgent.keyManager.getRootCertChainPem(),
    };
    const status = new Status({
      statusPath: path.join(nodePath, config.defaults.statusBase),
      statusLockPath: path.join(nodePath, config.defaults.statusLockBase),
      fs,
      logger,
    });
    const nodeIdStatus1 = (await status.readStatus())!.data.nodeId;
    expect(fwdTLSConfig1).toEqual(expectedTLSConfig1);
    expect(revTLSConfig1).toEqual(expectedTLSConfig1);
    expect(serverTLSConfig1).toEqual(expectedTLSConfig1);
    expect(nodeId1.equals(nodeIdStatus1)).toBe(true);
    // Renew keypair
    const passPath = path.join(dataDir, 'passwordNew');
    await fs.promises.writeFile(passPath, 'password-new');
    let { exitCode } = await testBinUtils.pkStdio(
      ['keys', 'reset', '-pnf', passPath],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    );
    expect(exitCode).toBe(0);
    const rootKeyPair2 = pkAgent.keyManager.getRootKeyPairPem();
    const nodeId2 = pkAgent.keyManager.getNodeId();
    // @ts-ignore - get protected property
    const fwdTLSConfig2 = pkAgent.fwdProxy.tlsConfig;
    // @ts-ignore - get protected property
    const revTLSConfig2 = pkAgent.revProxy.tlsConfig;
    // @ts-ignore - get protected property
    const serverTLSConfig2 = pkAgent.grpcServerClient.tlsConfig;
    const expectedTLSConfig2: TLSConfig = {
      keyPrivatePem: rootKeyPair2.privateKey,
      certChainPem: await pkAgent.keyManager.getRootCertChainPem(),
    };
    const nodeIdStatus2 = (await status.readStatus())!.data.nodeId;
    expect(fwdTLSConfig2).toEqual(expectedTLSConfig2);
    expect(revTLSConfig2).toEqual(expectedTLSConfig2);
    expect(serverTLSConfig2).toEqual(expectedTLSConfig2);
    expect(rootKeyPair2.privateKey).not.toBe(rootKeyPair1.privateKey);
    expect(rootKeyPair2.publicKey).not.toBe(rootKeyPair1.publicKey);
    expect(nodeId1).not.toBe(nodeId2);
    expect(nodeIdStatus1).not.toBe(nodeIdStatus2);
    expect(nodeId2.equals(nodeIdStatus2)).toBe(true);
    // Revert side effects
    await fs.promises.writeFile(passPath, password);
    ({ exitCode } = await testBinUtils.pkStdio(
      ['keys', 'password', '-pnf', passPath],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: 'password-new',
      },
      dataDir,
    ));
    expect(exitCode).toBe(0);
  });
});
