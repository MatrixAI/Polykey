import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyAgent from '@/PolykeyAgent';
import config from '@/config';
import { Status } from '@/status';
import * as schemaErrors from '@/schema/errors';

// Mocks.
jest.mock('@/keys/utils', () => ({
  ...jest.requireActual('@/keys/utils'),
  generateDeterministicKeyPair:
    jest.requireActual('@/keys/utils').generateKeyPair,
}));

describe('Polykey', () => {
  const password = 'password';
  const logger = new Logger('PolykeyAgent Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  let pk: PolykeyAgent;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
  });
  afterEach(async () => {
    if (pk != null) {
      await pk.stop();
      await pk.destroy();
    }
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test(
    'Able to construct',
    async () => {
      const nodePath = path.join(dataDir, 'polykey');
      pk = await PolykeyAgent.createPolykeyAgent({
        password,
        nodePath,
        logger,
      });
      expect(pk).toBeInstanceOf(PolykeyAgent);
    },
    global.polykeyStartupTimeout,
  );
  test(
    'async start constructs node path',
    async () => {
      const nodePath = `${dataDir}/polykey`;
      pk = await PolykeyAgent.createPolykeyAgent({
        password,
        nodePath,
        logger,
      });
      const nodePathContents = await fs.promises.readdir(
        path.join(nodePath, 'state'),
      );
      expect(nodePathContents).toContain('keys');
      expect(nodePathContents).toContain('vaults');
      expect(nodePathContents).toContain('db');
      await pk.stop();
    },
    global.polykeyStartupTimeout,
  );
  test(
    'async stop leaves the node path',
    async () => {
      const nodePath = `${dataDir}/polykey`;
      pk = await PolykeyAgent.createPolykeyAgent({
        password,
        nodePath,
        logger,
      });
      await pk.stop();
      const nodePathContents = await fs.promises.readdir(
        path.join(nodePath, 'state'),
      );
      expect(nodePathContents).toContain('keys');
      expect(nodePathContents).toContain('db');
      expect(nodePathContents).toContain('vaults');
    },
    global.polykeyStartupTimeout,
  );
  test(
    'able to async start after async stop',
    async () => {
      const nodePath = `${dataDir}/polykey`;
      pk = await PolykeyAgent.createPolykeyAgent({
        password,
        nodePath,
        logger,
      });
      await pk.stop();
      await expect(pk.start({ password })).resolves.not.toThrowError();
    },
    global.polykeyStartupTimeout * 2,
  );
  test('GithubProvider is registered', async () => {
    const providerId = 'github.com';
    const nodePath = `${dataDir}/polykey`;
    pk = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath,
      logger,
    });
    const providers = pk.identitiesManager.getProviders();
    // Exists
    expect(providers[providerId]).toBeTruthy();
    // Matches clientID in config.
    expect(providers[providerId].clientId).toEqual(
      config.providers[providerId].clientId,
    );
  });
  test(
    'throw error if state version does not match config',
    async () => {
      // Creating an old version file.
      const nodePath = path.join(dataDir, 'polykey');
      const versionFilePath = path.join(nodePath, 'state', 'version');
      const versionInfo = { ...config }; // Cheeky clone
      versionInfo.stateVersion = config.stateVersion + 1;
      const versionInfoString = JSON.stringify(versionInfo);
      await fs.promises.mkdir(path.join(nodePath, 'state'), {
        recursive: true,
      });
      await fs.promises.writeFile(versionFilePath, versionInfoString);

      // Attempt to start a polykeyAgent.
      await expect(async () => {
        pk = await PolykeyAgent.createPolykeyAgent({
          password,
          nodePath,
          logger,
        });
      }).rejects.toThrow(schemaErrors.ErrorSchemaVersionParse);
    },
    global.polykeyStartupTimeout,
  );
  test(
    'Creates the version file when starting Polykey',
    async () => {
      // Creating an old version file.
      const nodePath = path.join(dataDir, 'polykey');
      const versionFilePath = path.join(nodePath, 'state', 'version');

      // Attempt to start a polykeyAgent.
      pk = await PolykeyAgent.createPolykeyAgent({
        password,
        nodePath,
        logger,
      });
      await pk.stop();

      const versionFileContents = await fs.promises.readFile(versionFilePath);
      const versionInfo = JSON.parse(versionFileContents.toString());
      expect(versionInfo).toStrictEqual(config.stateVersion);
    },
    global.polykeyStartupTimeout,
  );
  test(
    'Stopping and destroying properly stops Polykey',
    async () => {
      // Starting.
      const nodePath = `${dataDir}/polykey`;
      pk = await PolykeyAgent.createPolykeyAgent({
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
      await status.waitFor('LIVE', 2000);
      await pk.stop();
      await status.waitFor('DEAD', 2000);
      await pk.destroy();
      await status.waitFor('DEAD', 2000);
    },
    global.polykeyStartupTimeout * 2,
  );
});
