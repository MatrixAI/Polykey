import os from 'os';
import fs from 'fs';
import path from 'path';
import process from 'process';
import child_process from 'child_process';
import * as mockProcess from 'jest-mock-process';
import mockedEnv from 'mocked-env';
import nexpect from 'nexpect';
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
  return {
    exitCode,
    stdout,
    stderr,
  };
}

/**
 * Runs pk command through subprocess
 * This is used when a subprocess functionality needs to be used
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

export { pk, pkStdio, pkExec, pkExpect };
