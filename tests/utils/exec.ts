import type { ChildProcess } from 'child_process';
import type ErrorPolykey from '@/ErrorPolykey';
import childProcess from 'child_process';
import fs from 'fs';
import path from 'path';
import process from 'process';
import readline from 'readline';
import * as mockProcess from 'jest-mock-process';
import mockedEnv from 'mocked-env';
import nexpect from 'nexpect';
import Logger from '@matrixai/logger';
import main from '@/bin/polykey';

type ExecOpts = {
  env: Record<string, string | undefined>;
  command?: string | undefined;
  cwd?: string;
  shell?: boolean;
};

const tsConfigPath = path.resolve(
  path.join(globalThis.projectDir ?? '', 'tsconfig.json'),
);

const polykeyPath = path.resolve(
  path.join(globalThis.projectDir ?? '', 'src/bin/polykey.ts'),
);

const generateDockerArgs = (mountPath: string) => [
  '--interactive',
  '--rm',
  '--network',
  'host',
  '--pid',
  'host',
  '--userns',
  'host',
  `--user`,
  `${process.getuid!()}`,
  '--mount',
  `type=bind,src=${mountPath},dst=${mountPath}`,
  '--env',
  'PK_PASSWORD',
  '--env',
  'PK_NODE_PATH',
  '--env',
  'PK_RECOVERY_CODE',
  '--env',
  'PK_TOKEN',
  '--env',
  'PK_ROOT_KEY',
  '--env',
  'PK_NODE_ID',
  '--env',
  'PK_CLIENT_HOST',
  '--env',
  'PK_CLIENT_PORT',
];

/**
 * Execute generic (non-Polykey) shell commands
 */
async function exec(
  command: string,
  args: Array<string> = [],
  opts: ExecOpts = { env: {} },
): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  const env = {
    ...process.env,
    ...opts.env,
  };
  return new Promise((resolve, reject) => {
    let stdout = '',
      stderr = '';
    const subprocess = childProcess.spawn(command, args, {
      env,
      windowsHide: true,
      shell: opts.shell ? opts.shell : false,
    });
    subprocess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    subprocess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    subprocess.on('exit', (code) => {
      resolve({ exitCode: code ?? -255, stdout, stderr });
    });
    subprocess.on('error', (e) => {
      reject(e);
    });
  });
}

/**
 * Spawn generic (non-Polykey) shell processes
 */
async function spawn(
  command: string,
  args: Array<string> = [],
  opts: ExecOpts = { env: {} },
  logger: Logger = new Logger(spawn.name),
): Promise<ChildProcess> {
  const env = {
    ...process.env,
    ...opts.env,
  };
  const subprocess = childProcess.spawn(command, args, {
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
    shell: opts.shell ? opts.shell : false,
  });
  // The readline library will trim newlines
  const rlOut = readline.createInterface(subprocess.stdout!);
  rlOut.on('line', (l) => logger.info(l));
  const rlErr = readline.createInterface(subprocess.stderr!);
  rlErr.on('line', (l) => logger.info(l));
  return new Promise<ChildProcess>((resolve, reject) => {
    subprocess.on('error', (e) => {
      reject(e);
    });
    subprocess.on('spawn', () => {
      subprocess.removeAllListeners('error');
      resolve(subprocess);
    });
  });
}

/**
 * Runs pk command functionally
 */
async function pk(args: Array<string>): Promise<any> {
  return main(['', '', ...args]);
}

/**
 * Runs pk command functionally with mocked STDIO
 * Both stdout and stderr are the entire output including newlines
 * This can only be used serially, because the mocks it relies on are global singletons
 * If it is used concurrently, the mocking side-effects can conflict
 */
async function pkStdio(
  args: Array<string> = [],
  opts: ExecOpts = { env: {} },
): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  const cwd =
    opts.cwd ??
    (await fs.promises.mkdtemp(path.join(globalThis.tmpDir, 'polykey-test-')));
  // Recall that we attempt to connect to all specified seed nodes on agent start.
  // Therefore, for testing purposes only, we default the seed nodes as empty
  // (if not defined in the env) to ensure no attempted connections. A regular
  // PolykeyAgent is expected to initially connect to the mainnet seed nodes
  opts.env['PK_SEED_NODES'] = opts.env['PK_SEED_NODES'] ?? '';
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
  const envRestore = mockedEnv(opts.env);
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
 * Both stdout and stderr are the entire output including newlines
 * By default `globalThis.testCommand` should be `undefined` because `PK_TEST_COMMAND` will not be set
 * This is strictly checking for existence, `PK_TEST_COMMAND=''` is legitimate but undefined behaviour
 */
async function pkExec(
  args: Array<string> = [],
  opts: ExecOpts = { env: {}, command: globalThis.testCmd },
): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  if (opts.command == null) {
    return pkExecWithoutShell(args, opts);
  } else {
    return pkExecWithShell(args, opts);
  }
}

/**
 * Launch pk command through subprocess
 * This is used when a subprocess functionality needs to be used
 * This is intended for non-terminating subprocesses
 * By default `globalThis.testCommand` should be `undefined` because `PK_TEST_COMMAND` will not be set
 * This is strictly checking for existence, `PK_TEST_COMMAND=''` is legitimate but undefined behaviour
 */
async function pkSpawn(
  args: Array<string> = [],
  opts: ExecOpts = { env: {}, command: globalThis.testCmd },
  logger: Logger = new Logger(pkSpawn.name),
): Promise<ChildProcess> {
  if (opts.command == null) {
    return pkSpawnWithoutShell(args, opts, logger);
  } else {
    return pkSpawnWithShell(args, opts, logger);
  }
}

/**
 * Runs pk command through subprocess
 * This is the default
 */
async function pkExecWithoutShell(
  args: Array<string> = [],
  opts: ExecOpts = { env: {} },
): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  const cwd =
    opts.cwd ??
    (await fs.promises.mkdtemp(path.join(globalThis.tmpDir, 'polykey-test-')));
  const env = {
    ...process.env,
    ...opts.env,
  };
  // Recall that we attempt to connect to all specified seed nodes on agent start.
  // Therefore, for testing purposes only, we default the seed nodes as empty
  // (if not defined in the env) to ensure no attempted connections. A regular
  // PolykeyAgent is expected to initially connect to the mainnet seed nodes
  env['PK_SEED_NODES'] = env['PK_SEED_NODES'] ?? '';
  return new Promise((resolve, reject) => {
    let stdout = '',
      stderr = '';
    const subprocess = childProcess.spawn(
      'ts-node',
      ['--project', tsConfigPath, polykeyPath, ...args],
      {
        env,
        cwd,
        windowsHide: true,
        shell: opts.shell ? opts.shell : false,
      },
    );
    subprocess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    subprocess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    subprocess.on('exit', (code) => {
      resolve({ exitCode: code ?? -255, stdout, stderr });
    });
    subprocess.on('error', (e) => {
      reject(e);
    });
  });
}

/**
 * Runs pk command through subprocess
 * This is the parameter > environment override
 */
async function pkExecWithShell(
  args: Array<string> = [],
  opts: ExecOpts = { env: {}, command: globalThis.testCmd },
): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  const cwd = path.resolve(
    opts.cwd ??
      (await fs.promises.mkdtemp(
        path.join(globalThis.tmpDir, 'polykey-test-'),
      )),
  );
  const env = {
    ...process.env,
    ...opts.env,
  };
  if (globalThis.testPlatform === 'docker') {
    env.DOCKER_OPTIONS = generateDockerArgs(cwd).join(' ');
  }
  // Recall that we attempt to connect to all specified seed nodes on agent start.
  // Therefore, for testing purposes only, we default the seed nodes as empty
  // (if not defined in the env) to ensure no attempted connections. A regular
  // PolykeyAgent is expected to initially connect to the mainnet seed nodes
  env['PK_SEED_NODES'] = env['PK_SEED_NODES'] ?? '';
  args = args.map(escapeShellArgs);
  return new Promise((resolve, reject) => {
    let stdout = '',
      stderr = '';
    const subprocess = childProcess.spawn(opts.command!, args, {
      env,
      cwd,
      windowsHide: true,
      shell: opts.shell ? opts.shell : true,
    });
    subprocess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    subprocess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    subprocess.on('exit', (code) => {
      resolve({ exitCode: code ?? -255, stdout, stderr });
    });
    subprocess.on('error', (e) => {
      reject(e);
    });
  });
}

/**
 * Launch pk command through subprocess
 * This is the default
 */
async function pkSpawnWithoutShell(
  args: Array<string> = [],
  opts: ExecOpts = { env: {} },
  logger: Logger = new Logger(pkSpawnWithoutShell.name),
): Promise<ChildProcess> {
  const cwd =
    opts.cwd ??
    (await fs.promises.mkdtemp(path.join(globalThis.tmpDir, 'polykey-test-')));
  const env = {
    ...process.env,
    ...opts.env,
  };
  // Recall that we attempt to connect to all specified seed nodes on agent start.
  // Therefore, for testing purposes only, we default the seed nodes as empty
  // (if not defined in the env) to ensure no attempted connections. A regular
  // PolykeyAgent is expected to initially connect to the mainnet seed nodes
  env['PK_SEED_NODES'] = env['PK_SEED_NODES'] ?? '';
  const subprocess = childProcess.spawn(
    'ts-node',
    ['--project', tsConfigPath, polykeyPath, ...args],
    {
      env,
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      shell: opts.shell ? opts.shell : false,
    },
  );
  // The readline library will trim newlines
  const rlOut = readline.createInterface(subprocess.stdout!);
  rlOut.on('line', (l) => logger.info(l));
  const rlErr = readline.createInterface(subprocess.stderr!);
  rlErr.on('line', (l) => logger.info(l));
  return new Promise<ChildProcess>((resolve, reject) => {
    subprocess.on('error', (e) => {
      reject(e);
    });
    subprocess.on('spawn', () => {
      subprocess.removeAllListeners('error');
      resolve(subprocess);
    });
  });
}

/**
 * Launch pk command through subprocess
 * This is the parameter > environment override
 */
async function pkSpawnWithShell(
  args: Array<string> = [],
  opts: ExecOpts = { env: {}, command: globalThis.testCmd },
  logger: Logger = new Logger(pkSpawnWithShell.name),
): Promise<ChildProcess> {
  const cwd = path.resolve(
    opts.cwd ??
      (await fs.promises.mkdtemp(
        path.join(globalThis.tmpDir, 'polykey-test-'),
      )),
  );
  const env = {
    ...process.env,
    ...opts.env,
  };
  if (globalThis.testPlatform === 'docker') {
    env.DOCKER_OPTIONS = generateDockerArgs(cwd).join(' ');
  }
  // Recall that we attempt to connect to all specified seed nodes on agent start.
  // Therefore, for testing purposes only, we default the seed nodes as empty
  // (if not defined in the env) to ensure no attempted connections. A regular
  // PolykeyAgent is expected to initially connect to the mainnet seed nodes
  env['PK_SEED_NODES'] = env['PK_SEED_NODES'] ?? '';
  args = args.map(escapeShellArgs);
  const subprocess = childProcess.spawn(opts.command!, args, {
    env,
    cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
    shell: opts.shell ? opts.shell : true,
  });
  // The readline library will trim newlines
  const rlOut = readline.createInterface(subprocess.stdout!);
  rlOut.on('line', (l) => logger.info(l));
  const rlErr = readline.createInterface(subprocess.stderr!);
  rlErr.on('line', (l) => logger.info(l));
  return new Promise<ChildProcess>((resolve, reject) => {
    subprocess.on('error', (e) => {
      reject(e);
    });
    subprocess.on('spawn', () => {
      subprocess.removeAllListeners('error');
      resolve(subprocess);
    });
  });
}

/**
 * Runs pk command through subprocess expect wrapper
 * Note this will eventually be refactored to follow the same pattern as
 * `pkExec` and `pkSpawn` using a workaround to inject the `shell` option
 * into `nexpect.spawn`
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
    cwd ??
    (await fs.promises.mkdtemp(path.join(globalThis.tmpDir, 'polykey-test-')));
  env = {
    ...process.env,
    ...env,
  };
  // Recall that we attempt to connect to all specified seed nodes on agent start.
  // Therefore, for testing purposes only, we default the seed nodes as empty
  // (if not defined in the env) to ensure no attempted connections. A regular
  // PolykeyAgent is expected to initially connect to the mainnet seed nodes
  env['PK_SEED_NODES'] = env['PK_SEED_NODES'] ?? '';
  // Expect chain runs against stdout and stderr
  let expectChain = nexpect.spawn(
    'ts-node',
    ['--project', tsConfigPath, polykeyPath, ...args],
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

/**
 * Waits for child process to exit
 * When process is terminated with signal
 * The code will be null
 * When the process exits by itself, the signal will be null
 */
async function processExit(
  process: ChildProcess,
): Promise<[number | null, NodeJS.Signals | null]> {
  return await new Promise((resolve) => {
    process.once('exit', (code, signal) => {
      resolve([code, signal]);
    });
  });
}

/**
 * Checks exit code and stderr against ErrorPolykey
 * Errors should contain all of the errors in the expected error chain
 * starting with the outermost error (excluding ErrorPolykeyRemote)
 * When using this function, the command must be run with --format=json
 */
function expectProcessError(
  exitCode: number,
  stderr: string,
  errors: Array<ErrorPolykey<any>>,
) {
  expect(exitCode).toBe(errors[0].exitCode);
  const stdErrLine = stderr.trim().split('\n').pop();
  let currentError = JSON.parse(stdErrLine!);
  while (currentError.type === 'ErrorPolykeyRemote') {
    currentError = currentError.data.cause;
  }
  for (const error of errors) {
    expect(currentError.type).toBe(error.name);
    expect(currentError.data.message).toBe(error.message);
    currentError = currentError.data.cause;
  }
}

function escapeShellArgs(arg: string): string {
  return arg.replace(/(["\s'$`\\])/g, '\\$1');
}

export {
  tsConfigPath,
  polykeyPath,
  exec,
  spawn,
  pk,
  pkStdio,
  pkExec,
  pkExecWithShell,
  pkExecWithoutShell,
  pkSpawn,
  pkSpawnWithShell,
  pkSpawnWithoutShell,
  pkExpect,
  processExit,
  expectProcessError,
  escapeShellArgs,
};
