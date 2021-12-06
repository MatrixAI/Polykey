import type { RecoveryCode } from '@/keys/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { Status, errors as statusErrors } from '@/status';
import * as binUtils from '@/bin/utils';
import config from '@/config';
import * as testUtils from '../utils';

describe('start', () => {
  const logger = new Logger('start test', LogLevel.WARN, [new StreamHandler()]);
  let dataDir: string;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
  });
  afterEach(async () => {
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test(
    'start in foreground with parameters',
    async () => {
      const password = 'abc123';
      const passwordPath = path.join(dataDir, 'password');
      await fs.promises.writeFile(passwordPath, password);
      const agentProcess = await testUtils.pkSpawn(
        [
          'agent',
          'start',
          '--node-path',
          path.join(dataDir, 'polykey'),
          '--password-file',
          passwordPath,
          '--root-key-pair-bits',
          '1024',
          '--verbose',
        ],
        undefined,
        dataDir,
        logger,
      );
      const rlOut = readline.createInterface(agentProcess.stdout!);
      const recoveryCode = await new Promise<RecoveryCode>(
        (resolve, reject) => {
          rlOut.once('line', resolve);
          rlOut.once('close', reject);
        },
      );
      expect(typeof recoveryCode).toBe('string');
      expect(
        recoveryCode.split(' ').length === 12 ||
          recoveryCode.split(' ').length === 24,
      ).toBe(true);
      agentProcess.kill('SIGTERM');
      const [exitCode, signal] = await new Promise<
        [number | null, NodeJS.Signals | null]
      >((resolve) => {
        agentProcess.once('exit', (code, signal) => {
          resolve([code, signal]);
        });
      });
      expect(exitCode).toBe(null);
      expect(signal).toBe('SIGTERM');
    },
    global.defaultTimeout * 2,
  );
  test(
    'start in foreground with environment variables',
    async () => {
      const password = 'abc123';
      const agentProcess = await testUtils.pkSpawn(
        ['agent', 'start', '--root-key-pair-bits', '1024', '--verbose'],
        {
          PK_NODE_PATH: path.join(dataDir, 'polykey'),
          PK_PASSWORD: password,
        },
        dataDir,
        logger,
      );
      const rlOut = readline.createInterface(agentProcess.stdout!);
      const recoveryCode = await new Promise<RecoveryCode>(
        (resolve, reject) => {
          rlOut.once('line', resolve);
          rlOut.once('close', reject);
        },
      );
      expect(typeof recoveryCode).toBe('string');
      expect(
        recoveryCode.split(' ').length === 12 ||
          recoveryCode.split(' ').length === 24,
      ).toBe(true);
      agentProcess.kill('SIGTERM');
      const [exitCode, signal] = await new Promise<
        [number | null, NodeJS.Signals | null]
      >((resolve) => {
        agentProcess.once('exit', (code, signal) => {
          resolve([code, signal]);
        });
      });
      expect(exitCode).toBe(null);
      expect(signal).toBe('SIGTERM');
    },
    global.defaultTimeout * 2,
  );
  test(
    'start in background with environment variables',
    async () => {
      const password = 'abc123';
      const agentProcess = await testUtils.pkSpawn(
        [
          'agent',
          'start',
          '--root-key-pair-bits',
          '1024',
          '--background',
          '--background-out-file',
          path.join(dataDir, 'out.log'),
          '--background-err-file',
          path.join(dataDir, 'err.log'),
          '--verbose',
        ],
        {
          PK_NODE_PATH: path.join(dataDir, 'polykey'),
          PK_PASSWORD: password,
        },
        dataDir,
        logger,
      );
      const agentProcessExit = new Promise<void>((resolve, reject) => {
        agentProcess.on('exit', (code, signal) => {
          if (code === 0) {
            resolve();
          } else {
            reject(
              new Error(
                `Agent process exited with code: ${code} and signal: ${signal}`,
              ),
            );
          }
        });
      });
      const rlOut = readline.createInterface(agentProcess.stdout!);
      const recoveryCode = await new Promise<RecoveryCode>(
        (resolve, reject) => {
          rlOut.once('line', resolve);
          rlOut.once('close', reject);
        },
      );
      expect(typeof recoveryCode).toBe('string');
      expect(
        recoveryCode.split(' ').length === 12 ||
          recoveryCode.split(' ').length === 24,
      ).toBe(true);
      await agentProcessExit;
      // Make sure that the daemon does output the recovery code
      // The recovery code was already written out on agentProcess
      const polykeyAgentOut = await fs.promises.readFile(
        path.join(dataDir, 'out.log'),
        'utf-8',
      );
      expect(polykeyAgentOut).toHaveLength(0);
      const status = new Status({
        statusPath: path.join(dataDir, 'polykey', config.defaults.statusBase),
        fs,
        logger,
      });
      const statusInfo1 = (await status.readStatus())!;
      expect(statusInfo1).toBeDefined();
      expect(statusInfo1.status).toBe('LIVE');
      process.kill(statusInfo1.data.pid, 'SIGTERM');
      const statusInfo2 = await status.waitFor('DEAD');
      expect(statusInfo2.status).toBe('DEAD');
    },
    global.defaultTimeout * 2,
  );
  test(
    'concurrent starts are coalesced',
    async () => {
      const password = 'abc123';
      // One of these processes is blocked
      const [agentProcess1, agentProcess2] = await Promise.all([
        testUtils.pkSpawn(
          ['agent', 'start', '--root-key-pair-bits', '1024', '--verbose'],
          {
            PK_NODE_PATH: path.join(dataDir, 'polykey'),
            PK_PASSWORD: password,
          },
          dataDir,
          logger.getChild('agentProcess1'),
        ),
        testUtils.pkSpawn(
          ['agent', 'start', '--root-key-pair-bits', '1024', '--verbose'],
          {
            PK_NODE_PATH: path.join(dataDir, 'polykey'),
            PK_PASSWORD: password,
          },
          dataDir,
          logger.getChild('agentProcess2'),
        ),
      ]);
      // These will be the last line of STDERR
      // The readline library will automatically trim off newlines
      let stdErrLine1;
      let stdErrLine2;
      const rlErr1 = readline.createInterface(agentProcess1.stderr!);
      const rlErr2 = readline.createInterface(agentProcess2.stderr!);
      rlErr1.on('line', (l) => {
        stdErrLine1 = l;
      });
      rlErr2.on('line', (l) => {
        stdErrLine2 = l;
      });
      const [index, exitCode, signal] = await new Promise<
        [number, number | null, NodeJS.Signals | null]
      >((resolve) => {
        agentProcess1.once('exit', (code, signal) => {
          resolve([0, code, signal]);
        });
        agentProcess2.once('exit', (code, signal) => {
          resolve([1, code, signal]);
        });
      });
      const errorStatusLocked = new statusErrors.ErrorStatusLocked();
      expect(exitCode).toBe(errorStatusLocked.exitCode);
      expect(signal).toBe(null);
      const eOutput = binUtils
        .outputFormatter({
          type: 'error',
          name: errorStatusLocked.name,
          description: errorStatusLocked.description,
          message: errorStatusLocked.message,
        })
        .trim();
      // It's either the first or second process
      if (index === 0) {
        expect(stdErrLine1).toBeDefined();
        expect(stdErrLine1).toBe(eOutput);
        agentProcess2.kill('SIGTERM');
        const [exitCode, signal] = await new Promise<
          [number | null, NodeJS.Signals | null]
        >((resolve) => {
          agentProcess2.once('exit', (code, signal) => {
            resolve([code, signal]);
          });
        });
        expect(exitCode).toBe(null);
        expect(signal).toBe('SIGTERM');
      } else if (index === 1) {
        expect(stdErrLine2).toBeDefined();
        expect(stdErrLine2).toBe(eOutput);
        agentProcess1.kill('SIGTERM');
        const [exitCode, signal] = await new Promise<
          [number | null, NodeJS.Signals | null]
        >((resolve) => {
          agentProcess1.once('exit', (code, signal) => {
            resolve([code, signal]);
          });
        });
        expect(exitCode).toBe(null);
        expect(signal).toBe('SIGTERM');
      }
    },
    global.defaultTimeout * 2,
  );
  test(
    'concurrent bootstrap is coalesced',
    async () => {
      const password = 'abc123';
      // One of these processes is blocked
      const [agentProcess, bootstrapProcess] = await Promise.all([
        testUtils.pkSpawn(
          ['agent', 'start', '--root-key-pair-bits', '1024', '--verbose'],
          {
            PK_NODE_PATH: path.join(dataDir, 'polykey'),
            PK_PASSWORD: password,
          },
          dataDir,
          logger.getChild('agentProcess'),
        ),
        testUtils.pkSpawn(
          ['bootstrap', '--root-key-pair-bits', '1024', '--verbose'],
          {
            PK_NODE_PATH: path.join(dataDir, 'polykey'),
            PK_PASSWORD: password,
          },
          dataDir,
          logger.getChild('bootstrapProcess'),
        ),
      ]);
      // These will be the last line of STDERR
      // The readline library will automatically trim off newlines
      let stdErrLine1;
      let stdErrLine2;
      const rlErr1 = readline.createInterface(agentProcess.stderr!);
      const rlErr2 = readline.createInterface(bootstrapProcess.stderr!);
      rlErr1.on('line', (l) => {
        stdErrLine1 = l;
      });
      rlErr2.on('line', (l) => {
        stdErrLine2 = l;
      });
      const [index, exitCode, signal] = await new Promise<
        [number, number | null, NodeJS.Signals | null]
      >((resolve) => {
        agentProcess.once('exit', (code, signal) => {
          resolve([0, code, signal]);
        });
        bootstrapProcess.once('exit', (code, signal) => {
          resolve([1, code, signal]);
        });
      });
      const errorStatusLocked = new statusErrors.ErrorStatusLocked();
      expect(exitCode).toBe(errorStatusLocked.exitCode);
      expect(signal).toBe(null);
      const eOutput = binUtils
        .outputFormatter({
          type: 'error',
          name: errorStatusLocked.name,
          description: errorStatusLocked.description,
          message: errorStatusLocked.message,
        })
        .trim();

      // It's either the first or second process
      if (index === 0) {
        expect(stdErrLine1).toBeDefined();
        expect(stdErrLine1).toBe(eOutput);
        bootstrapProcess.kill('SIGTERM');
        const [exitCode, signal] = await new Promise<
          [number | null, NodeJS.Signals | null]
        >((resolve) => {
          bootstrapProcess.once('exit', (code, signal) => {
            resolve([code, signal]);
          });
        });
        expect(exitCode).toBe(null);
        expect(signal).toBe('SIGTERM');
      } else if (index === 1) {
        expect(stdErrLine2).toBeDefined();
        expect(stdErrLine2).toBe(eOutput);
        agentProcess.kill('SIGTERM');
        const [exitCode, signal] = await new Promise<
          [number | null, NodeJS.Signals | null]
        >((resolve) => {
          agentProcess.once('exit', (code, signal) => {
            resolve([code, signal]);
          });
        });
        expect(exitCode).toBe(null);
        expect(signal).toBe('SIGTERM');
      }
    },
    global.defaultTimeout * 2,
  );
});
