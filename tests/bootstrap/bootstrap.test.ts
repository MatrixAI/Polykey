import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import PolykeyAgent from '@/PolykeyAgent';

import * as bootstrapErrors from '@/bootstrap/errors';
import * as bootstrapUtils from '@/bootstrap/utils';
import { Status } from '@/status';

// Mocks.
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

  // Helper functions
  async function fakeKeynode(nodePath) {
    await fs.promises.mkdir(path.join(nodePath, 'keys'));
    await fs.promises.mkdir(path.join(nodePath, 'db'));
    await fs.promises.writeFile(
      path.join(nodePath, 'versionFile'),
      'Versions or something IDK',
    );
  }

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

    test('Should throw error if other files exists.', async () => {
      await fs.promises.mkdir(path.join(nodePath, 'NotAnNodeDirectory'));
      await expect(() =>
        bootstrapUtils.bootstrapState({ nodePath, password, logger }),
      ).rejects.toThrow(bootstrapErrors.ErrorBootstrapExistingState);
    });

    test('should throw error if keynode already exists.', async () => {
      await fakeKeynode(nodePath);
      await expect(() =>
        bootstrapUtils.bootstrapState({ nodePath, password, logger }),
      ).rejects.toThrow(bootstrapErrors.ErrorBootstrapExistingState);
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
        const statusPath = path.join(nodePath, 'status.json');
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
