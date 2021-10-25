import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyAgent from '@/PolykeyAgent';
import config from '@/config';
import { ErrorStateVersionMismatch } from '@/errors';
import { checkAgentRunning } from '@/agent/utils';

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
      pk = await PolykeyAgent.createPolykey({
        password,
        nodePath,
        logger,
        cores: 1,
        workerManager: null,
      });
      expect(pk).toBeInstanceOf(PolykeyAgent);
    },
    global.polykeyStartupTimeout,
  );
  // Test.skip(
  //   'construction has no side effects',
  //   async () => {
  //     const nodePath = `${dataDir}/polykey`;
  //     await PolykeyAgent.createPolykey({ password, nodePath, logger });
  //     await expect(() => fs.promises.stat(nodePath)).rejects.toThrow(/ENOENT/); // Construction has side effects now.
  //   },
  //   global.polykeyStartupTimeout,
  // );
  test(
    'async start constructs node path',
    async () => {
      const nodePath = `${dataDir}/polykey`;
      pk = await PolykeyAgent.createPolykey({
        password,
        nodePath,
        logger,
        cores: 1,
        workerManager: null,
      });
      await pk.start({});
      const nodePathContents = await fs.promises.readdir(nodePath);
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
      pk = await PolykeyAgent.createPolykey({
        password,
        nodePath,
        logger,
        cores: 1,
        workerManager: null,
      });
      await pk.start({});
      await pk.stop();
      const nodePathContents = await fs.promises.readdir(nodePath);
      expect(nodePathContents).toContain('keys');
      expect(nodePathContents).toContain('db');
      expect(nodePathContents).toContain('vaults');
    },
    global.polykeyStartupTimeout,
  );
  test('GithubProvider is registered', async () => {
    const providerId = 'github.com';
    const nodePath = `${dataDir}/polykey`;
    pk = await PolykeyAgent.createPolykey({
      password,
      nodePath,
      logger,
      cores: 1,
      workerManager: null,
    });
    const providers = pk.identities.getProviders();
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
      const nodePath = `${dataDir}/polykey`;
      const versionFilePath = path.join(nodePath, 'versionFile');
      const versionInfo = { ...config }; // Cheeky clone
      versionInfo.stateVersion = config.stateVersion + 1;
      const versionInfoString = JSON.stringify(versionInfo);
      await fs.promises.mkdir(nodePath, { recursive: true });
      await fs.promises.writeFile(versionFilePath, versionInfoString);

      // Attempt to start a polykeyAgent.
      await expect(async () => {
        pk = await PolykeyAgent.createPolykey({
          password,
          nodePath,
          logger,
          cores: 1,
          workerManager: null,
        });
      }).rejects.toThrow(ErrorStateVersionMismatch);
    },
    global.polykeyStartupTimeout,
  );
  test(
    'Creates the version file when starting Polykey',
    async () => {
      // Creating an old version file.
      const nodePath = `${dataDir}/polykey`;
      const versionFilePath = path.join(nodePath, 'versionFile');

      // Attempt to start a polykeyAgent.
      pk = await PolykeyAgent.createPolykey({
        password,
        nodePath,
        logger,
        cores: 1,
        workerManager: null,
      });
      await pk.start({});
      await pk.stop();

      const versionFileContents = await fs.promises.readFile(versionFilePath);
      const versionInfo = JSON.parse(versionFileContents.toString());
      expect(versionInfo).toStrictEqual(config);
    },
    global.polykeyStartupTimeout,
  );
  test('Stopping and destroying properly stops Polykey', async () => {
    //Starting.
    const nodePath = `${dataDir}/polykey`;
    pk = await PolykeyAgent.createPolykey({
      password,
      nodePath,
      logger,
      cores: 1,
      workerManager: null,
    });
    await pk.start({});
    expect(await checkAgentRunning(nodePath)).toBeTruthy();

    await pk.stop();
    expect(await checkAgentRunning(nodePath)).toBeFalsy();
    await pk.destroy();
    expect(await checkAgentRunning(nodePath)).toBeFalsy();
  });
});
