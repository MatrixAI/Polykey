import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { ConnectionManager } from '../../src/network';

describe('ConnectionManager is', () => {
  let connectionManager: ConnectionManager;
  beforeEach(() => {
    connectionManager = new ConnectionManager({
      logger: new Logger('Test ConnectionManager', LogLevel.WARN, [
        new StreamHandler(),
      ]),
    });
  });
  test('type correct', () => {
    expect(connectionManager).toBeInstanceOf(ConnectionManager);
  });
  test('able to initialize and stop', async () => {
    const socket = connectionManager.start();
    expect(socket).toBeTruthy();
    await connectionManager.stop();
  });
});
