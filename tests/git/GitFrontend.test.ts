import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import { KeyManager } from '@/keys';
import { GitFrontend } from '@/git';
import { VaultManager } from '@/vaults';
import { ACL } from '@/acl';
import { GestaltGraph } from '@/gestalts';
import { DB } from '@/db';

let dataDir: string;
let destDir: string;
let keyManager: KeyManager;
let vaultManager: VaultManager;
let acl: ACL;
let gestaltGraph: GestaltGraph;
let db: DB;

const logger = new Logger('GitFrontend', LogLevel.WARN, [new StreamHandler()]);

beforeEach(async () => {
  dataDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'polykey-test-'));
  destDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'polykey-test-'));
  keyManager = new KeyManager({
    keysPath: path.join(dataDir, 'keys'),
    logger: logger,
  });
  await keyManager.start({ password: 'password' });
  db = new DB({ dbPath: path.join(dataDir, 'db'), keyManager, logger });
  await db.start();
  acl = new ACL({
    db: db,
    logger: logger,
  });
  await acl.start();
  gestaltGraph = new GestaltGraph({
    db: db,
    acl: acl,
    logger: logger,
  });
  await gestaltGraph.start();
  vaultManager = new VaultManager({
    vaultsPath: dataDir,
    keyManager: keyManager,
    db: db,
    acl: acl,
    gestaltGraph: gestaltGraph,
    fs: fs,
    logger: logger,
  });
});

afterEach(async () => {
  await gestaltGraph.stop();
  await acl.stop();
  await db.stop();
  await keyManager.stop();
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
      await vaultManager.start({});
      const gitFrontend = new GitFrontend(logger);
      expect(gitFrontend).toBeInstanceOf(GitFrontend);
    } finally {
      await vaultManager.stop();
    }
  });
});
