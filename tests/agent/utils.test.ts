import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import PolykeyAgent from '@/PolykeyAgent';

import * as agentUtils from '@/agent/utils';
import * as utils from '@/utils';

describe('agent utils', () => {
  const logger = new Logger('AgentServerTest', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'password123';
  let dataDir: string;
  let nodePath: string;

  describe('checkAgentRunning', () => {
    beforeEach(async () => {
      dataDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'polykey-test-'),
      );
      nodePath = path.join(dataDir, 'keyNode');
    });
    afterEach(async () => {
      await fs.promises.rm(dataDir, {
        force: true,
        recursive: true,
      });
    });

    test('False if agent not running.', async () => {
      await expect(agentUtils.checkAgentRunning(nodePath)).resolves.toBeFalsy();
    });

    test('True if agent running.', async () => {
      const agent = new PolykeyAgent({
        nodePath: nodePath,
        logger: logger,
      });
      await agent.start({ password });
      await expect(
        agentUtils.checkAgentRunning(nodePath),
      ).resolves.toBeTruthy();
      await agent.stop();
    });
  });
  describe('spawnBackgroundAgent', () => {
    beforeEach(async () => {
      dataDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'polykey-test-'),
      );
      nodePath = path.join(dataDir, 'keyNode');
    });
    afterEach(async () => {
      await fs.promises.rm(dataDir, {
        force: true,
        recursive: true,
      });
    });

    jest.setTimeout(30000);
    test('Should spawn an agent in the background.', async () => {
      await expect(agentUtils.checkAgentRunning(nodePath)).resolves.toBeFalsy();
      const pid = await agentUtils.spawnBackgroundAgent(nodePath, password);
      expect(typeof pid).toBe('number'); //Returns a number.
      expect(pid > 0).toBeTruthy(); // non-zero
      await utils.sleep(1000);
      await expect(
        agentUtils.checkAgentRunning(nodePath),
      ).resolves.toBeTruthy(); //Check that it is running.
      process.kill(pid);

      await utils.sleep(1000);
      //removed lockfile, stopped gracefully.
      const agentLock = await fs.promises.readdir(nodePath);
      expect(agentLock.includes('agent-lock.json')).toBeFalsy();
      await expect(agentUtils.checkAgentRunning(nodePath)).resolves.toBeFalsy(); //Check that it stopped.
    });
    test('Should throw error if agent already running.', async () => {
      const agent = new PolykeyAgent({
        nodePath: nodePath,
        logger: logger,
      });
      await agent.start({ password });
      await expect(
        agentUtils.checkAgentRunning(nodePath),
      ).resolves.toBeTruthy();

      await expect(
        agentUtils.spawnBackgroundAgent(nodePath, password),
      ).rejects.toThrow('running');
      await expect(
        agentUtils.checkAgentRunning(nodePath),
      ).resolves.toBeTruthy(); //Check that it is running.

      await agent.stop();
    });
  });
});
