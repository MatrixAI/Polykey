import { EventBus, captureRejectionSymbol } from '@/events';
import { sleep } from '@/utils';

describe('EventBus', () => {
  const testSyncFunction = jest.fn((echo: string) => {
    return echo;
  });
  const testAsyncFunction = jest.fn(async (echo: string) => {
    await sleep(10);
    return echo;
  });
  afterEach(async () => {
    testSyncFunction.mockRestore();
    testAsyncFunction.mockRestore();
  });
  test('synchronous handlers simple', async () => {
    const e = new EventBus({
      captureRejections: true,
    });
    e.on('test-event-1', () => {
      testSyncFunction('Handler 1');
    });
    e.on('test-event-2', () => {
      testSyncFunction('Handler 2');
    });
    e.on('test-event-1', () => {
      testSyncFunction('Handler 3');
    });
    const result1 = await e.emitAsync('test-event-1');
    const result2 = await e.emitAsync('test-event-2');
    expect(result1).toBeTruthy();
    expect(result2).toBeTruthy();
    expect(testSyncFunction.mock.calls[0][0]).toBe('Handler 1');
    expect(testSyncFunction.mock.calls[1][0]).toBe('Handler 3');
    expect(testSyncFunction.mock.calls[2][0]).toBe('Handler 2');
  });
  test('synchronous handlers complex', async () => {
    const e = new EventBus({
      captureRejections: true,
    });
    e.on('test-event-1', () => {
      testSyncFunction('Handler 1 Call 1');
      testSyncFunction('Handler 1 Call 2');
      testSyncFunction('Handler 1 Call 3');
    });
    e.on('test-event-2', () => {
      testSyncFunction('Handler 2 Call 1');
      testSyncFunction('Handler 2 Call 2');
      testSyncFunction('Handler 2 Call 3');
    });
    e.on('test-event-1', () => {
      testSyncFunction('Handler 3 Call 1');
      testSyncFunction('Handler 3 Call 2');
      testSyncFunction('Handler 3 Call 3');
    });
    const result1 = await e.emitAsync('test-event-1');
    const result2 = await e.emitAsync('test-event-2');
    expect(result1).toBeTruthy();
    expect(result2).toBeTruthy();
    expect(testSyncFunction.mock.calls[0][0]).toBe('Handler 1 Call 1');
    expect(testSyncFunction.mock.calls[1][0]).toBe('Handler 1 Call 2');
    expect(testSyncFunction.mock.calls[2][0]).toBe('Handler 1 Call 3');
    expect(testSyncFunction.mock.calls[3][0]).toBe('Handler 3 Call 1');
    expect(testSyncFunction.mock.calls[4][0]).toBe('Handler 3 Call 2');
    expect(testSyncFunction.mock.calls[5][0]).toBe('Handler 3 Call 3');
    expect(testSyncFunction.mock.calls[6][0]).toBe('Handler 2 Call 1');
    expect(testSyncFunction.mock.calls[7][0]).toBe('Handler 2 Call 2');
    expect(testSyncFunction.mock.calls[8][0]).toBe('Handler 2 Call 3');
  });
  test('asynchronous handlers simple', async () => {
    const e = new EventBus({
      captureRejections: true,
    });
    e.on('test-event-1', async () => {
      await testAsyncFunction('Handler 1');
    });
    e.on('test-event-2', async () => {
      await testAsyncFunction('Handler 2');
    });
    e.on('test-event-1', async () => {
      await testAsyncFunction('Handler 3');
    });
    const result1 = await e.emitAsync('test-event-1');
    const result2 = await e.emitAsync('test-event-2');
    expect(result1).toBeTruthy();
    expect(result2).toBeTruthy();
    expect(testAsyncFunction.mock.calls[0][0]).toBe('Handler 1');
    expect(testAsyncFunction.mock.calls[1][0]).toBe('Handler 3');
    expect(testAsyncFunction.mock.calls[2][0]).toBe('Handler 2');
  });
  test('asynchronous handlers complex', async () => {
    const e = new EventBus({
      captureRejections: true,
    });
    e.on('test-event-1', async () => {
      await testAsyncFunction('Handler 1 Call 1');
      await testAsyncFunction('Handler 1 Call 2');
      await testAsyncFunction('Handler 1 Call 3');
    });
    e.on('test-event-2', async () => {
      await testAsyncFunction('Handler 2 Call 1');
      await testAsyncFunction('Handler 2 Call 2');
      await testAsyncFunction('Handler 2 Call 3');
    });
    e.on('test-event-1', async () => {
      await testAsyncFunction('Handler 3 Call 1');
      await testAsyncFunction('Handler 3 Call 2');
      await testAsyncFunction('Handler 3 Call 3');
    });
    const result1 = await e.emitAsync('test-event-1');
    const result2 = await e.emitAsync('test-event-2');
    expect(result1).toBeTruthy();
    expect(result2).toBeTruthy();
    expect(testAsyncFunction.mock.calls[0][0]).toBe('Handler 1 Call 1');
    expect(testAsyncFunction.mock.calls[1][0]).toBe('Handler 1 Call 2');
    expect(testAsyncFunction.mock.calls[2][0]).toBe('Handler 1 Call 3');
    expect(testAsyncFunction.mock.calls[3][0]).toBe('Handler 3 Call 1');
    expect(testAsyncFunction.mock.calls[4][0]).toBe('Handler 3 Call 2');
    expect(testAsyncFunction.mock.calls[5][0]).toBe('Handler 3 Call 3');
    expect(testAsyncFunction.mock.calls[6][0]).toBe('Handler 2 Call 1');
    expect(testAsyncFunction.mock.calls[7][0]).toBe('Handler 2 Call 2');
    expect(testAsyncFunction.mock.calls[8][0]).toBe('Handler 2 Call 3');
  });
  test('mixed handlers simple', async () => {
    const e = new EventBus({
      captureRejections: true,
    });
    e.on('test-event', () => {
      testSyncFunction('Handler 1');
    });
    e.on('test-event', async () => {
      await sleep(10);
      testSyncFunction('Handler 2');
    });
    e.on('test-event', () => {
      testSyncFunction('Handler 3');
    });
    const result = await e.emitAsync('test-event');
    expect(result).toBeTruthy();
    expect(testSyncFunction.mock.calls[0][0]).toBe('Handler 1');
    expect(testSyncFunction.mock.calls[1][0]).toBe('Handler 2');
    expect(testSyncFunction.mock.calls[2][0]).toBe('Handler 3');
  });
  test('mixed handlers complex', async () => {
    const e = new EventBus({
      captureRejections: true,
    });
    e.on('test-event', () => {
      testSyncFunction('Handler 1 Call 1');
      testSyncFunction('Handler 1 Call 2');
      testSyncFunction('Handler 1 Call 3');
    });
    e.on('test-event', async () => {
      await sleep(10);
      testSyncFunction('Handler 2 Call 1');
      await sleep(10);
      testSyncFunction('Handler 2 Call 2');
      await sleep(10);
      testSyncFunction('Handler 2 Call 3');
    });
    e.on('test-event', () => {
      testSyncFunction('Handler 3 Call 1');
      testSyncFunction('Handler 3 Call 2');
      testSyncFunction('Handler 3 Call 3');
    });
    const result = await e.emitAsync('test-event');
    expect(result).toBeTruthy();
    expect(testSyncFunction.mock.calls[0][0]).toBe('Handler 1 Call 1');
    expect(testSyncFunction.mock.calls[1][0]).toBe('Handler 1 Call 2');
    expect(testSyncFunction.mock.calls[2][0]).toBe('Handler 1 Call 3');
    expect(testSyncFunction.mock.calls[3][0]).toBe('Handler 2 Call 1');
    expect(testSyncFunction.mock.calls[4][0]).toBe('Handler 2 Call 2');
    expect(testSyncFunction.mock.calls[5][0]).toBe('Handler 2 Call 3');
    expect(testSyncFunction.mock.calls[6][0]).toBe('Handler 3 Call 1');
    expect(testSyncFunction.mock.calls[7][0]).toBe('Handler 3 Call 2');
    expect(testSyncFunction.mock.calls[8][0]).toBe('Handler 3 Call 3');
  });
  test('error handling', async () => {
    const e = new EventBus({
      captureRejections: true,
    });
    e.on('error', (e) => {
      testSyncFunction(e.message);
    });
    e.on('test-event-1', async () => {
      await testAsyncFunction('Handler 1');
    });
    e.on('test-event-2', async () => {
      await testAsyncFunction('Handler 2');
    });
    e.on('test-event-1', async () => {
      throw new Error('Error Handler 3');
    });
    e.on('test-event-1', async () => {
      await testAsyncFunction('Handler 4');
    });
    e.on('test-event-2', async () => {
      await testAsyncFunction('Handler 5');
    });
    const result1 = await e.emitAsync('test-event-1');
    const result2 = await e.emitAsync('test-event-2');
    expect(result1).toBeTruthy();
    expect(result2).toBeTruthy();
    expect(testSyncFunction.mock.calls).toHaveLength(1);
    expect(testAsyncFunction.mock.calls).toHaveLength(3);
    expect(testSyncFunction.mock.calls[0][0]).toBe('Error Handler 3');
    expect(testAsyncFunction.mock.calls[0][0]).toBe('Handler 1');
    expect(testAsyncFunction.mock.calls[1][0]).toBe('Handler 2');
    expect(testAsyncFunction.mock.calls[2][0]).toBe('Handler 5');
  });
  test('error handling and catching', async () => {
    const e = new EventBus({
      captureRejections: true,
    });
    e.on('error', (e) => {
      testSyncFunction(e.message);
    });
    e.on('test-event', async () => {
      await testAsyncFunction('Handler 1 Call 1');
      await testAsyncFunction('Handler 1 Call 2');
    });
    e.on('test-event', async () => {
      try {
        await testAsyncFunction('Handler 2 Call 1');
        throw new Error('Error Handler 2');
      } catch (e) {
        await testAsyncFunction(e.message);
      }
    });
    e.on('test-event', async () => {
      await testAsyncFunction('Handler 3');
    });
    const result = await e.emitAsync('test-event');
    expect(result).toBeTruthy();
    expect(testSyncFunction.mock.calls).toHaveLength(0);
    expect(testAsyncFunction.mock.calls).toHaveLength(5);
    expect(testAsyncFunction.mock.calls[0][0]).toBe('Handler 1 Call 1');
    expect(testAsyncFunction.mock.calls[1][0]).toBe('Handler 1 Call 2');
    expect(testAsyncFunction.mock.calls[2][0]).toBe('Handler 2 Call 1');
    expect(testAsyncFunction.mock.calls[3][0]).toBe('Error Handler 2');
    expect(testAsyncFunction.mock.calls[4][0]).toBe('Handler 3');
  });
  test('error handling using symbol', async () => {
    const e = new EventBus({
      captureRejections: true,
    });
    e[captureRejectionSymbol] = (err, event) => {
      testSyncFunction(err + ' - ' + event);
    };
    e.on('test-event-1', async () => {
      await testAsyncFunction('Handler 1');
    });
    e.on('test-event-2', async () => {
      await testAsyncFunction('Handler 2');
    });
    e.on('test-event-1', async () => {
      throw new Error('Error Handler 3');
    });
    e.on('test-event-1', async () => {
      await testAsyncFunction('Handler 4');
    });
    e.on('test-event-2', async () => {
      await testAsyncFunction('Handler 5');
    });
    const result1 = await e.emitAsync('test-event-1');
    const result2 = await e.emitAsync('test-event-2');
    expect(result1).toBeTruthy();
    expect(result2).toBeTruthy();
    expect(testSyncFunction.mock.calls).toHaveLength(1);
    expect(testAsyncFunction.mock.calls).toHaveLength(3);
    expect(testSyncFunction.mock.calls[0][0]).toBe(
      'Error: Error Handler 3 - test-event-1',
    );
    expect(testAsyncFunction.mock.calls[0][0]).toBe('Handler 1');
    expect(testAsyncFunction.mock.calls[1][0]).toBe('Handler 2');
    expect(testAsyncFunction.mock.calls[2][0]).toBe('Handler 5');
  });
});
