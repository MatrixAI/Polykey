import * as testUtils from './utils';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { PolykeyAgent } from '@';
import * as utils from './utils';

/**
 * This test file has been optimised to use only one instance of PolykeyAgent where posible.
 * Setting up the PolykeyAgent has been done in a beforeAll block.
 * Keep this in mind when adding or editing tests.
 * Any side effects need to be undone when the test has completed.
 * Preferably within a `afterEach()` since any cleanup will be skipped inside a failing test.
 *
 * - left over state can cause a test to fail in certain cases.
 * - left over state can cause similar tests to succeed when they should fail.
 * - starting or stopping the agent within tests should be done on a new instance of the polykey agent.
 * - when in doubt test each modified or added test on it's own as well as the whole file.
 * - Looking into adding a way to safely clear each domain's DB information with out breaking modules.
 */
describe('CLI Echo', () => {
  const password = 'password';
  const logger = new Logger('pkWithStdio Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  let nodePath: string;
  let passwordFile: string;
  let polykeyAgent: PolykeyAgent;

  beforeAll(async () => {
    //This handles the expensive setting up of the polykey agent.
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    nodePath = path.join(dataDir, 'keynode');
    passwordFile = path.join(dataDir, 'passwordFile');
    await fs.promises.writeFile(passwordFile, 'password');
    polykeyAgent = await PolykeyAgent.createPolykey({
      password,
      nodePath: nodePath,
      logger: logger,
      cores: 1,
      workerManager: null,
    });
    await polykeyAgent.start({});

    // Authorize session
    await utils.pkWithStdio([
      'agent',
      'unlock',
      '-np',
      nodePath,
      '--password-file',
      passwordFile,
    ]);
  }, global.polykeyStartupTimeout);
  afterAll(async () => {
    await polykeyAgent.stop();
    await polykeyAgent.destroy();
    await fs.promises.rmdir(dataDir, { recursive: true });
  });

  describe('commandEcho', () => {
    test('Should echo the sent message', async () => {
      const message = 'HelloWorld!';
      const result = await testUtils.pkWithStdio([
        'echoes',
        'echo',
        message,
        '-np',
        nodePath,
      ]);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain(message);
    });
  });
});
