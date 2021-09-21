import type { NodeId } from '@/nodes/types';

import fs from 'fs';
import os from 'os';
import path from 'path';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import { Lockfile } from '../../src/lockfile';

describe('Lockfile is', () => {
  const logger = new Logger('Lockfile Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const nodeId = 'nodenodenode' as NodeId;
  let dataDir: string;
  let lockfile: Lockfile;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'lockfile-test-'),
    );
    lockfile = new Lockfile({
      nodePath: dataDir,
      fs: fs,
      logger: logger,
    });
  });

  afterEach(async () => {
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test('type correct', () => {
    expect(lockfile).toBeInstanceOf(Lockfile);
  });

  test('starting and stopping with correct side effects', async () => {
    await lockfile.start({ nodeId });
    expect(fs.existsSync(lockfile.lockPath)).toBe(true);
    expect(fs.existsSync(`${lockfile.lockPath}.lock`)).toBe(true);

    await lockfile.stop();
    expect(fs.existsSync(lockfile.lockPath)).toBe(false);
    expect(fs.existsSync(`${lockfile.lockPath}.lock`)).toBe(false);
  });

  test('updating data and parsing it correctly', async () => {
    await lockfile.start({ nodeId });
    let lock;
    lock = await Lockfile.parseLock(fs, lockfile.lockPath);
    if (lock) {
      expect(lock.pid).toBeTruthy();
    } else {
      throw new Error('Lock should exist');
    }

    await lockfile.updateLockfile('grpcHost', 'localhost');
    await lockfile.updateLockfile('grpcPort', 12345);
    await lockfile.updateLockfile('anything', 'something');

    lock = await Lockfile.parseLock(fs, lockfile.lockPath);
    if (lock) {
      expect(lock.pid).toBeTruthy();
      expect(lock.grpcHost).toBe('localhost');
      expect(lock.grpcPort).toBe(12345);
      expect(lock.anything).toBe('something');
    } else {
      throw new Error('Lock should exist');
    }

    await lockfile.stop();
  });

  test('Working fine when a lockfile already exists', async () => {
    await fs.promises.writeFile(
      lockfile.lockPath,
      JSON.stringify({ pid: 66666 }),
    );
    await lockfile.start({ nodeId });
    let lock;
    lock = await Lockfile.parseLock(fs, lockfile.lockPath);
    if (lock) {
      expect(lock.pid).toBeTruthy();
    } else {
      throw new Error('Lock should exist');
    }

    await lockfile.updateLockfile('grpcHost', 'localhost');
    await lockfile.updateLockfile('grpcPort', 12345);
    await lockfile.updateLockfile('anything', 'something');

    lock = await Lockfile.parseLock(fs, lockfile.lockPath);
    if (lock) {
      expect(lock.pid).toBeTruthy();
      expect(lock.grpcHost).toBe('localhost');
      expect(lock.grpcPort).toBe(12345);
      expect(lock.anything).toBe('something');
    } else {
      throw new Error('Lock should exist');
    }

    await lockfile.stop();
  });
});
