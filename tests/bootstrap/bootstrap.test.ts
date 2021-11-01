import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyAgent from '@/PolykeyAgent';
import * as bootstrapUtils from '@/bootstrap/utils';
import { Status } from '@/status';
import config from '@/config';

jest.mock('@/keys/utils', () => ({
  ...jest.requireActual('@/keys/utils'),
  generateDeterministicKeyPair:
    jest.requireActual('@/keys/utils').generateKeyPair,
}));

describe('Bootstrap', () => {
  const logger = new Logger('AgentServerTest', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  let nodePath: string;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'status-test-'));
    nodePath = path.join(dataDir, 'Node');
    await fs.promises.mkdir(nodePath);
  });
  afterEach(async () => {
    await fs.promises.rm(nodePath, {
      force: true,
      recursive: true,
    });
  });

  describe('BootstrapPolykeyState', () => {
    const password = 'password123';
    test(
      'should create state if no directory',
      async () => {
        // Await fs.promises.rmdir(nodePath);
        await bootstrapUtils.bootstrapState({ nodePath, password, logger });
        // Should have keynode state;
      },
      global.polykeyStartupTimeout * 4,
    );

    test('should create state if empty directory', async () => {
      await bootstrapUtils.bootstrapState({
        nodePath,
        password,
        logger,
      });
    });

    test(
      'should be able to start agent on created state.',
      async () => {
        await bootstrapUtils.bootstrapState({
          nodePath,
          password,
          logger,
        });
        const polykeyAgent = await PolykeyAgent.createPolykeyAgent({
          password,
          nodePath,
          logger,
        });
        const statusPath = path.join(nodePath, config.defaults.statusBase);
        const status = new Status({
          statusPath,
          fs,
          logger,
        });
        await status.waitFor('LIVE', 10000);
        await polykeyAgent.stop();
        await polykeyAgent.destroy();
        await status.waitFor('DEAD', 10000);
      },
      global.polykeyStartupTimeout * 2,
    );
  });
});
