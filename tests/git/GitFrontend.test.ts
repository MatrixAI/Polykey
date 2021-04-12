import os from 'os';
import path from 'path';
import fsPromises from 'fs/promises';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { KeyManager } from '@/keys';
import { VaultManager } from '@/vaults';
import { GitFrontend } from '@/git';
import { NodeConnection } from '@/nodes/types';

let dataDir: string;
let destDir: string;
let keyManager: KeyManager;
let vaultManager: VaultManager;
const logger = new Logger('GitFrontend', LogLevel.WARN, [new StreamHandler()]);

beforeEach(async () => {
  dataDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'polykey-test-'));
  destDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'polykey-test-'));
  keyManager = new KeyManager({
    keysPath: `${dataDir}/keys`,
    logger: logger,
  });
  vaultManager = new VaultManager({
    baseDir: dataDir,
    keyManager: keyManager,
    fs: fsPromises,
    logger: logger,
  });
});

afterEach(async () => {
  await fsPromises.rm(dataDir, {
    force: true,
    recursive: true,
  });
  await fsPromises.rm(destDir, {
    force: true,
    recursive: true,
  });
});

describe('GitFrontend', () => {
  test('is type correct', async () => {
    try {
      await keyManager.start({ password: 'password' });
      await vaultManager.start({});
      const nodeConnection: NodeConnection = { placeholder: true };
      const gitFrontend = new GitFrontend(() => nodeConnection);
      expect(gitFrontend).toBeInstanceOf(GitFrontend);
    } finally {
      await vaultManager.stop();
      await keyManager.stop();
    }
  });
});
