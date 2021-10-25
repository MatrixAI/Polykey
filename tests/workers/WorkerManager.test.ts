import process from 'process';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import WorkerManager from '@/workers/WorkerManager';
import { errors as workersErrors } from '@matrixai/workers';

describe('WorkerManager', () => {
  const logger = new Logger('WorkerManager Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const cores = 1;
  let workerManager: WorkerManager;
  beforeAll(async () => {
    workerManager = await WorkerManager.createPolykeyWorkerManager({
      cores,
      logger,
    });
  });
  afterAll(async () => {
    await workerManager.destroy();
    expect(workerManager.destroyed).toBeTruthy();
  });
  test('construction has no side effects', async () => {
    const tempWorker = await WorkerManager.createPolykeyWorkerManager({
      cores,
      logger,
    });
    await tempWorker.destroy();
  });
  test('call runs in the main thread', async () => {
    const mainPid1 = process.pid;
    let mainPid2;
    let mainPid3;
    // Only `w.f()` functions are running in the worker threads
    // the callback passed to `call` is still running in the main thread
    expect(
      await workerManager.call(async (w) => {
        mainPid2 = process.pid;
        const process2 = require('process');
        mainPid3 = process2.pid;
        return await w.isRunningInWorker();
      }),
    ).toBe(true);
    expect(mainPid2).toBe(mainPid1);
    expect(mainPid3).toBe(mainPid1);
  });
  test('can await a subset of tasks', async () => {
    const task = workerManager.call(async (w) => {
      return await w.sleep(500);
    });
    const taskCount = 5;
    const tasks: Array<Promise<unknown>> = [];
    for (let i = 0; i < taskCount; i++) {
      tasks.push(
        workerManager.call(async (w) => {
          return await w.sleep(500);
        }),
      );
    }
    const rs = await Promise.all(tasks);
    expect(rs.length).toBe(taskCount);
    expect(rs.every((x) => x === undefined)).toBe(true);
    const r = await task;
    expect(r).toBeUndefined();
  });
  test('queueing up tasks', async () => {
    const t1 = workerManager.queue(async (w) => await w.sleep(500));
    const t2 = workerManager.queue(async (w) => await w.sleep(500));
    const t3 = workerManager.queue(async (w) => await w.sleep(500));
    const t4 = workerManager.queue(async (w) => await w.sleep(500));
    await workerManager.completed();
    expect(await t1).toBeUndefined();
    expect(await t2).toBeUndefined();
    expect(await t3).toBeUndefined();
    expect(await t4).toBeUndefined();
    workerManager.queue(async (w) => await w.sleep(500));
    workerManager.queue(async (w) => await w.sleep(500));
    workerManager.queue(async (w) => await w.sleep(500));
    workerManager.queue(async (w) => await w.sleep(500));
    const es = await workerManager.settled();
    expect(es.length).toBe(0);
  });
  test('async start and async stop', async () => {
    expect(await workerManager.call(async () => 1)).toBe(1);
    await workerManager.destroy();
    await expect(() => workerManager.call(async () => 1)).rejects.toThrow(
      workersErrors.ErrorWorkerManagerNotRunning,
    );
  });
});
