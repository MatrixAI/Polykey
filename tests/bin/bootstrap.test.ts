import os from 'os';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { errors as statusErrors } from '@/status';
import { errors as bootstrapErrors } from '@/bootstrap';
import * as binUtils from '@/bin/utils';
import * as testBinUtils from './utils';

describe('bootstrap', () => {
  const logger = new Logger('bootstrap test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
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
    'bootstraps node state',
    async () => {
      const password = 'password';
      const passwordPath = path.join(dataDir, 'password');
      await fs.promises.writeFile(passwordPath, password);
      const { exitCode, stdout } = await testBinUtils.pkStdio(
        [
          'bootstrap',
          '--password-file',
          passwordPath,
          '--root-key-pair-bits',
          '1024',
          '--verbose',
        ],
        {
          PK_NODE_PATH: path.join(dataDir, 'polykey'),
        },
        dataDir,
      );
      expect(exitCode).toBe(0);
      const recoveryCode = stdout.trim();
      expect(
        recoveryCode.split(' ').length === 12 ||
          recoveryCode.split(' ').length === 24,
      ).toBe(true);
    },
    global.defaultTimeout,
  );
  test('bootstrapping occupied node state', async () => {
    const password = 'password';
    await fs.promises.mkdir(path.join(dataDir, 'polykey'));
    await fs.promises.writeFile(path.join(dataDir, 'polykey', 'test'), '');
    let exitCode, stdout, stderr;
    ({ exitCode, stdout, stderr } = await testBinUtils.pkStdio(
      [
        'bootstrap',
        '--node-path',
        path.join(dataDir, 'polykey'),
        '--root-key-pair-bits',
        '1024',
        '--verbose',
      ],
      {
        PK_PASSWORD: password,
      },
      dataDir,
    ));
    const errorBootstrapExistingState =
      new bootstrapErrors.ErrorBootstrapExistingState();
    expect(exitCode).toBe(errorBootstrapExistingState.exitCode);
    const stdErrLine = stderr.trim().split('\n').pop();
    const eOutput = binUtils
      .outputFormatter({
        type: 'error',
        name: errorBootstrapExistingState.name,
        description: errorBootstrapExistingState.description,
        message: errorBootstrapExistingState.message,
      })
      .trim();
    expect(stdErrLine).toBe(eOutput);
    ({ exitCode, stdout, stderr } = await testBinUtils.pkStdio(
      [
        'bootstrap',
        '--node-path',
        path.join(dataDir, 'polykey'),
        '--root-key-pair-bits',
        '1024',
        '--fresh',
        '--verbose',
      ],
      {
        PK_PASSWORD: password,
      },
      dataDir,
    ));
    expect(exitCode).toBe(0);
    const recoveryCode = stdout.trim();
    expect(
      recoveryCode.split(' ').length === 12 ||
        recoveryCode.split(' ').length === 24,
    ).toBe(true);
  });
  test('concurrent bootstrapping are coalesced', async () => {
    const password = 'password';
    const [bootstrapProcess1, bootstrapProcess2] = await Promise.all([
      testBinUtils.pkSpawn(
        ['bootstrap', '--root-key-pair-bits', '1024', '--verbose'],
        {
          PK_NODE_PATH: path.join(dataDir, 'polykey'),
          PK_PASSWORD: password,
        },
        dataDir,
        logger.getChild('bootstrapProcess1'),
      ),
      testBinUtils.pkSpawn(
        ['bootstrap', '--root-key-pair-bits', '1024', '--verbose'],
        {
          PK_NODE_PATH: path.join(dataDir, 'polykey'),
          PK_PASSWORD: password,
        },
        dataDir,
        logger.getChild('bootstrapProcess2'),
      ),
    ]);
    // These will be the last line of STDERR
    // The readline library will automatically trim off newlines
    let stdErrLine1;
    let stdErrLine2;
    const rlErr1 = readline.createInterface(bootstrapProcess1.stderr!);
    const rlErr2 = readline.createInterface(bootstrapProcess2.stderr!);
    rlErr1.on('line', (l) => {
      stdErrLine1 = l;
    });
    rlErr2.on('line', (l) => {
      stdErrLine2 = l;
    });
    const [index, exitCode, signal] = await new Promise<
      [number, number | null, NodeJS.Signals | null]
    >((resolve) => {
      bootstrapProcess1.once('exit', (code, signal) => {
        resolve([0, code, signal]);
      });
      bootstrapProcess2.once('exit', (code, signal) => {
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
      const [exitCode] = await testBinUtils.processExit(bootstrapProcess2);
      expect(exitCode).toBe(0);
    } else if (index === 1) {
      expect(stdErrLine2).toBeDefined();
      expect(stdErrLine2).toBe(eOutput);
      const [exitCode] = await testBinUtils.processExit(bootstrapProcess1);
      expect(exitCode).toBe(0);
    }
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
      const [exitCode, signal] = await testBinUtils.processExit(
        bootstrapProcess1,
      );
      expect(exitCode).toBe(null);
      expect(signal).toBe('SIGINT');
      // Attempting to bootstrap should fail with existing state
      const bootstrapProcess2 = await testBinUtils.pkStdio(
        ['bootstrap', '--root-key-pair-bits', '1024', '--verbose'],
        {
          PK_NODE_PATH: path.join(dataDir, 'polykey'),
          PK_PASSWORD: password,
        },
        dataDir,
      );
      const stdErrLine = bootstrapProcess2.stderr.trim().split('\n').pop();
      const errorBootstrapExistingState =
        new bootstrapErrors.ErrorBootstrapExistingState();
      expect(bootstrapProcess2.exitCode).toBe(
        errorBootstrapExistingState.exitCode,
      );
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
        dataDir,
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
