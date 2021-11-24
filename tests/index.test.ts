import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { PolykeyAgent } from '@';

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
    const pk = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: dataDir,
      logger,
    });
    expect(pk).toBeInstanceOf(PolykeyAgent);
    await pk.stop();
    await pk.destroy();
  });
});
