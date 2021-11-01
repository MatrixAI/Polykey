// TODO: refactor into command-specific tests

// import type { SessionToken } from '@/sessions/types';
// import os from 'os';
// import path from 'path';
// import fs from 'fs';
// import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
// import PolykeyAgent from '@/PolykeyAgent';
// import { Status } from '@/status';
// import { makeNodeId } from '@/nodes/utils';
// import { sleep } from '@/utils';
// import * as testUtils from './utils';

// jest.mock('@/keys/utils', () => ({
//   ...jest.requireActual('@/keys/utils'),
//   generateDeterministicKeyPair:
//     jest.requireActual('@/keys/utils').generateKeyPair,
// }));

// describe('CLI agent', () => {
//   const noJWTFailCode = 77;
//   const password = 'password';
//   const logger = new Logger('AgentServerTest', LogLevel.WARN, [
//     new StreamHandler(),
//   ]);
//   const waitForTimeout = global.polykeyStartupTimeout * 2;

//   async function killAgent(nodePath: string, passwordFile: string) {
//     await testUtils.pkStdio(
//       ['agent', 'stop', '-np', nodePath, '--password-file', passwordFile],
//       {},
//       '.',
//     );
//   }

//   const statusPath = (nodePath: string): string =>
//     path.join(nodePath, 'status.json');

//   describe('Agent start, status and stop', () => {
//     let dataDir: string;
//     let foregroundNodePath: string;
//     let backgroundNodePath: string;

//     let inactiveNodePath: string;
//     let activeNodePath: string;
//     let activeNode: PolykeyAgent;
//     let passwordFile: string;

//     beforeAll(async () => {
//       dataDir = await fs.promises.mkdtemp(
//         path.join(os.tmpdir(), 'polykey-test-'),
//       );
//       passwordFile = path.join(dataDir, 'passwordFile');
//       foregroundNodePath = path.join(dataDir, 'foreground');
//       backgroundNodePath = path.join(dataDir, 'background');
//       activeNodePath = path.join(dataDir, 'foregroundActive');
//       inactiveNodePath = path.join(dataDir, 'inactiveNode');

//       await fs.promises.writeFile(passwordFile, password);
//       const logger = new Logger('Agent Test', LogLevel.WARN, [
//         new StreamHandler(),
//       ]);

//       activeNode = await PolykeyAgent.createPolykeyAgent({
//         password,
//         nodePath: activeNodePath,
//         logger,
//       });
//     }, global.defaultTimeout * 2);
//     afterAll(async () => {
//       await activeNode.stop();
//       await activeNode.destroy();
//       await fs.promises.rm(dataDir, {
//         force: true,
//         recursive: true,
//       });
//     });
//     describe('Starting the agent in the foreground', () => {
//       test(
//         'should start the agent and clean up the lockfile when a kill signal is received',
//         async () => {
//           const agent = testUtils.pkExec([
//             'agent',
//             'start',
//             '-np',
//             foregroundNodePath,
//             '--password-file',
//             passwordFile,
//           ]);
//           const status = new Status({
//             statusPath: statusPath(foregroundNodePath),
//             fs,
//             logger,
//           });
//           await status.waitFor('LIVE', waitForTimeout);

//           // Kill.
//           await killAgent(foregroundNodePath, passwordFile);

//           const agentResult = await agent; // Waiting for agent to finish running.
//           await status.waitFor('DEAD', waitForTimeout);

//           expect(agentResult.stdout.split(' ')).toHaveLength(24);
//         },
//         global.polykeyStartupTimeout * 4,
//       );
//       test(
//         'should start with port and host information as flags',
//         async () => {
//           const agent = testUtils.pkStdio([
//             'agent',
//             'start',
//             '-np',
//             foregroundNodePath,
//             '--password-file',
//             passwordFile,
//             '-ch',
//             '127.0.0.1',
//             '-cp',
//             '55556',
//             '-ih',
//             '127.0.0.2',
//             '127.0.0.3',
//             '-ip',
//             '55555',
//           ]);
//           const status = new Status({
//             statusPath: statusPath(foregroundNodePath),
//             fs,
//             logger,
//           });
//           const statusConfig = await status.waitFor('LIVE', waitForTimeout);
//           expect(statusConfig.data.clientHost).toEqual('127.0.0.1');
//           expect(statusConfig.data.clientPort).toEqual(55556);

//           // Kill externally.
//           await killAgent(foregroundNodePath, passwordFile);
//           await agent; // Waiting for agent to finish running.
//           await status.waitFor('DEAD', waitForTimeout);
//         },
//         global.polykeyStartupTimeout * 4,
//       );
//       test(
//         'should start with port and host information from env',
//         async () => {
//           const agent = testUtils.pkExec(
//             [
//               'agent',
//               'start',
//               '-np',
//               foregroundNodePath,
//               '--password-file',
//               passwordFile,
//             ],
//             {
//               PK_CLIENT_HOST: '127.0.0.1',
//               PK_CLIENT_PORT: '55556',
//               PK_INGRESS_HOST: '127.0.0.2',
//               PK_INGRESS_PORT: '55555',
//             },
//           );

//           const status = new Status({
//             statusPath: statusPath(foregroundNodePath),
//             fs,
//             logger,
//           });
//           const statusConfig = await status.waitFor('LIVE', waitForTimeout);
//           expect(statusConfig.data.clientHost).toEqual('127.0.0.1');
//           expect(statusConfig.data.clientPort).toEqual(55556);

//           // Kill externally.
//           await killAgent(foregroundNodePath, passwordFile);
//           await agent; // Waiting for agent to finish running.
//           await status.waitFor('DEAD', waitForTimeout);
//         },
//         global.polykeyStartupTimeout * 4,
//       );
//       test('should fail to start if an agent is already running at the path', async () => {
//         const result = await testUtils.pkStdio([
//           'agent',
//           'start',
//           '-np',
//           activeNodePath,
//           '--password-file',
//           passwordFile,
//         ]);
//         expect(result.exitCode).toBe(75);
//       });
//     });
//     describe('Starting the agent in the background', () => {
//       test(
//         'should start the agent and clean up the lockfile when a kill signal is received',
//         async () => {
//           const commands = [
//             'agent',
//             'start',
//             '-b',
//             '-np',
//             backgroundNodePath,
//             '--password-file',
//             passwordFile,
//           ];

//           // We can await this since it should finish after spawning the background agent.
//           const result = await testUtils.pkStdio(commands);
//           expect(result.exitCode).toBe(0);

//           const status = new Status({
//             statusPath: statusPath(backgroundNodePath),
//             fs,
//             logger,
//           });
//           await status.waitFor('LIVE', waitForTimeout);

//           // Kill it (with fire) externally.
//           await killAgent(backgroundNodePath, passwordFile);
//           await sleep(100);
//           await status.waitFor('DEAD', waitForTimeout);

//           expect(result.stdout).toContain('This is your recovery code');
//           const code = result.stdout.split('\n')[3]; // Getting the recovery code line.
//           expect(code.split(' ')).toHaveLength(24);

//           // Checking that the status was removed. FIXME
//           // await poll(global.polykeyStartupTimeout * 2, async () => {
//           //   const files = await fs.promises.readdir(backgroundNodePath);
//           //   const test = files.includes('agent-status.json');
//           //   return !test;
//           // });
//         },
//         global.polykeyStartupTimeout * 5,
//       );
//       test('Should fail to start if an agent is already running at the path', async () => {
//         const commands = [
//           'agent',
//           'start',
//           '-b',
//           '-np',
//           activeNodePath,
//           '--password-file',
//           passwordFile,
//         ];
//         // We can await this since it should finish after spawning the background agent.
//         const result = await testUtils.pkStdio(commands);
//         expect(result.exitCode).toBe(75);
//       });
//     });
//     test(
//       'concurrent agent start',
//       async () => {
//         const nodePath = path.join(dataDir, 'third');
//         const commands = [
//           'agent',
//           'start',
//           '-np',
//           nodePath,
//           '--password-file',
//           passwordFile,
//         ];

//         // We can await this since it should finish after spawning the background agent.
//         const prom1 = testUtils.pkExec(commands);
//         const prom2 = testUtils.pkExec(commands);

//         const status = new Status({
//           statusPath: statusPath(nodePath),
//           fs,
//           logger,
//         });
//         await status.waitFor('LIVE', waitForTimeout);

//         // Kill externally.
//         const results = await Promise.all([prom1, prom2]); // Waiting for agent to finish running.
//         const resultsString = JSON.stringify(results);
//         expect(resultsString).toContain(':75');
//         expect(resultsString).toContain(':0');
//       },
//       global.defaultTimeout * 4,
//     );
//     test(
//       'concurrent agent start and bootstrap.',
//       async () => {
//         const nodePath = path.join(dataDir, 'third');
//         const command1 = [
//           'agent',
//           'start',
//           '-np',
//           nodePath,
//           '--password-file',
//           passwordFile,
//         ];
//         const command2 = [
//           'bootstrap',
//           '-np',
//           nodePath,
//           '--password-file',
//           passwordFile,
//         ];

//         // We can await this since it should finish after spawning the background agent.
//         const prom1 = testUtils.pkExec(command1);
//         const prom2 = testUtils.pkExec(command2);

//         const status = new Status({
//           statusPath: statusPath(nodePath),
//           fs,
//           logger,
//         });
//         try {
//           await status.waitFor('LIVE', 20000);
//         } catch (e) {
//           // Noop
//         }
//         // Kill externally.
//         await killAgent(nodePath, passwordFile);

//         const results = await Promise.all([prom1, prom2]); // Waiting for agent to finish running.
//         expect(results[0].exitCode).toBe(0);
//         expect(results[1].exitCode).toBe(64);
//       },
//       global.defaultTimeout * 5,
//     );

//     describe('getting agent status', () => {
//       test('should get the status of an online agent', async () => {
//         const result = await testUtils.pkStdio([
//           'agent',
//           'status',
//           '-np',
//           activeNodePath,
//           '--password-file',
//           passwordFile,
//         ]);
//         expect(result.exitCode).toBe(0);
//         expect(result.stdout).toContain('LIVE');
//       });
//       test(
//         'should get the status of an offline agent',
//         async () => {
//           const result = await testUtils.pkStdio([
//             'agent',
//             'status',
//             '-np',
//             inactiveNodePath,
//             '--password-file',
//             passwordFile,
//           ]);
//           expect(result.exitCode).toBe(0);
//           expect(result.stdout).toContain('DEAD');
//         },
//         global.failedConnectionTimeout,
//       );
//       // How should we handle the case of a path not being a keynode?
//       test.todo('should fail to get the status of an non-existent agent');
//     });
//     describe('Stopping the agent.', () => {
//       test('should fail to stop if agent not running', async () => {
//         // Stopping the agent.
//         const result = await testUtils.pkStdio([
//           'agent',
//           'stop',
//           '-np',
//           inactiveNodePath,
//         ]);
//         expect(result.exitCode).toBe(64);
//       });
//       test(
//         'should clean up the status and stop',
//         async () => {
//           // Starting session
//           await testUtils.pkStdio([
//             'agent',
//             'unlock',
//             '-np',
//             activeNodePath,
//             '--password-file',
//             passwordFile,
//           ]);

//           const status = new Status({
//             statusPath: statusPath(activeNodePath),
//             fs,
//             logger,
//           });
//           await status.waitFor('LIVE', waitForTimeout);

//           // Stopping the agent.
//           const result = await testUtils.pkStdio([
//             'agent',
//             'stop',
//             '-np',
//             activeNodePath,
//           ]);
//           expect(result.exitCode).toBe(0);
//           await sleep(100);
//           await status.waitFor('DEAD', waitForTimeout);

//           // Checking that the lockfile was removed.
//           // FIXME: this is failing to be removed. seems like the stopping procedure isn't completing properly.
//           // await poll(global.polykeyStartupTimeout * 2, async () => {
//           //   const files = await fs.promises.readdir(backgroundNodePath);
//           //   const test = files.includes('agent-lock.json');
//           //   return !test;
//           // })
//         },
//         global.polykeyStartupTimeout * 6,
//       );
//     });
//   });
//   describe('Agent Sessions', () => {
//     let dataDir: string;
//     let passwordFile: string;
//     let activeAgentPath: string;
//     let inactiveAgentPath: string;
//     let activeAgent: PolykeyAgent;

//     beforeAll(async () => {
//       dataDir = await fs.promises.mkdtemp(
//         path.join(os.tmpdir(), 'polykey-test-'),
//       );
//       passwordFile = path.join(dataDir, 'passwordFile');
//       activeAgentPath = path.join(dataDir, 'ActiveAgent');
//       inactiveAgentPath = path.join(dataDir, 'InactiveAgent');
//       await fs.promises.writeFile(passwordFile, password);

//       activeAgent = await PolykeyAgent.createPolykeyAgent({
//         password,
//         nodePath: activeAgentPath,
//         logger: logger,
//       });
//     }, global.polykeyStartupTimeout);
//     afterAll(async () => {
//       await activeAgent.stop();
//       await activeAgent.destroy();
//       await fs.promises.rm(dataDir, {
//         force: true,
//         recursive: true,
//       });
//     });

//     describe('Sessions should', () => {
//       afterEach(async () => {
//         await testUtils.pkStdio(['agent', 'lock', '-np', activeAgentPath]);
//       });

//       test('fail to unlock session if agent is not running', async () => {
//         const result = await testUtils.pkStdio([
//           'agent',
//           'unlock',
//           '-np',
//           inactiveAgentPath,
//           '--password-file',
//           passwordFile,
//         ]);
//         expect(result.exitCode).toBe(64);
//       });
//       test('provide the token to the client and store the token', async () => {
//         const result = await testUtils.pkStdio([
//           'agent',
//           'unlock',
//           '-np',
//           activeAgentPath,
//           '--password-file',
//           passwordFile,
//         ]);
//         expect(result.exitCode).toBe(0);

//         const content = await fs.promises.readFile(
//           path.join(activeAgentPath, 'token'),
//           { encoding: 'utf-8' },
//         );

//         const verify = await activeAgent.sessionManager.verifyToken(
//           content as SessionToken,
//         );
//         expect(verify).toBeTruthy();
//       });
//       test('remove the token from the client and delete the token when locking session', async () => {
//         const result = await testUtils.pkStdio([
//           'agent',
//           'lock',
//           '-np',
//           activeAgentPath,
//         ]);
//         expect(result.exitCode).toBe(0);

//         await expect(
//           fs.promises.readdir(path.join(activeAgentPath)),
//         ).resolves.not.toContain('token');
//       });
//       test('fail to lock all sessions if agent not running', async () => {
//         const result = await testUtils.pkStdio([
//           'agent',
//           'lockall',
//           '-np',
//           inactiveAgentPath,
//         ]);
//         expect(result.exitCode).toBe(64);
//       });
//       test('cause old sessions to fail when locking all sessions', async () => {
//         const token = await activeAgent.sessionManager.createToken();

//         await testUtils.pkStdio([
//           'agent',
//           'unlock',
//           '-np',
//           activeAgentPath,
//           '--password-file',
//           passwordFile,
//         ]);

//         const result = await testUtils.pkStdio([
//           'agent',
//           'lockall',
//           '-np',
//           activeAgentPath,
//           '--password-file',
//           passwordFile,
//         ]);
//         expect(result.exitCode).toBe(0);

//         await expect(
//           activeAgent.sessionManager.verifyToken(token),
//         ).resolves.toBeFalsy();
//       });
//     });
//     describe('Bin commands should retry with password when session is locked.', () => {
//       let dummyPath: string;
//       const identitiesCommands = [
//         'identities allow nodeId notify',
//         'identities disallow nodeId notify',
//         'identities perms nodeId',
//         'identities trust nodeId',
//         'identities untrust nodeId',
//         'identities claim providerId identityId',
//         'identities authenticate providerId identityId',
//         'identities get nodeId',
//         'identities list',
//         'identities search providerId',
//       ];
//       const keysCommands = [
//         'keys certchain',
//         'keys cert',
//         'keys root',
//         'keys encrypt -fp filePath', // Fix this, filePath needs to be valid.
//         'keys decrypt -fp filePath',
//         'keys sign -fp filePath',
//         'keys verify -fp filePath -sp sigPath',
//         'keys renew -pp passPath',
//         'keys reset -pp passPath',
//         'keys password -pp passPath',
//       ];
//       const nodesCommands = [
//         'node ping nodeId',
//         'node find nodeId',
//         'node claim nodeId',
//         'node add nodeId 0.0.0.0 55555',
//       ];
//       const notificationCommands = [
//         'notifications clear',
//         'notifications read',
//         'notifications send nodeId msg1',
//       ];
//       const secretsCommands = [
//         'secrets create -sp vaultName:secretPath -fp filePath',
//         'secrets rm -sp vaultName:secretPath',
//         'secrets get -sp vaultName:secretPath',
//         'secrets ls -vn vaultName',
//         'secrets mkdir vaultName:secretPath',
//         'secrets rename -sp vaultName:secretPath -sn secretName',
//         'secrets update -sp vaultName:secretPath -fp secretPath',
//         'secrets dir -vn vaultName -dp directory',
//       ];
//       const vaultCommands = [
//         'vaults list',
//         'vaults create -vn vaultName',
//         'vaults rename -vn vaultName -nn vaultName',
//         'vaults delete -vn vaultName',
//         'vaults stat -vn vaultName',
//         'vaults share vaultName nodeId',
//         'vaults unshare vaultName nodeId',
//         'vaults perms vaultName',
//         'vaults clone -ni nodeId -vi vaultId',
//         'vaults pull -vn vaultName -ni nodeId',
//         'vaults scan -ni nodeId',
//         'vaults version vaultName nodeId',
//         'vaults log vaultName',
//       ];

//       const commands = [
//         ['Identity', identitiesCommands],
//         ['Key', keysCommands],
//         ['Node', nodesCommands],
//         ['Notification', notificationCommands],
//         ['Secret', secretsCommands],
//         ['Vault', vaultCommands],
//       ];

//       const dummyVaultId = 'A'.repeat(44);
//       const dummyNodeId = makeNodeId(
//         'vi3et1hrpv2m2lrplcm7cu913kr45v51cak54vm68anlbvuf83ra0',
//       );
//       function generateCommand(commandString: string) {
//         const command = commandString
//           .replace(/filePath/g, dummyPath)
//           .replace(/sigPath/g, dummyPath)
//           .replace(/passPath/g, passwordFile)
//           .replace(/secretPath/g, dummyPath)
//           .replace(/nodeId/g, dummyNodeId)
//           .replace(/vaultId/g, dummyVaultId)
//           .split(' ');
//         const nodePath = ['-np', activeAgentPath];
//         return [...command, ...nodePath];
//       }

//       describe.each(commands)('%s commands', (name, commands) => {
//         beforeEach(async () => {
//           await testUtils.pkStdio(['agent', 'lock', '-np', activeAgentPath]);
//           dummyPath = path.join(dataDir, 'dummy');
//           await fs.promises.writeFile(dummyPath, 'dummy');
//         });
//         test.each([...commands])('%p', async (commandString) => {
//           const command = generateCommand(commandString);
//           const result = await testUtils.pkStdio(command, {
//             PK_PASSWORD: password,
//           });
//           expect(result.exitCode).not.toBe(noJWTFailCode);
//         });
//       });
//     });
//   });
// });
