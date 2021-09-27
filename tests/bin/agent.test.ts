import type { SessionToken } from '@/sessions/types';

import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import * as utils from '@/utils';
import * as testUtils from './utils';
import * as agentUtils from '@/agent/utils';
import * as sessionErrors from '@/sessions/errors';

import PolykeyAgent from '@/PolykeyAgent';

import { Lockfile } from '@/lockfile';
import { poll } from '../utils';

describe('CLI agent', () => {
  const noJWTFailCode = 77;
  const password = 'password';
  const logger = new Logger('AgentServerTest', LogLevel.WARN, [
    new StreamHandler(),
  ]);

  describe('Agent start, status and stop', () => {
    let dataDir: string;
    let foregroundNodePath: string;
    let backgroundNodePath: string;

    let inactiveNodePath: string;
    let activeNodePath: string;
    let activeNode: PolykeyAgent;
    let passwordFile: string;

    beforeAll(async () => {
      dataDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'polykey-test-'),
      );
      passwordFile = path.join(dataDir, 'passwordFile');
      foregroundNodePath = path.join(dataDir, 'foreground');
      backgroundNodePath = path.join(dataDir, 'background');
      activeNodePath = path.join(dataDir, 'foregroundActive');
      inactiveNodePath = path.join(dataDir, 'inactiveNode');

      await fs.promises.writeFile(passwordFile, password);
      const logger = new Logger('Agent Test', LogLevel.WARN, [
        new StreamHandler(),
      ]);

      activeNode = await PolykeyAgent.createPolykey({
        password,
        nodePath: activeNodePath,
        logger,
      });
      await activeNode.start({});
    });
    afterAll(async () => {
      await activeNode.stop();
      await activeNode.destroy();
      await fs.promises.rm(dataDir, {
        force: true,
        recursive: true,
      });
    });
    describe('Starting the agent in the foreground', () => {
      test(
        'should start the agent and clean up the lockfile when a kill signal is received',
        async () => {
          const agent = testUtils.cli(
            [
              'agent',
              'start',
              '-np',
              foregroundNodePath,
              '--password-file',
              passwordFile,
            ],
            '.',
          );

          await poll(global.polykeyStartupTimeout * 1.5, async () => {
            return await agentUtils.checkAgentRunning(foregroundNodePath);
          });

          const result5 = await testUtils.cli(
            ['agent', 'status', '-np', foregroundNodePath],
            '.',
          );
          expect(result5.code).toBe(0);
          expect(result5.stdout).toContain('online');

          //Kill externally.
          const lock = await Lockfile.parseLock(
            fs,
            path.join(foregroundNodePath, 'agent-lock.json'),
          );
          process.kill(lock.pid);
          await agent; //Waiting for agent to finish running.
          await poll(global.polykeyStartupTimeout, async () => {
            const test = await agentUtils.checkAgentRunning(foregroundNodePath);
            return !test;
          });

          await poll(global.polykeyStartupTimeout, async () => {
            const files = await fs.promises.readdir(foregroundNodePath);
            const test = files.includes('agent-lock.json');
            return !test;
          });
        },
        global.polykeyStartupTimeout * 5,
      );
      test('should fail to start if an agent is already running at the path', async () => {
        //Can't await this, it never completes while running.
        const result = await testUtils.pkWithStdio([
          'agent',
          'start',
          '-np',
          activeNodePath,
          '--password-file',
          passwordFile,
        ]);

        expect(result.code).toBe(1);
      });
    });
    describe('Starting the agent in the background', () => {
      test(
        'should start the agent and clean up the lockfile when a kill signal is received',
        async () => {
          const commands = [
            'agent',
            'start',
            '-b',
            '-np',
            backgroundNodePath,
            '--password-file',
            passwordFile,
          ];

          // We can await this since it should finish after spawning the background agent.
          const result = await testUtils.pkWithStdio(commands);
          expect(result.code).toBe(0);

          await poll(global.polykeyStartupTimeout * 1.5, async () => {
            return await agentUtils.checkAgentRunning(backgroundNodePath);
          });

          const lock = await Lockfile.parseLock(
            fs,
            path.join(backgroundNodePath, 'agent-lock.json'),
          );
          process.kill(lock.pid);
          await poll(global.polykeyStartupTimeout, async () => {
            const test = await agentUtils.checkAgentRunning(backgroundNodePath);
            return !test;
          });

          //Checking that the lockfile was removed.
          await poll(global.polykeyStartupTimeout, async () => {
            const files = await fs.promises.readdir(foregroundNodePath);
            const test = files.includes('agent-lock.json');
            return !test;
          });
        },
        global.polykeyStartupTimeout * 5,
      );
      test('Should fail to start if an agent is already running at the path', async () => {
        const commands = [
          'agent',
          'start',
          '-b',
          '-np',
          activeNodePath,
          '--password-file',
          passwordFile,
        ];
        // We can await this since it should finish after spawning the background agent.
        const result = await testUtils.pkWithStdio(commands);
        expect(result.code).toBe(1);
      });
    });

    describe('getting agent status', () => {
      test('should get the status of an online agent', async () => {
        const result = await testUtils.pkWithStdio([
          'agent',
          'status',
          '-np',
          activeNodePath,
        ]);
        expect(result.code).toBe(0);
        expect(result.stdout).toContain('online');
      });
      test('should get the status of an offline agent', async () => {
        const result = await testUtils.pkWithStdio([
          'agent',
          'status',
          '-np',
          inactiveNodePath,
        ]);
        expect(result.code).toBe(0);
        expect(result.stdout).toContain('offline');
      });
      // How should we handle the case of a path not being a keynode?
      test.todo('should fail to get the status of an non-existent agent');
    });
    describe('Stopping the agent.', () => {
      test('should fail to stop if agent not running', async () => {
        // Stopping the agent.
        const result = await testUtils.pkWithStdio([
          'agent',
          'stop',
          '-np',
          inactiveNodePath,
        ]);
        expect(result.code).toBe(64);
      });
      test('should fail to stop if session is not started', async () => {
        const result = await testUtils.pkWithStdio([
          'agent',
          'stop',
          '-np',
          activeNodePath,
        ]);
        expect(result.code).toBe(noJWTFailCode);
      });
      test('should clean up the lockfile and stop', async () => {
        // Starting session
        await testUtils.pkWithStdio([
          'agent',
          'unlock',
          '-np',
          activeNodePath,
          '--password-file',
          passwordFile,
        ]);

        // Stopping the agent.
        const result = await testUtils.pkWithStdio([
          'agent',
          'stop',
          '-np',
          activeNodePath,
        ]);
        expect(result.code).toBe(0);
        await utils.sleep(2000);
        expect(await agentUtils.checkAgentRunning(activeNodePath)).toBeFalsy();
        const files = await fs.promises.readdir(activeNodePath);
        expect(files.includes('agent-lock.json')).toBeFalsy();
      });
    });
  });
  describe('Agent Sessions', () => {
    let dataDir: string;
    let passwordFile: string;
    let activeAgentPath: string;
    let inactiveAgentPath: string;
    let activeAgent: PolykeyAgent;

    beforeAll(async () => {
      dataDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'polykey-test-'),
      );
      passwordFile = path.join(dataDir, 'passwordFile');
      activeAgentPath = path.join(dataDir, 'ActiveAgent');
      inactiveAgentPath = path.join(dataDir, 'InactiveAgent');
      await fs.promises.writeFile(passwordFile, password);

      activeAgent = await PolykeyAgent.createPolykey({
        password,
        nodePath: activeAgentPath,
        logger: logger,
      });
      await activeAgent.start({});
    }, global.polykeyStartupTimeout);
    afterAll(async () => {
      await activeAgent.stop();
      await activeAgent.destroy();
      await fs.promises.rm(dataDir, {
        force: true,
        recursive: true,
      });
    });

    describe('Sessions should', () => {
      afterEach(async () => {
        await testUtils.pkWithStdio(['agent', 'lock', '-np', activeAgentPath]);
      });

      test('fail to unlock session if agent is not running', async () => {
        const result = await testUtils.pkWithStdio([
          'agent',
          'unlock',
          '-np',
          inactiveAgentPath,
          '--password-file',
          passwordFile,
        ]);
        expect(result.code).toBe(64);
      });
      test('provide the token to the client and store the token', async () => {
        const result = await testUtils.pkWithStdio([
          'agent',
          'unlock',
          '-np',
          activeAgentPath,
          '--password-file',
          passwordFile,
        ]);
        expect(result.code).toBe(0);

        const content = await fs.promises.readFile(
          path.join(activeAgentPath, 'client', 'token'),
          { encoding: 'utf-8' },
        );

        const verify = await activeAgent.sessions.verifyToken(
          content as SessionToken,
        );
        expect(verify).toBeTruthy();
      });
      test('fail to lock session if agent is not running', async () => {
        const result = await testUtils.pkWithStdio([
          'agent',
          'lock',
          '-np',
          inactiveAgentPath,
        ]);
        expect(result.code).toBe(64);
      });
      test('remove the token from the client and delete the token when locking session', async () => {
        const result = await testUtils.pkWithStdio([
          'agent',
          'lock',
          '-np',
          activeAgentPath,
        ]);
        expect(result.code).toBe(0);

        const content = await fs.promises.readFile(
          path.join(activeAgentPath, 'client', 'token'),
          { encoding: 'utf-8' },
        );

        await expect(
          activeAgent.sessions.verifyToken(content as SessionToken),
        ).rejects.toThrow(sessionErrors.ErrorSessionTokenInvalid);
      });
      test('fail to lock all sessions if agent not running', async () => {
        const result = await testUtils.pkWithStdio([
          'agent',
          'lockall',
          '-np',
          inactiveAgentPath,
        ]);
        expect(result.code).toBe(64);
      });
      test('fail to lock all sessions if session has not been unlocked', async () => {
        const result = await testUtils.pkWithStdio([
          'agent',
          'lockall',
          '-np',
          activeAgentPath,
          '--password-file',
          passwordFile,
        ]);
        expect(result.code).toBe(noJWTFailCode);
      });
      test('cause old sessions to fail when locking all sessions', async () => {
        const token = await activeAgent.sessions.generateToken();

        await testUtils.pkWithStdio([
          'agent',
          'unlock',
          '-np',
          activeAgentPath,
          '--password-file',
          passwordFile,
        ]);

        const result = await testUtils.pkWithStdio([
          'agent',
          'lockall',
          '-np',
          activeAgentPath,
          '--password-file',
          passwordFile,
        ]);
        expect(result.code).toBe(0);

        await expect(activeAgent.sessions.verifyToken(token)).rejects.toThrow(
          sessionErrors.ErrorSessionTokenInvalid,
        );
      });
    });
    describe('Bin commands should fail when session is locked.', () => {
      let dummyPath: string;
      const agentCommands = ['agent stop'];
      const identitiesCommands = [
        'identities allow nodeId notify',
        'identities disallow nodeId notify',
        'identities perms nodeId',
        'identities trust nodeId',
        'identities untrust nodeId',
        'identities claim providerId identityId',
        'identities authenticate providerId identityId',
        'identities get nodeId',
        'identities list',
        'identities search providerId',
      ];
      const keysCommands = [
        'keys certchain',
        'keys cert',
        'keys root',
        'keys encrypt -fp filePath', //Fix this, filePath needs to be valid.
        'keys decrypt -fp filePath',
        'keys sign -fp filePath',
        'keys verify -fp filePath -sp sigPath',
        'keys renew -pp passPath',
        'keys reset -pp passPath',
        'keys password -pp passPath',
      ];
      const nodesCommands = [
        'node ping nodeId',
        'node find nodeId',
        'node add nodeId 0.0.0.0 55555',
      ];
      const notificationCommands = [
        'notifications clear',
        'notifications read',
        'notifications send nodeId msg1',
      ];
      const secretsCommands = [
        'secrets create -sp vaultName:secretPath -fp filePath',
        'secrets rm -sp vaultName:secretPath',
        'secrets get -sp vaultName:secretPath',
        'secrets ls -vn vaultName',
        'secrets mkdir -sp vaultName:secretPath',
        'secrets rename -sp vaultName:secretPath -sn secretName',
        'secrets update -sp vaultName:secretPath -fp secretPath',
        'secrets dir -vn vaultName -dp directory',
      ];
      const vaultCommands = [
        'vaults list',
        'vaults create -vn vaultName',
        'vaults rename -vn vaultName -nn vaultName',
        'vaults delete -vn vaultName',
        'vaults stat -vn vaultName',
        'vaults share vaultName nodeId',
        'vaults unshare vaultName nodeId',
        'vaults perms vaultName',
        'vaults clone -ni nodeId -vi vaultId',
        'vaults pull -vn vaultName -ni nodeId',
        'vaults scan -ni nodeId',
      ];

      const commands = [
        ['Agent', agentCommands],
        ['Identity', identitiesCommands],
        ['Key', keysCommands],
        ['Node', nodesCommands],
        ['Notification', notificationCommands],
        ['Secret', secretsCommands],
        ['Vault', vaultCommands],
      ];

      const dummyNodeId = 'A'.repeat(44);
      function generateCommand(commandString: string) {
        const command = commandString
          .replace(/filePath/g, dummyPath)
          .replace(/sigPath/g, dummyPath)
          .replace(/passPath/g, dummyPath)
          .replace(/secretPath/g, dummyPath)
          .replace(/nodeId/g, dummyNodeId)
          .split(' ');
        const nodePath = ['-np', activeAgentPath];
        return [...command, ...nodePath];
      }

      describe.each(commands)('%s commands', (name, commands) => {
        beforeAll(async () => {
          await testUtils.pkWithStdio([
            'agent',
            'lock',
            '-np',
            activeAgentPath,
          ]);
          dummyPath = path.join(dataDir, 'dummy');
          await fs.promises.writeFile(dummyPath, 'dummy');
        });
        test.each([...commands])('%p', async (commandString) => {
          const command = generateCommand(commandString);
          const result = await testUtils.pkWithStdio(command);
          expect(result.code).toBe(noJWTFailCode);
        });
      });
    });
  });
});
