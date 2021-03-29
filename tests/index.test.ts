import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import Polykey from '@';

describe('index', () => {
  const logger = new Logger('index test', LogLevel.WARN, [new StreamHandler()]);
  test('construction of Polykey', async () => {
    const pk = new Polykey({ logger });
    expect(pk).toBeInstanceOf(Polykey);
  });
});
