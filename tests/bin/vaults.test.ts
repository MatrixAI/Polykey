import os from 'os';
import path from 'path';
import fs from 'fs';
import { pk } from './utils';
import { PolykeyAgent } from '../../src';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { NodeAddress } from '@/nodes/types';
import main from '@/bin/polykey';
import { sleep } from '@/utils';

const logger = new Logger('CLI Test', LogLevel.WARN, [new StreamHandler()]);
let dataDir: string;
let passwordFile: string;
let polykeyAgent: PolykeyAgent;

describe('polykey', () => {
  test('default help display', async () => {
    expect(await main(['', ''])).toBe(0);
  });
});

describe('CLI vaults', () => {
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    passwordFile = path.join(dataDir, 'passwordFile');
    await fs.promises.writeFile(passwordFile, 'password');
    polykeyAgent = new PolykeyAgent({
      nodePath: dataDir,
      logger: logger,
    });
    await polykeyAgent.start({
      password: 'password',
      sessionDuration: 1000,
    });
  });

  afterEach(async () => {
    await polykeyAgent.stop();
    await fs.promises.rmdir(dataDir, { recursive: true });
  });

  test('should not function if the password is not provided and the session not started', async () => {
    const result = await pk([
      'vaults',
      'create',
      '-np',
      dataDir,
      '-vn',
      'MyTestVault',
      '--password-file',
      passwordFile,
    ]);
    expect(result).toBe(0);
    await polykeyAgent.sessionManager.stopSession();
    const result2 = await pk([
      'vaults',
      'touch',
      '-np',
      dataDir,
      '-vn',
      'MyTestVault2',
    ]);
    expect(result2).toBe(0);
    const vaults = polykeyAgent.vaults.listVaults().sort();
    expect(vaults.length).toBe(1);
    expect(vaults[0].name).toBe('MyTestVault');
  });
  test('should list vaults', async () => {
    await polykeyAgent.vaults.createVault('Vault1');
    await polykeyAgent.vaults.createVault('Vault2');

    const result = await pk([
      'vaults',
      'list',
      '-np',
      dataDir,
      '--password-file',
      passwordFile,
    ]);
    expect(result).toBe(0);
  });
  test('should create vaults', async () => {
    const result = await pk([
      'vaults',
      'create',
      '-np',
      dataDir,
      '-vn',
      'MyTestVault',
      '--password-file',
      passwordFile,
    ]);
    expect(result).toBe(0);
    const result2 = await pk([
      'vaults',
      'touch',
      '-np',
      dataDir,
      '-vn',
      'MyTestVault2',
    ]);
    expect(result2).toBe(0);
    const vaults = polykeyAgent.vaults.listVaults().sort();
    expect(vaults[0].name).toBe('MyTestVault');
    expect(vaults[1].name).toBe('MyTestVault2');
  });
  test('should rename vault', async () => {
    await polykeyAgent.vaults.createVault('Vault1');
    const ids = polykeyAgent.vaults.getVaultIds('Vault1');
    expect(ids.length).toBe(1);

    const result = await pk([
      'vaults',
      'rename',
      '-vn',
      'Vault1',
      '-nn',
      'RenamedVault',
      '-np',
      dataDir,
      '--password-file',
      passwordFile,
    ]);
    expect(result).toBe(0);
    const list = polykeyAgent.vaults.listVaults();
    expect(list.length).toBe(1);
    expect(list[0].name).toBe('RenamedVault');
  });
  test('should fail to rename non-existent vault', async () => {
    await polykeyAgent.vaults.createVault('Vault1');
    const ids = polykeyAgent.vaults.getVaultIds('Vault1');
    expect(ids.length).toBe(1);

    const result = await pk([
      'vaults',
      'rename',
      '-vn',
      'InvalidVaultId', // vault does not exist
      '-nn',
      'RenamedVault',
      '-np',
      dataDir,
      '--password-file',
      passwordFile,
    ]);
    // Exit code of the exception
    expect(result).toBe(10);
    const list = polykeyAgent.vaults.listVaults();
    expect(list.length).toBe(1);
    expect(list[0].name).toBe('Vault1');
  });
  test('should delete vault', async () => {
    await polykeyAgent.vaults.createVault('Vault1');
    const ids = polykeyAgent.vaults.getVaultIds('Vault1');
    expect(ids.length).toBe(1);

    const result = await pk([
      'vaults',
      'delete',
      '-np',
      dataDir,
      '-vn',
      'Vault1',
      '--password-file',
      passwordFile,
    ]);
    expect(result).toBe(0);
    const list = polykeyAgent.vaults.listVaults();
    expect(list.length).toBe(0);
  });
  test('should return the stats of a vault', async () => {
    await polykeyAgent.vaults.createVault('Vault1');
    const ids = polykeyAgent.vaults.getVaultIds('Vault1');
    expect(ids.length).toBe(1);

    const result = await pk([
      'vaults',
      'stat',
      '-np',
      dataDir,
      '-vn',
      'Vault1',
      '--password-file',
      passwordFile,
    ]);
    expect(result).toBe(0);
  });
  test('should clone a vault', async () => {
    const dataDir2 = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const targetPolykeyAgent = new PolykeyAgent({
      nodePath: dataDir2,
      logger: logger,
    });
    await targetPolykeyAgent.start({
      password: 'password',
    });
    const vault = await targetPolykeyAgent.vaults.createVault('Vault1');
    await vault.initializeVault();
    const ids = targetPolykeyAgent.vaults.getVaultIds('Vault1');
    expect(ids.length).toBe(1);

    const targetNodeId = targetPolykeyAgent.nodes.getNodeId();
    const targetHost = targetPolykeyAgent.revProxy.getIngressHost();
    const targetPort = targetPolykeyAgent.revProxy.getIngressPort();
    await polykeyAgent.nodes.setNode(targetNodeId, {
      ip: targetHost,
      port: targetPort,
    });
    // Client agent: Start sending hole-punching packets to the target
    await polykeyAgent.nodes.createConnectionToNode(targetNodeId, {
      ip: targetHost,
      port: targetPort,
    } as NodeAddress);
    const clientEgressHost = polykeyAgent.fwdProxy.getEgressHost();
    const clientEgressPort = polykeyAgent.fwdProxy.getEgressPort();
    // Server agent: start sending hole-punching packets back to the 'client'
    // agent (in order to establish a connection)
    await targetPolykeyAgent.nodes.openConnection(
      clientEgressHost,
      clientEgressPort,
    );

    // Vault does not exist on the source PolykeyAgent so the pull command throws an error which
    // caught, the error is checked and if it is ErrorVaultUndefined, then the Agent attempts a
    // clone instead
    const result = await pk([
      'vaults',
      'pull',
      '-np',
      dataDir,
      '-ni',
      targetNodeId as string,
      '-vn',
      'Vault1',
      '--password-file',
      passwordFile,
    ]);
    expect(result).toBe(0);

    await targetPolykeyAgent.stop();
    await fs.promises.rmdir(dataDir2, { recursive: true });

    const list = polykeyAgent.vaults.listVaults();
    expect(list.length).toBe(1);
    expect(list[0].name).toBe('Vault1');
  });
  test('should pull a vault', async () => {
    const dataDir2 = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const targetPolykeyAgent = new PolykeyAgent({
      nodePath: dataDir2,
      logger: logger,
    });
    await targetPolykeyAgent.start({
      password: 'password',
    });
    const vault = await targetPolykeyAgent.vaults.createVault('Vault1');
    await vault.initializeVault();
    const ids = targetPolykeyAgent.vaults.getVaultIds('Vault1');
    expect(ids.length).toBe(1);

    const targetNodeId = targetPolykeyAgent.nodes.getNodeId();
    const targetHost = targetPolykeyAgent.revProxy.getIngressHost();
    const targetPort = targetPolykeyAgent.revProxy.getIngressPort();
    await polykeyAgent.nodes.setNode(targetNodeId, {
      ip: targetHost,
      port: targetPort,
    });
    // Client agent: Start sending hole-punching packets to the target
    await polykeyAgent.nodes.createConnectionToNode(targetNodeId, {
      ip: targetHost,
      port: targetPort,
    } as NodeAddress);
    const clientEgressHost = polykeyAgent.fwdProxy.getEgressHost();
    const clientEgressPort = polykeyAgent.fwdProxy.getEgressPort();
    // Server agent: start sending hole-punching packets back to the 'client'
    // agent (in order to establish a connection)
    await targetPolykeyAgent.nodes.openConnection(
      clientEgressHost,
      clientEgressPort,
    );

    // Vault does not exist on the source PolykeyAgent so the pull command throws an error which
    // caught, the error is checked and if it is ErrorVaultUndefined, then the Agent attempts a
    // clone instead
    const result = await pk([
      'vaults',
      'pull',
      '-np',
      dataDir,
      '-ni',
      targetNodeId as string,
      '-vn',
      'Vault1',
      '--password-file',
      passwordFile,
    ]);
    expect(result).toBe(0);

    await vault.addSecret(
      'MySecret',
      Buffer.from('This secret will be pulled'),
    );

    const list = polykeyAgent.vaults.listVaults();
    expect(list.length).toBe(1);
    expect(list[0].name).toBe('Vault1');
    const clonedVault = polykeyAgent.vaults.getVault(list[0].id);
    await expect(clonedVault.listSecrets()).resolves.toStrictEqual([]);

    const result2 = await pk([
      'vaults',
      'pull',
      '-np',
      dataDir,
      '-ni',
      targetNodeId as string,
      '-vn',
      'Vault1',
      '--password-file',
      passwordFile,
    ]);
    expect(result2).toBe(0);

    await expect(clonedVault.listSecrets()).resolves.toStrictEqual([
      'MySecret',
    ]);
    await expect(clonedVault.getSecret('MySecret')).resolves.toStrictEqual(
      Buffer.from('This secret will be pulled'),
    );

    await targetPolykeyAgent.stop();
    await fs.promises.rmdir(dataDir2, { recursive: true });
  });
  test('should scan a node for vaults', async () => {
    const dataDir2 = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const targetPolykeyAgent = new PolykeyAgent({
      nodePath: dataDir2,
      logger: logger,
    });
    await targetPolykeyAgent.start({
      password: 'password',
    });

    const targetNodeId = targetPolykeyAgent.nodes.getNodeId();
    const targetHost = targetPolykeyAgent.revProxy.getIngressHost();
    const targetPort = targetPolykeyAgent.revProxy.getIngressPort();
    await polykeyAgent.nodes.setNode(targetNodeId, {
      ip: targetHost,
      port: targetPort,
    });
    // Client agent: Start sending hole-punching packets to the target
    await polykeyAgent.nodes.createConnectionToNode(targetNodeId, {
      ip: targetHost,
      port: targetPort,
    } as NodeAddress);
    const clientEgressHost = polykeyAgent.fwdProxy.getEgressHost();
    const clientEgressPort = polykeyAgent.fwdProxy.getEgressPort();
    // Server agent: start sending hole-punching packets back to the 'client'
    // agent (in order to establish a connection)
    await targetPolykeyAgent.nodes.openConnection(
      clientEgressHost,
      clientEgressPort,
    );

    await targetPolykeyAgent.vaults.createVault('Vault1');
    await targetPolykeyAgent.vaults.createVault('Vault2');
    await targetPolykeyAgent.vaults.createVault('Vault3');

    const targetVaults = targetPolykeyAgent.vaults.listVaults();
    expect(targetVaults.length).toBe(3);

    const result = await pk([
      'vaults',
      'scan',
      '-np',
      dataDir,
      '-ni',
      targetNodeId as string,
    ]);
    expect(result).toBe(0);

    await targetPolykeyAgent.stop();
    await fs.promises.rmdir(dataDir2, { recursive: true });
  });
});
