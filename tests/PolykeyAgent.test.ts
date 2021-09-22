import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyAgent from '@/PolykeyAgent';
import * as utils from '@/utils';
import config from '@/config';
import { ErrorStateVersionMismatch } from '@/errors';

describe('Polykey', () => {
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
    await pk.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test(
    'Able to construct',
    () => {
      pk = new PolykeyAgent({ logger });
      expect(pk).toBeInstanceOf(PolykeyAgent);
      expect(pk.nodePath).toBe(utils.getDefaultNodePath());
    },
    global.polykeyStartupTimeout,
  );
  test(
    'construction has no side effects',
    async () => {
      const nodePath = `${dataDir}/polykey`;
      new PolykeyAgent({ nodePath, logger });
      await expect(fs.promises.stat(nodePath)).rejects.toThrow(/ENOENT/);
    },
    global.polykeyStartupTimeout,
  );
  test(
    'async start constructs node path',
    async () => {
      const nodePath = `${dataDir}/polykey`;
      pk = new PolykeyAgent({ nodePath, logger });
      await pk.start({ password: 'password' });
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
      pk = new PolykeyAgent({ nodePath, logger });
      await pk.start({ password: 'password' });
      await pk.stop();
      const nodePathContents = await fs.promises.readdir(nodePath);
      expect(nodePathContents).toContain('keys');
      expect(nodePathContents).toContain('vaults');
      expect(nodePathContents).toContain('db');
      await fs.promises.rm(dataDir, { force: true, recursive: true });
    },
    global.polykeyStartupTimeout,
  );
  test('GithubProvider is registered', async () => {
    const providerId = 'github.com';
    const nodePath = `${dataDir}/polykey`;
    const pk = new PolykeyAgent({ nodePath, logger });
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
      pk = new PolykeyAgent({
        nodePath,
        logger,
      });
      await expect(pk.start({ password: 'password' })).rejects.toThrow(
        ErrorStateVersionMismatch,
      );
      await pk.stop();
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
      pk = new PolykeyAgent({
        nodePath,
        logger,
      });
      await pk.start({ password: 'password' });
      await pk.stop();

      const versionFileContents = await fs.promises.readFile(versionFilePath);
      const versionInfo = JSON.parse(versionFileContents.toString());
      expect(versionInfo).toStrictEqual(config);
    },
    global.polykeyStartupTimeout,
  );
});
