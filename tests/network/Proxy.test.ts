import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { ForwardProxy, ReverseProxy } from '../../src/network';

describe('Forward Proxy is', () => {
  let fwdProxy: ForwardProxy;
  const logger: Logger = new Logger('Test-ForwardProxy', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  beforeEach(() => {
    fwdProxy = new ForwardProxy({
      authToken: 'TestToken',
      logger: logger,
    });
  });
  test('type correct', async () => {
    expect(fwdProxy).toBeInstanceOf(ForwardProxy);
  });
  test('able to start and stop', async () => {
    // NO PARAMS?
    await fwdProxy.start();
    expect(fwdProxy.getHttpPort()).toBeDefined();
    expect(fwdProxy.getSocketPort()).toBeDefined();
    await fwdProxy.stop();
  });
});

describe('Reverse Proxy is', () => {
  let revProxy: ReverseProxy;
  const logger: Logger = new Logger('Test-ReverseProxy', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  beforeEach(() => {
    revProxy = new ReverseProxy({
      logger: logger,
    });
  });
  test('type correct', async () => {
    expect(revProxy).toBeInstanceOf(ReverseProxy);
  });
  test('able to start and stop', async () => {
    await revProxy.start();
    expect(revProxy.getSocketPort()).toBeDefined();
    await revProxy.stop();
  });
});

describe('Forward and Reverse', () => {
  let fwdProxy: ForwardProxy;
  let revProxy: ReverseProxy;
  const logger: Logger = new Logger('Test-FwdRev', LogLevel.WARN, [
    new StreamHandler(),
  ]);

  beforeEach(() => {
    fwdProxy = new ForwardProxy({
      authToken: 'TestToken',
      logger: logger,
    });
    revProxy = new ReverseProxy({
      logger: logger,
    });
  });
  test('can punch each other', async () => {
    await revProxy.start();
    await fwdProxy.start();

    const revPort = revProxy.getSocketPort();
    const fwdPort = fwdProxy.getSocketPort();

    expect(revPort).toBeDefined();
    expect(fwdPort).toBeDefined();

    const [res1, res2] = await Promise.all([
      fwdProxy.addNatConnection(revPort!, '127.0.0.1'),
      revProxy.addNatConnection(fwdPort!, '127.0.0.1'),
    ]);

    expect(res1).toBe(true);
    expect(res2).toBe(true);

    await fwdProxy.stop();
    await revProxy.stop();
  });
});
