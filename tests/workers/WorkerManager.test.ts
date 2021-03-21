import process from 'process';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import WorkerManager from '@/workers/WorkerManager';
import * as workersErrors from '@/workers/errors';

describe('WorkerManager', () => {
  const logger = new Logger('WorkerManager Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  test('construction has no side effects', async () => {
    const workerManager = new WorkerManager({ logger });
    expect(workerManager.call(async () => undefined)).rejects.toThrow(
      workersErrors.ErrorNotRunning,
    );
  });
  test('async start and async stop', async () => {
    const workerManager = new WorkerManager({ logger });
    await workerManager.start();
    expect(await workerManager.call(async () => 1)).toBe(1);
    await workerManager.stop();
    expect(workerManager.call(async () => 1)).rejects.toThrow(
      workersErrors.ErrorNotRunning,
    );
  });
  test('call runs in the main thread', async () => {
    const mainPid1 = process.pid;
    const workerManager = new WorkerManager({ logger });
    await workerManager.start();
    let mainPid2;
    let mainPid3;
    // only `w.f()` functions are running in the worker threads
    // the callback passed to `call` is still running in the main thread
    expect(
      await workerManager.call(async (w) => {
        mainPid2 = process.pid;
        const process2 = require('process');
        mainPid3 = process2.pid;
        return await w.isRunningInWorker();
      }),
    ).toBe(true);
    await workerManager.stop();
    expect(mainPid2).toBe(mainPid1);
    expect(mainPid3).toBe(mainPid1);
  });
  test('can await a subset of tasks', async () => {
    const workerManager = new WorkerManager({ logger });
    await workerManager.start();
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
    await workerManager.stop();
  });
  test('queueing up tasks', async () => {
    const workerManager = new WorkerManager({ logger });
    await workerManager.start();
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
    await workerManager.stop();
  });
});
