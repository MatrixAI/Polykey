import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import Polykey from '@';

describe('index', () => {
  const logger = new Logger('Polykey Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  test('construction of Polykey', async () => {
    const pk = new Polykey({ logger });
    await pk.start({ password: 'password' });
    expect(pk).toBeInstanceOf(Polykey);
    await pk.stop();
  });
});
