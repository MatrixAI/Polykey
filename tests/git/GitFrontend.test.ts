import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { KeyManager } from '@/keys';
import { VaultManager } from '@/vaults';
import { GitFrontend } from '@/git';

let dataDir: string;
let destDir: string;
let keyManager: KeyManager;
let vaultManager: VaultManager;
const logger = new Logger('GitFrontend', LogLevel.WARN, [new StreamHandler()]);

beforeEach(async () => {
  dataDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'polykey-test-'));
  destDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'polykey-test-'));
  keyManager = new KeyManager({
    keysPath: `${dataDir}/keys`,
    logger: logger,
  });
  vaultManager = new VaultManager({
    vaultsPath: dataDir,
    keyManager: keyManager,
    fs: fs,
    logger: logger,
  });
});

afterEach(async () => {
  await fs.promises.rm(dataDir, {
    force: true,
    recursive: true,
  });
  await fs.promises.rm(destDir, {
    force: true,
    recursive: true,
  });
});

describe('GitFrontend', () => {
  test('is type correct', async () => {
    try {
      await keyManager.start({ password: 'password' });
      await vaultManager.start({});
      const gitFrontend = new GitFrontend(logger);
      expect(gitFrontend).toBeInstanceOf(GitFrontend);
    } finally {
      await vaultManager.stop();
      await keyManager.stop();
    }
  });
});
