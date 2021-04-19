import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { PolykeyAgent } from '@';

describe('index', () => {
  const logger = new Logger('index test', LogLevel.WARN, [new StreamHandler()]);
  test('construction of Polykey', async () => {
    const pk = new PolykeyAgent({ logger });
    expect(pk).toBeInstanceOf(PolykeyAgent);
  });
});
