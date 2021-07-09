import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import { Lockfile } from '@/lockfile';
import PolykeyAgent from '@/PolykeyAgent';

import * as utils from '@/utils';
import * as testUtils from './utils';
import * as agentUtils from '@/agent/utils';

let dataDir: string;
let nodePath: string;
let passwordFile: string;
const password = 'passsword';
const logger = new Logger('AgentServerTest', LogLevel.WARN, [
  new StreamHandler(),
]);

describe('CLI agent', () => {
  describe('Agent start', () => {
    beforeEach(async () => {
      dataDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'polykey-test-'),
      );
      passwordFile = path.join(dataDir, 'passwordFile');
      nodePath = path.join(dataDir, 'testnode');
      await fs.promises.writeFile(passwordFile, 'password');
    });

    afterEach(async () => {
      await fs.promises.rm(dataDir, {
        force: true,
        recursive: true,
      });
    });

    jest.setTimeout(40000);
    test('Foreground should start the agent.', async () => {
      await testUtils.pk([
        'agent',
        'start',
        '-np',
        nodePath,
        '--password-file',
        passwordFile,
      ]);
      await utils.sleep(2000);
      await expect(
        agentUtils.checkAgentRunning(nodePath),
      ).resolves.toBeTruthy();

      const result5 = await testUtils.cli(
        ['agent', 'status', '-np', nodePath],
        '.',
      );
      expect(result5.code).toBe(0);
      expect(result5.stdout).toContain('online');

      await testUtils.pk(['agent', 'stop', '-np', nodePath]);
      await utils.sleep(2000);

      const result6 = await testUtils.cli(
        ['agent', 'status', '-np', nodePath],
        '.',
      );
      expect(result6.code).toBe(0);
      expect(result6.stdout).toContain('offline');
    });
    test('Foreground should fail if agent already running.', async () => {
      const firstAgent = new PolykeyAgent({
        nodePath: nodePath,
        logger: logger,
      });
      await firstAgent.start({ password });
      await expect(
        agentUtils.checkAgentRunning(nodePath),
      ).resolves.toBeTruthy();

      //can't await this, it never completes while running.
      const result = await testUtils.pk([
        'agent',
        'start',
        '-np',
        nodePath,
        '--password-file',
        passwordFile,
      ]);

      expect(result).toBe(1);

      await firstAgent.stop();
    });
    // test('Foreground should clean up if externally killed.', async () => {
    //   //can't await this, it never completes while running.
    //   const agent = testUtils.cli(
    //     ['agent', 'start', '-np', nodePath, '--password-file', passwordFile],
    //     '.',
    //   );
    //   await utils.sleep(20000);
    //   await expect(
    //     agentUtils.checkAgentRunning(nodePath),
    //   ).resolves.toBeTruthy();

    //   const lock = await Lockfile.parseLock(
    //     fs,
    //     path.join(nodePath, 'agent-lock.json'),
    //   );
    //   process.kill(lock.pid);
    //   await agent; //Waiting for agent to finish running.
    //   await expect(agentUtils.checkAgentRunning(nodePath)).resolves.toBeFalsy();

    //   const files = await fs.promises.readdir(nodePath);
    //   expect(files.includes('agent-lock.json')).toBeFalsy();
    // });

    jest.setTimeout(80000);
    test('Background should Spawn an agent in the background.', async () => {
      const commands = [
        'agent',
        'start',
        '-b',
        '-np',
        nodePath,
        '--password-file',
        passwordFile,
      ];

      // We can await this since it should finish after spawning the background agent.
      const result = await testUtils.pk(commands);
      expect(result).toBe(0);

      await utils.sleep(2000);
      await expect(
        agentUtils.checkAgentRunning(nodePath),
      ).resolves.toBeTruthy();

      await testUtils.pk(['agent', 'stop', '-np', nodePath]);
      await utils.sleep(2000);
    });
    test('Background should fail if agent already running.', async () => {
      //Starting the agent.
      const agent = new PolykeyAgent({
        nodePath: nodePath,
        logger: logger,
      });
      await agent.start({ password });
      await expect(
        agentUtils.checkAgentRunning(nodePath),
      ).resolves.toBeTruthy();

      const commands = [
        'agent',
        'start',
        '-b',
        '-np',
        nodePath,
        '--password-file',
        passwordFile,
      ];
      // We can await this since it should finish after spawning the background agent.
      const result = await testUtils.pk(commands);
      expect(result).toBe(1);

      await agent.stop();
    });
    test('Background should clean up if externally killed.', async () => {
      //Starting the agent.
      const commands = [
        'agent',
        'start',
        '-b',
        '-np',
        nodePath,
        '--password-file',
        passwordFile,
      ];
      // We can await this since it should finish after spawning the background agent.
      const result = await testUtils.cli(commands, '.');
      expect(result.code).toBe(0);
      await expect(
        agentUtils.checkAgentRunning(nodePath),
      ).resolves.toBeTruthy();

      // Killing the process.
      await utils.sleep(10000);
      const lock = await Lockfile.parseLock(
        fs,
        path.join(nodePath, 'agent-lock.json'),
      );
      process.kill(lock.pid);
      await utils.sleep(5000);
      await expect(agentUtils.checkAgentRunning(nodePath)).resolves.toBeFalsy();

      //Checking that the lockfile was removed.
      const files = await fs.promises.readdir(nodePath);
      expect(files.includes('agent-lock.json')).toBeFalsy();
    });
  });

  describe('Agent stop', () => {
    beforeEach(async () => {
      dataDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'polykey-test-'),
      );
      passwordFile = path.join(dataDir, 'passwordFile');
      nodePath = path.join(dataDir, 'testnode');
      await fs.promises.writeFile(passwordFile, 'password');
    });

    afterEach(async () => {
      await fs.promises.rm(dataDir, {
        force: true,
        recursive: true,
      });
    });

    test('should fail if agent not running.', async () => {
      await expect(agentUtils.checkAgentRunning(nodePath)).resolves.toBeFalsy();

      // Stopping the agent.
      const result = await testUtils.pk(['agent', 'stop', '-np', nodePath]);
      expect(result).toBe(1);
      await utils.sleep(1500);

      await expect(agentUtils.checkAgentRunning(nodePath)).resolves.toBeFalsy();
    });
    test('should clean up when stopping agent', async () => {
      const agent = new PolykeyAgent({
        nodePath: nodePath,
        logger: logger,
      });
      await agent.start({ password });
      let files = await fs.promises.readdir(nodePath);
      expect(files.includes('agent-lock.json')).toBeTruthy();

      // Stopping the agent.
      const result4 = await testUtils.pk(['agent', 'stop', '-np', nodePath]);
      expect(result4).toBe(0);
      await utils.sleep(2000);

      await expect(agentUtils.checkAgentRunning(nodePath)).resolves.toBeFalsy();

      files = await fs.promises.readdir(nodePath);
      expect(files.includes('agent-lock.json')).toBeFalsy();
    });
  });
});
