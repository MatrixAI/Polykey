import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { pk } from './utils';
import { PolykeyAgent } from '../../src';
import main from '@/bin/polykey';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

const logger = new Logger('CLI Test', LogLevel.WARN, [new StreamHandler()]);
let dataDir: string;
let polykeyAgent: PolykeyAgent;

describe('polykey', () => {
  test('default help display', async () => {
    expect(await main(['', ''])).toBe(0);
  });
});

describe('CLI echoes', () => {
  beforeEach(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'polykey-test-'));
    polykeyAgent = new PolykeyAgent({
      nodePath: dataDir,
      logger: logger,
    });
    await polykeyAgent.start({
      password: 'password',
    });
  });

  afterEach(async () => {
    await polykeyAgent.stop();
  });

  test('should echo', async () => {
    const result = await pk(['echoes', 'echo', '-np', dataDir, 'HelloWorld']);
    expect(result).toBe(0);
  });
});

describe('CLI vaults', () => {
  beforeEach(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'polykey-test-'));
    polykeyAgent = new PolykeyAgent({
      nodePath: dataDir,
      logger: logger,
    });
    await polykeyAgent.start({
      password: 'password',
    });
  });

  afterEach(async () => {
    await polykeyAgent.stop();
  });

  test('should list vaults', async () => {
    await polykeyAgent.vaults.createVault('Vault1');
    await polykeyAgent.vaults.createVault('Vault2');

    const result = await pk(['vaults', 'list', '-np', dataDir]);
    expect(result).toBe(0);
  });
  test('should create vaults', async () => {
    const result = await pk(['vaults', 'create', '-np', dataDir, '-vn', 'MyTestVault']);
    expect(result).toBe(0);
    const result2 = await pk(['vaults', 'touch', '-np', dataDir, '-vn', 'MyTestVault2']);
    expect(result2).toBe(0);
    const vaults = polykeyAgent.vaults.listVaults().sort();
    expect(vaults[0].name).toBe('MyTestVault')
    expect(vaults[1].name).toBe('MyTestVault2')
  });
  // test('should rename vault', async () => {
  //   await polykeyAgent.vaults.createVault('Vault1');
  //   const ids = polykeyAgent.vaults.getVaultIds('Vault1');
  //   expect(ids.length).toBe(1);

  //   const result = await pk(['vaults', 'rename', ids[0], 'RenamedVault', '-np', dataDir]);
  //   expect(result).toBe(0);
  // });
  // test('should delete vault', async () => {
  //   await polykeyAgent.vaults.createVault('Vault1');
  //   const ids = polykeyAgent.vaults.getVaultIds('Vault1');
  //   expect(ids.length).toBe(1);

  //   const result = await pk(['vaults', 'delete', ids[0]]);
  //   expect(result).toBe(0);
  // });
});
