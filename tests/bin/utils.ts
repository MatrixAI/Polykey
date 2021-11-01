import type { ChildProcess } from 'child_process';
import os from 'os';
import fs from 'fs';
import path from 'path';
import process from 'process';
import child_process from 'child_process';
import readline from 'readline';
import * as mockProcess from 'jest-mock-process';
import mockedEnv from 'mocked-env';
import nexpect from 'nexpect';
import Logger from '@matrixai/logger';
import main from '../../src/bin/polykey';

/**
 * Runs pk command functionally
 */
async function pk(args: Array<string>): Promise<any> {
  return main(['', '', ...args]);
}

/**
 * Runs pk command functionally with mocked STDIO
 * @param env Augments env for command execution
 * @param cwd Defaults to temporary directory
 */
async function pkStdio(
  args: Array<string> = [],
  env: Record<string, string | undefined> = {},
  cwd?: string,
): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  cwd =
    cwd ?? (await fs.promises.mkdtemp(path.join(os.tmpdir(), 'polykey-test-')));
  // Parse the arguments of process.stdout.write and process.stderr.write
  const parseArgs = (args) => {
    const data = args[0];
    if (typeof data === 'string') {
      return data;
    } else {
      let encoding: BufferEncoding = 'utf8';
      if (typeof args[1] === 'string') {
        encoding = args[1] as BufferEncoding;
      }
      const buffer = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
      return buffer.toString(encoding);
    }
  };
  // Process events are not allowed when testing
  const mockProcessOn = mockProcess.spyOnImplementing(
    process,
    'on',
    () => process,
  );
  const mockProcessOnce = mockProcess.spyOnImplementing(
    process,
    'once',
    () => process,
  );
  const mockProcessAddListener = mockProcess.spyOnImplementing(
    process,
    'addListener',
    () => process,
  );
  const mockProcessOff = mockProcess.spyOnImplementing(
    process,
    'off',
    () => process,
  );
  const mockProcessRemoveListener = mockProcess.spyOnImplementing(
    process,
    'removeListener',
    () => process,
  );
  const mockCwd = mockProcess.spyOnImplementing(process, 'cwd', () => cwd!);
  const envRestore = mockedEnv(env);
  const mockedStdout = mockProcess.mockProcessStdout();
  const mockedStderr = mockProcess.mockProcessStderr();
  const exitCode = await pk(args);
  // Calls is an array of parameter arrays
  // Only the first parameter is the string written
  const stdout = mockedStdout.mock.calls.map(parseArgs).join('');
  const stderr = mockedStderr.mock.calls.map(parseArgs).join('');
  mockedStderr.mockRestore();
  mockedStdout.mockRestore();
  envRestore();
  mockCwd.mockRestore();
  mockProcessRemoveListener.mockRestore();
  mockProcessOff.mockRestore();
  mockProcessAddListener.mockRestore();
  mockProcessOnce.mockRestore();
  mockProcessOn.mockRestore();
  return {
    exitCode,
    stdout,
    stderr,
  };
}

/**
 * Runs pk command through subprocess
 * This is used when a subprocess functionality needs to be used
 * This is intended for terminating subprocesses
 * @param env Augments env for command execution
 * @param cwd Defaults to temporary directory
 */
async function pkExec(
  args: Array<string> = [],
  env: Record<string, string | undefined> = {},
  cwd?: string,
): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  cwd =
    cwd ?? (await fs.promises.mkdtemp(path.join(os.tmpdir(), 'polykey-test-')));
  env = { ...process.env, ...env };
  const tsConfigPath = path.resolve(
    path.join(global.projectDir, 'tsconfig.json'),
  );
  const tsConfigPathsRegisterPath = path.resolve(
    path.join(global.projectDir, 'node_modules/tsconfig-paths/register'),
  );
  const polykeyPath = path.resolve(
    path.join(global.projectDir, 'src/bin/polykey.ts'),
  );
  return new Promise((resolve, reject) => {
    child_process.exec(
      `\
      ts-node \
      --project ${tsConfigPath} \
      --require ${tsConfigPathsRegisterPath} \
      --transpile-only \
      ${polykeyPath} \
      ${args.join(' ')}\
      `,
      {
        env,
        cwd,
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        if (error != null && error.code === undefined) {
          // This can only happen when the command is killed
          return reject(error);
        } else {
          // Success and Unsuccessful exits are valid here
          return resolve({
            exitCode: error && error.code != null ? error.code : 0,
            stdout,
            stderr,
          });
        }
      },
    );
  });
}

/**
 * Launch pk command through subprocess
 * This is used when a subprocess functionality needs to be used
 * This is intended for non-terminating subprocesses
 * @param env Augments env for command execution
 * @param cwd Defaults to temporary directory
 */
async function pkSpawn(
  args: Array<string> = [],
  env: Record<string, string | undefined> = {},
  cwd?: string,
  logger: Logger = new Logger(pkSpawn.name),
): Promise<ChildProcess> {
  cwd =
    cwd ?? (await fs.promises.mkdtemp(path.join(os.tmpdir(), 'polykey-test-')));
  env = { ...process.env, ...env };
  const tsConfigPath = path.resolve(
    path.join(global.projectDir, 'tsconfig.json'),
  );
  const tsConfigPathsRegisterPath = path.resolve(
    path.join(global.projectDir, 'node_modules/tsconfig-paths/register'),
  );
  const polykeyPath = path.resolve(
    path.join(global.projectDir, 'src/bin/polykey.ts'),
  );
  const subprocess = child_process.spawn(
    'ts-node',
    [
      '--project',
      tsConfigPath,
      '--require',
      tsConfigPathsRegisterPath,
      '--transpile-only',
      polykeyPath,
      ...args,
    ],
    {
      env,
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    },
  );
  const rlErr = readline.createInterface(subprocess.stderr!);
  rlErr.on('line', (l) => {
    logger.info(l);
  });
  return subprocess;
}

/**
 * Runs pk command through subprocess expect wrapper
 * @throws assert.AssertionError when expectations fail
 * @throws Error for other reasons
 */
async function pkExpect({
  expect,
  args = [],
  env = {},
  cwd,
}: {
  expect: (expectChain: nexpect.IChain) => nexpect.IChain;
  args?: Array<string>;
  env?: Record<string, string | undefined>;
  cwd?: string;
}): Promise<{
  exitCode: number;
  stdouterr: string;
}> {
  cwd =
    cwd ?? (await fs.promises.mkdtemp(path.join(os.tmpdir(), 'polykey-test-')));
  env = { ...process.env, ...env };
  const tsConfigPath = path.resolve(
    path.join(global.projectDir, 'tsconfig.json'),
  );
  const tsConfigPathsRegisterPath = path.resolve(
    path.join(global.projectDir, 'node_modules/tsconfig-paths/register'),
  );
  const polykeyPath = path.resolve(
    path.join(global.projectDir, 'src/bin/polykey.ts'),
  );
  // Expect chain runs against stdout and stderr
  let expectChain = nexpect.spawn(
    'ts-node',
    [
      '--project',
      tsConfigPath,
      '--require',
      tsConfigPathsRegisterPath,
      '--transpile-only',
      polykeyPath,
      ...args,
    ],
    {
      env,
      cwd,
      stream: 'all',
    },
  );
  // Augment the expect chain
  expectChain = expect(expectChain);
  return new Promise((resolve, reject) => {
    expectChain.run((e, output: Array<string>, exitCode: string | number) => {
      if (e != null) {
        return reject(e);
      }
      if (typeof exitCode === 'string') {
        return reject(new Error('Process killed by signal'));
      }
      const stdouterr = output.join('\n');
      return resolve({
        stdouterr,
        exitCode,
      });
    });
  });
}

export { pk, pkStdio, pkExec, pkSpawn, pkExpect };
