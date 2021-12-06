import type { RecoveryCode } from '@/keys/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { Status, errors as statusErrors } from '@/status';
import { errors as bootstrapErrors } from '@/bootstrap';
import * as binUtils from '@/bin/utils';
import config from '@/config';
import * as testBinUtils from './utils';

describe('bootstrap', () => {
  const logger = new Logger('bootstrap test', LogLevel.INFO, [new StreamHandler()]);
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
    'bootstrap when interrupted, requires fresh on next bootstrap',
    async () => {
      const password = 'password';
      const bootstrapProcess1 = await testBinUtils.pkSpawn(
        ['bootstrap', '--root-key-pair-bits', '1024', '--verbose'],
        {
          PK_NODE_PATH: path.join(dataDir, 'polykey'),
          PK_PASSWORD: password,
        },
        dataDir,
        logger.getChild('bootstrapProcess1'),
      );
      const rlErr = readline.createInterface(bootstrapProcess1.stderr!);
      // Interrupt when generating the root key pair
      await new Promise<void>((resolve, reject) => {
        rlErr.once('close', reject);
        rlErr.on('line', (l) => {
          // This line is brittle
          // It may change if the log format changes
          // Make sure to keep it updated at the exact point when the root key pair is generated
          if (l === 'INFO:KeyManager:Generating root key pair') {
            bootstrapProcess1.kill('SIGINT');
            resolve();
          }
        });
      });
      const [exitCode, signal] = await new Promise<
        [number | null, NodeJS.Signals | null]
      >((resolve) => {
        bootstrapProcess1.once('exit', (code, signal) => {
          resolve([code, signal]);
        });
      });
      expect(exitCode).toBe(null);
      expect(signal).toBe('SIGINT');
      // Attempting to bootstrap should fail with existing state
      const bootstrapProcess2 = await testBinUtils.pkStdio(
        ['bootstrap', '--root-key-pair-bits', '1024', '--verbose'],
        {
          PK_NODE_PATH: path.join(dataDir, 'polykey'),
          PK_PASSWORD: password,
        },
        dataDir
      );
      const stdErrLine = bootstrapProcess2.stderr.trim().split('\n').pop();
      const errorBootstrapExistingState = new bootstrapErrors.ErrorBootstrapExistingState();
      expect(bootstrapProcess2.exitCode).toBe(errorBootstrapExistingState.exitCode);
      const eOutput = binUtils
        .outputFormatter({
          type: 'error',
          name: errorBootstrapExistingState.name,
          description: errorBootstrapExistingState.description,
          message: errorBootstrapExistingState.message,
        })
        .trim();
      expect(stdErrLine).toBe(eOutput);
      // Attempting to bootstrap with --fresh should succeed
      const bootstrapProcess3 = await testBinUtils.pkStdio(
        ['bootstrap', '--root-key-pair-bits', '1024', '--fresh', '--verbose'],
        {
          PK_NODE_PATH: path.join(dataDir, 'polykey'),
          PK_PASSWORD: password,
        },
        dataDir
      );
      expect(bootstrapProcess3.exitCode).toBe(0);
      const recoveryCode = bootstrapProcess3.stdout.trim();
      expect(
        recoveryCode.split(' ').length === 12 ||
          recoveryCode.split(' ').length === 24,
      ).toBe(true);
    },
    global.defaultTimeout * 2,
  );
});
