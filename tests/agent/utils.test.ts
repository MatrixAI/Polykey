import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import PolykeyAgent from '@/PolykeyAgent';

import * as agentUtils from '@/agent/utils';
import { poll } from '../utils';

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

    test(
      'Should spawn an agent in the background.',
      async () => {
        await expect(
          agentUtils.checkAgentRunning(nodePath),
        ).resolves.toBeFalsy();
        const pid = await agentUtils.spawnBackgroundAgent(nodePath, password);
        expect(typeof pid).toBe('number'); //Returns a number.
        expect(pid > 0).toBeTruthy(); // Non-zero
        await poll(global.polykeyStartupTimeout * 1.5, async () => {
          return await agentUtils.checkAgentRunning(nodePath);
        });
        //Killing the agent.
        process.kill(pid);

        // Polling for agent to stop.
        await poll(global.polykeyStartupTimeout, async () => {
          const test = await agentUtils.checkAgentRunning(nodePath);
          return !test;
        });
        //Polling for removed lockfile.
        await poll(global.polykeyStartupTimeout, async () => {
          const agentLock = await fs.promises.readdir(nodePath);
          const test = agentLock.includes('agent-lock.json');
          return !test;
        });
      },
      global.polykeyStartupTimeout * 3.5,
    );
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
