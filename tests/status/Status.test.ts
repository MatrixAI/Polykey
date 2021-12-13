import type { NodeId } from '@/nodes/types';
import type { Host, Port } from '@/network/types';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import config from '@/config';
import { sleep, errors as utilsErrors } from '@/utils';
import { Status, errors as statusErrors } from '@/status';

describe('Status', () => {
  const logger = new Logger(`${Status.name} Test`, LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const waitForTimeout = 1000;
  let dataDir: string;
  let status: Status;
  let statusPath: string;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'status-test-'));
    statusPath = path.join(dataDir, config.defaults.statusBase);
    status = new Status({
      statusPath,
      fs: fs,
      logger: logger,
    });
  });

  afterEach(async () => {
    await status.stop({});
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test('type correct', () => {
    expect(status).toBeInstanceOf(Status);
  });

  test('starting and stopping with correct side effects', async () => {
    await status.start({ pid: 0 });
    await status.readStatus();
    expect(fs.existsSync(status.statusPath)).toBe(true);

    await status.stop({ lol: 2 });
    await sleep(1000);
    expect(fs.existsSync(status.statusPath)).toBe(true);
    const state = await status.readStatus();
    expect(state?.status).toEqual('DEAD');
  });

  test('updating data and parsing it correctly', async () => {
    await status.start({ pid: 0 });
    const lock1 = await status.readStatus();
    expect(lock1?.data.pid).toBeDefined();

    await status.finishStart({
      pid: 0,
      nodeId: 'node' as NodeId,
      clientHost: '::1' as Host,
      clientPort: 0 as Port,
      ingressHost: '127.0.0.1' as Host,
      ingressPort: 0 as Port,
      grpcHost: 'localhost',
      grpcPort: 12345,
      anything: 'something',
    });

    const lock2 = await status.readStatus();
    if (lock2) {
      expect(lock2.data.pid).toBeDefined();
      expect(lock2.data.grpcHost).toBe('localhost');
      expect(lock2.data.grpcPort).toBe(12345);
      expect(lock2.data.anything).toBe('something');
    } else {
      throw new Error('Lock should exist');
    }

    await status.stop({});
  });

  test('Working fine when a status already exists', async () => {
    await fs.promises.writeFile(
      status.statusPath,
      JSON.stringify({ pid: 66666 }),
    );
    await status.start({ pid: 0 });
    let lock;
    lock = await status.readStatus();
    if (lock) {
      expect(lock.data.pid).toBeDefined();
    } else {
      throw new Error('Lock should exist');
    }

    await status.finishStart({
      pid: 0,
      nodeId: 'node' as NodeId,
      clientHost: '::1' as Host,
      clientPort: 0 as Port,
      ingressHost: '127.0.0.1' as Host,
      ingressPort: 0 as Port,
      grpcHost: 'localhost',
      grpcPort: 12345,
      anything: 'something',
    });

    lock = await status.readStatus();
    if (lock) {
      expect(lock.data.pid).toBeDefined();
      expect(lock.data.grpcHost).toBe('localhost');
      expect(lock.data.grpcPort).toBe(12345);
      expect(lock.data.anything).toBe('something');
    } else {
      throw new Error('Lock should exist');
    }

    await status.stop({});
  });
  test('A running status holds a lock', async () => {
    // Make sure that the status is running
    await status.start({ pid: 0 });

    // Try to start a new status.
    // Creation should succeed.
    const status2 = new Status({
      statusPath: path.join(dataDir, config.defaults.statusBase),
      fs: fs,
      logger: logger,
    });

    // Should be able to read the lock info.
    const info = await status2.readStatus();
    expect(info).toBeDefined();
    expect(info?.data.pid).toBeDefined();

    // Should fail to start a new lock.
    await expect(() => status2.start({ pid: 0 })).rejects.toThrow(
      statusErrors.ErrorStatusLocked,
    );
  });
  test('Lockfile has multiple states.', async () => {
    // Should be starting now.
    await status.start({ pid: 0 });
    expect((await status.readStatus())?.status).toEqual('STARTING');

    // Should be running.
    await status.finishStart({
      clientHost: '' as Host,
      clientPort: 0 as Port,
      nodeId: '' as NodeId,
      ingressHost: '127.0.0.1' as Host,
      ingressPort: 0 as Port,
      pid: 0,
    });
    expect((await status.readStatus())?.status).toEqual('LIVE');

    // Should be stopping.
    await status.beginStop({ pid: 0 });
    expect((await status.readStatus())?.status).toEqual('STOPPING');

    // Should be removed now.
    await status.stop({});
    expect((await status.readStatus())?.status).toEqual('DEAD');
  });
  test('Status can wait for its status to be LIVE if started.', async () => {
    // We want to mimic the startup procedure.
    const delayedStart = async () => {
      await status.start({ pid: 0 });
      await sleep(500);
      await status.finishStart({
        clientHost: '' as Host,
        clientPort: 0 as Port,
        ingressHost: '127.0.0.1' as Host,
        ingressPort: 0 as Port,
        nodeId: '' as NodeId,
        pid: 0,
      });
    };
    const prom = delayedStart();

    const test = await status.waitFor('LIVE', waitForTimeout);
    expect(test.status).toEqual('LIVE');
    await prom;

    // Checking that we throw an error when we can't wait for RUNNING.
    const delayedStop = async () => {
      await status.beginStop({ pid: 0 });
      await sleep(500);
      await status.stop({});
    };
    const prom2 = delayedStop();
    const test2 = status.waitFor('LIVE', waitForTimeout);
    await expect(async () => {
      await test2;
    }).rejects.toThrow(utilsErrors.ErrorUtilsPollTimeout);
    await prom2;

    // Should throw if no file was found / unlocked.
    const test3 = status.waitFor('LIVE', waitForTimeout);
    await expect(async () => {
      await test3;
    }).rejects.toThrow(utilsErrors.ErrorUtilsPollTimeout);
  });
  test('Status can wait for its status to be DEAD if Stopping.', async () => {
    // Should succeed if not started.
    const test4 = await status.waitFor('DEAD', waitForTimeout);
    expect(test4.status).toEqual('DEAD');

    // Should throw an error when starting.
    await status.start({ pid: 0 });
    const test = status.waitFor('LIVE', waitForTimeout);
    await expect(async () => {
      await test;
    }).rejects.toThrow(utilsErrors.ErrorUtilsPollTimeout);

    // Should throw an error whens started.
    await status.start({ pid: 0 });
    const test2 = status.waitFor('DEAD', waitForTimeout);
    await expect(async () => {
      await test2;
    }).rejects.toThrow(utilsErrors.ErrorUtilsPollTimeout);

    // Should wait and succeed when stopping.
    const delayedStart = async () => {
      await status.beginStop({ pid: 0 });
      await sleep(500);
      await status.stop({});
    };
    const prom2 = delayedStart();
    const test3 = await status.waitFor('DEAD', waitForTimeout);
    expect(test3.status).toEqual('DEAD');
    await prom2;
  });
  test('should throw an error when failing to parse.', async () => {
    // Creating the status file.
    await status.start({ pid: 0 });
    // Corrupting the status file.
    await fs.promises.writeFile(statusPath, '{');
    // Should throw.
    await expect(() => status.readStatus()).rejects.toThrow(
      statusErrors.ErrorStatusParse,
    );
  });
});
