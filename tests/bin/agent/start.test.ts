import type { RecoveryCode } from '@/keys/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
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
    global.defaultTimeout * 4,
  );
});
