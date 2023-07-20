import type { StatusLive } from '@/status/types';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import config from '@/config';
import { Status, errors as statusErrors } from '@/status';
import * as testNodesUtils from '../nodes/utils';

describe('Status', () => {
  const logger = new Logger(`${Status.name} Test`, LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const nodeId1 = testNodesUtils.generateRandomNodeId();
  const nodeId2 = testNodesUtils.generateRandomNodeId();
  const nodeId3 = testNodesUtils.generateRandomNodeId();
  let dataDir: string;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'status-test-'));
  });
  afterEach(async () => {
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('status readiness', async () => {
    const status = new Status({
      statusPath: path.join(dataDir, config.paths.statusBase),
      statusLockPath: path.join(dataDir, config.paths.statusLockBase),
      fs: fs,
      logger: logger,
    });
    await status.start({ pid: 0 });
    // Should be a noop
    await status.start({ pid: 0 });
    expect(fs.existsSync(status.statusPath)).toBe(true);
    expect(fs.existsSync(status.statusLockPath)).toBe(true);
    await status.stop({ foo: 'bar' });
    expect(fs.existsSync(status.statusPath)).toBe(true);
    expect(fs.existsSync(status.statusLockPath)).toBe(false);
    let statusInfo = await status.readStatus();
    expect(statusInfo?.status).toEqual('DEAD');
    await status.start({ pid: 0 });
    statusInfo = await status.readStatus();
    expect(statusInfo?.status).toEqual('STARTING');
    await status.stop({});
  });
  test('status transitions', async () => {
    const status = new Status({
      statusPath: path.join(dataDir, config.paths.statusBase),
      statusLockPath: path.join(dataDir, config.paths.statusLockBase),
      fs: fs,
      logger: logger,
    });
    await status.start({ pid: 0 });
    const statusInfo1 = await status.readStatus();
    expect(statusInfo1).toBeDefined();
    expect(statusInfo1!.status).toBe('STARTING');
    expect(statusInfo1!.data.pid).toBe(0);
    await status.finishStart({
      pid: 0,
      nodeId: nodeId1,
      clientHost: '::1',
      clientPort: 0,
      agentHost: '::1',
      agentPort: 0,
      anything: 'something',
    });
    const statusInfo2 = await status.readStatus();
    expect(statusInfo2).toBeDefined();
    expect(statusInfo2!.status).toBe('LIVE');
    expect(statusInfo2!.data.pid).toBeDefined();
    expect(statusInfo2!.data.anything).toBe('something');
    await status.beginStop({
      pid: 1,
    });
    const statusInfo3 = await status.readStatus();
    expect(statusInfo3).toBeDefined();
    expect(statusInfo3!.status).toBe('STOPPING');
    expect(statusInfo3!.data.pid).toBe(1);
    await status.stop({});
    const statusInfo4 = await status.readStatus();
    expect(statusInfo4).toBeDefined();
    expect(statusInfo4!.status).toBe('DEAD');
  });
  test('start with existing statusPath or statusLockPath', async () => {
    await fs.promises.writeFile(
      path.join(dataDir, config.paths.statusBase),
      'hello world',
    );
    await fs.promises.writeFile(
      path.join(dataDir, config.paths.statusLockBase),
      'hello world',
    );
    const status = new Status({
      statusPath: path.join(dataDir, config.paths.statusBase),
      statusLockPath: path.join(dataDir, config.paths.statusLockBase),
      fs: fs,
      logger: logger,
    });
    await status.start({ pid: 0 });
    const statusInfo = await status.readStatus();
    expect(statusInfo).toBeDefined();
    expect(statusInfo!.status).toBe('STARTING');
    expect(statusInfo!.data.pid).toBe(0);
    await status.stop({});
  });
  test('readStatus on non-existent status', async () => {
    const status = new Status({
      statusPath: path.join(dataDir, config.paths.statusBase),
      statusLockPath: path.join(dataDir, config.paths.statusLockBase),
      fs: fs,
      logger: logger,
    });
    expect(await status.readStatus()).toBeUndefined();
  });
  test('updating live status', async () => {
    const status = new Status({
      statusPath: path.join(dataDir, config.paths.statusBase),
      statusLockPath: path.join(dataDir, config.paths.statusLockBase),
      fs: fs,
      logger: logger,
    });
    await status.start({ pid: 0 });
    await expect(status.updateStatusLive({})).rejects.toThrow(
      statusErrors.ErrorStatusLiveUpdate,
    );
    const statusData1: StatusLive['data'] = {
      pid: 0,
      nodeId: nodeId1,
      clientHost: '::1',
      clientPort: 0,
      agentHost: '::1',
      agentPort: 0,
      anything: 'something',
    };
    await status.finishStart(statusData1);
    const statusInfo = await status.updateStatusLive({
      nodeId: nodeId2,
      anotherThing: 'something',
    });
    expect(statusInfo).toStrictEqual({
      status: 'LIVE',
      data: {
        ...statusData1,
        nodeId: nodeId2,
        anotherThing: 'something',
      },
    });
    await status.beginStop({ pid: 0 });
    await expect(status.updateStatusLive({})).rejects.toThrow(
      statusErrors.ErrorStatusLiveUpdate,
    );
    await status.stop({});
    await expect(status.updateStatusLive({})).rejects.toThrow(
      statusErrors.ErrorStatusNotRunning,
    );
  });
  test('singleton running status', async () => {
    const status1 = new Status({
      statusPath: path.join(dataDir, config.paths.statusBase),
      statusLockPath: path.join(dataDir, config.paths.statusLockBase),
      fs: fs,
      logger: logger,
    });
    const status2 = new Status({
      statusPath: path.join(dataDir, config.paths.statusBase),
      statusLockPath: path.join(dataDir, config.paths.statusLockBase),
      fs: fs,
      logger: logger,
    });
    await status1.start({ pid: 1 });
    await expect(async () => {
      await status2.start({ pid: 2 });
    }).rejects.toThrow(statusErrors.ErrorStatusLocked);
    // Status 2 can still read the status
    const statusInfo = await status2.readStatus();
    expect(statusInfo).toBeDefined();
    expect(statusInfo!.data.pid).toBe(1);
    await status1.stop({});
  });
  test('wait for transitions', async () => {
    const status = new Status({
      statusPath: path.join(dataDir, config.paths.statusBase),
      statusLockPath: path.join(dataDir, config.paths.statusLockBase),
      fs: fs,
      logger: logger,
    });
    let statusWaitFor = status.waitFor('STARTING');
    await status.start({ pid: 0 });
    const statusInfoStarting = await statusWaitFor;
    expect(statusInfoStarting!.status).toBe('STARTING');
    statusWaitFor = status.waitFor('LIVE');
    await status.finishStart({
      pid: 0,
      nodeId: nodeId3,
      clientHost: '',
      clientPort: 0,
      agentHost: '::1',
      agentPort: 0,
    });
    const statusInfoLive = await statusWaitFor;
    expect(statusInfoLive!.status).toBe('LIVE');
    statusWaitFor = status.waitFor('STOPPING');
    await status.beginStop({ pid: 0 });
    const statusInfoStopping = await statusWaitFor;
    expect(statusInfoStopping!.status).toBe('STOPPING');
    statusWaitFor = status.waitFor('DEAD');
    await status.stop({});
    const statusInfoDead = await statusWaitFor;
    expect(statusInfoDead!.status).toBe('DEAD');
  });
  test('parse error when statusPath is corrupted', async () => {
    const status = new Status({
      statusPath: path.join(dataDir, config.paths.statusBase),
      statusLockPath: path.join(dataDir, config.paths.statusLockBase),
      fs: fs,
      logger: logger,
    });
    await status.start({ pid: 0 });
    await fs.promises.writeFile(status.statusPath, '{');
    await expect(() => status.readStatus()).rejects.toThrow(
      statusErrors.ErrorStatusParse,
    );
    await status.stop({});
  });
  test('status transitions are serialised', async () => {
    const status = new Status({
      statusPath: path.join(dataDir, config.paths.statusBase),
      statusLockPath: path.join(dataDir, config.paths.statusLockBase),
      fs: fs,
      logger: logger,
    });
    await status.start({ pid: 0 });
    // The key point here is that there are no parsing errors
    // And that the status info is always defined
    for (let i = 0; i < 100; i++) {
      const [, statusInfo1, , , , statusInfo2] = await Promise.all([
        status.finishStart({
          clientHost: '',
          clientPort: 0,
          agentHost: '::1',
          agentPort: 0,
          nodeId: nodeId3,
          pid: 0,
        }),
        status.readStatus(),
        status.beginStop({
          pid: 4,
        }),
        status.finishStart({
          clientHost: '',
          clientPort: 3445,
          agentHost: '::1',
          agentPort: 0,
          nodeId: nodeId3,
          pid: 0,
        }),
        status.beginStop({
          pid: 2,
        }),
        status.readStatus(),
        status.finishStart({
          clientHost: '',
          clientPort: 0,
          agentHost: '::1',
          agentPort: 0,
          nodeId: nodeId3,
          pid: 0,
        }),
      ]);
      expect(statusInfo1).toBeDefined();
      expect(statusInfo2).toBeDefined();
      expect(['LIVE', 'STARTING', 'STOPPING']).toContainEqual(
        statusInfo1!.status,
      );
      expect(['LIVE', 'STARTING', 'STOPPING']).toContainEqual(
        statusInfo2!.status,
      );
    }
    await status.stop({ pid: 0 });
  });
  test('wait for has at-least-once semantics', async () => {
    const status = new Status({
      statusPath: path.join(dataDir, config.paths.statusBase),
      statusLockPath: path.join(dataDir, config.paths.statusLockBase),
      fs: fs,
      logger: logger,
    });
    await status.start({ pid: 0 });
    // `waitFor` relies on filesystem watching
    // It does not guarantee exactly-once semantics for status events
    // In this case, it is possible that upon reacting to `LIVE` status
    // When it reads the status, it has already changed to `STOPPING`
    // Which means the `statusWaitFor` never resolves
    const statusWaitFor = status.waitFor('LIVE', 1000);
    const p1 = status.finishStart({
      clientHost: '',
      clientPort: 0,
      agentHost: '::1',
      agentPort: 0,
      nodeId: nodeId3,
      pid: 0,
    });
    const p2 = status.beginStop({ pid: 1 });
    try {
      const statusInfo = await statusWaitFor;
      expect(statusInfo!.status).toBe('LIVE');
      logger.info('Succeeds waiting for LIVE');
    } catch (e) {
      expect(e).toBeInstanceOf(statusErrors.ErrorStatusTimeout);
      logger.info('Times out waiting for LIVE');
    }
    await Promise.all([p1, p2]);
    // The last promise to be resolved might be p1 and not p2
    const statusInfo = await status.readStatus();
    expect(
      statusInfo!.status === 'LIVE' || statusInfo!.status === 'STOPPING',
    ).toBe(true);
    await status.stop({});
  });
});
