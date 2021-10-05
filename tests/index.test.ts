import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { PolykeyAgent } from '@';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('index', () => {
  const logger = new Logger('index test', LogLevel.WARN, [new StreamHandler()]);
  let dataDir;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
  });
  test('construction of Polykey', async () => {
    const password = 'password';
    const pk = await PolykeyAgent.createPolykey({
      password,
      nodePath: dataDir,
      logger,
      cores: 1,
    });
    expect(pk).toBeInstanceOf(PolykeyAgent);
    await pk.stop();
    await pk.destroy();
  });
});
