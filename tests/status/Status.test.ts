import fs from 'fs';
import os from 'os';
import path from 'path';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import * as statusErrors from '@/status/errors';
import { Status } from '../../src/status';

describe('Lockfile is', () => {
  const logger = new Logger('Lockfile Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  let status: Status;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'status-test-'));
    status = await Status.createStatus({
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
    expect(status).toBeInstanceOf(Status);
  });

  test('starting and stopping with correct side effects', async () => {
    await status.start();
    expect(fs.existsSync(status.lockPath)).toBe(true);

    await status.stop();
    expect(fs.existsSync(status.lockPath)).toBe(false);
  });

  test('updating data and parsing it correctly', async () => {
    let lock;
    await status.start();
    lock = await status.parseStatus();
    expect(lock!.pid).toBeTruthy();

    await status.updateStatus('grpcHost', 'localhost');
    await status.updateStatus('grpcPort', 12345);
    await status.updateStatus('anything', 'something');

    lock = await status.parseStatus();
    if (lock) {
      expect(lock.pid).toBeTruthy();
      expect(lock.grpcHost).toBe('localhost');
      expect(lock.grpcPort).toBe(12345);
      expect(lock.anything).toBe('something');
    } else {
      throw new Error('Lock should exist');
    }

    await status.stop();
  });

  test('Working fine when a status already exists', async () => {
    await fs.promises.writeFile(
      status.lockPath,
      JSON.stringify({ pid: 66666 }),
    );
    await status.start();
    let lock;
    lock = await status.parseStatus();
    if (lock) {
      expect(lock.pid).toBeTruthy();
    } else {
      throw new Error('Lock should exist');
    }

    await status.updateStatus('grpcHost', 'localhost');
    await status.updateStatus('grpcPort', 12345);
    await status.updateStatus('anything', 'something');

    lock = await status.parseStatus();
    if (lock) {
      expect(lock.pid).toBeTruthy();
      expect(lock.grpcHost).toBe('localhost');
      expect(lock.grpcPort).toBe(12345);
      expect(lock.anything).toBe('something');
    } else {
      throw new Error('Lock should exist');
    }

    await status.stop();
  });
  test('A running status holds a lock', async () => {
    // Make sure that the status is running
    await status.start();

    // Try to start a new status.
    // Creation should succeed.
    const status2 = await Status.createStatus({
      nodePath: dataDir,
      fs: fs,
      logger: logger,
    });

    // Should be able to read the lock info.
    const info = await status2.parseStatus();
    expect(info).toBeTruthy();
    expect(info?.pid).toBeTruthy();

    // Should fail to start a new lock.
    await expect(() => status2.start()).rejects.toThrow(
      statusErrors.ErrorStatusLockFailed,
    );
  });
  test('Lockfile has multiple states.', async () => {
    // Should be starting now.
    await status.start();
    expect(await status.checkStatus()).toEqual('STARTING');

    // Should be running.
    await status.finishStart();
    expect(await status.checkStatus()).toEqual('RUNNING');

    // Should be stopping.
    await status.beginStop();
    expect(await status.checkStatus()).toEqual('STOPPING');

    // Should be removed now.
    await status.stop();
    expect(await status.checkStatus()).toEqual('UNLOCKED');
  });
});
