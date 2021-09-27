import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { PolykeyAgent } from '@';

describe('index', () => {
  const logger = new Logger('index test', LogLevel.WARN, [new StreamHandler()]);
  test('construction of Polykey', async () => {
    const password = 'password';
    const pk = await PolykeyAgent.createPolykey({ password, logger });
    expect(pk).toBeInstanceOf(PolykeyAgent);
    await pk.stop();
    await pk.destroy();
  });
});
