import type { ChildProcess } from 'child_process';
import type ErrorPolykey from '@/ErrorPolykey';
import type { PrivateKeyPem } from '@/keys/types';
import type { StatusLive } from '@/status/types';
import child_process from 'child_process';
import fs from 'fs';
import path from 'path';
import process from 'process';
import readline from 'readline';
import os from 'os';
import * as mockProcess from 'jest-mock-process';
import mockedEnv from 'mocked-env';
import nexpect from 'nexpect';
import Logger from '@matrixai/logger';
import main from '@/bin/polykey';
import { promise } from '@/utils';
import * as validationUtils from '@/validation/utils';

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
  `${process.getuid()}`,
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
 * Wrapper for execFile to make it asynchronous and non-blocking
 */
async function exec(
  command: string,
  args: Array<string> = [],
): Promise<{
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolve, reject) => {
    child_process.execFile(
      command,
      args,
      { windowsHide: true },
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          return resolve({
            stdout,
            stderr,
          });
        }
      },
    );
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
  if (globalThis.testCmd != null) return pkStdioTarget(args, env, cwd);

  cwd =
    cwd ??
    (await fs.promises.mkdtemp(path.join(globalThis.tmpDir, 'polykey-test-')));
  // Recall that we attempt to connect to all specified seed nodes on agent start.
  // Therefore, for testing purposes only, we default the seed nodes as empty
  // (if not defined in the env) to ensure no attempted connections. A regular
  // PolykeyAgent is expected to initially connect to the mainnet seed nodes
  env['PK_SEED_NODES'] = env['PK_SEED_NODES'] ?? '';
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
 * Both stdout and stderr are the entire output including newlines
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
  if (globalThis.testCmd != null) return pkExecTarget(args, env, cwd);

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
  const tsConfigPath = path.resolve(
    path.join(globalThis.projectDir, 'tsconfig.json'),
  );
  const polykeyPath = path.resolve(
    path.join(globalThis.projectDir, 'src/bin/polykey.ts'),
  );
  return new Promise((resolve, reject) => {
    child_process.execFile(
      'ts-node',
      ['--project', tsConfigPath, polykeyPath, ...args],
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
  if (globalThis.testCmd != null) return pkSpawnTarget(args, env, cwd, logger);

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
  const tsConfigPath = path.resolve(
    path.join(globalThis.projectDir, 'tsconfig.json'),
  );
  const polykeyPath = path.resolve(
    path.join(globalThis.projectDir, 'src/bin/polykey.ts'),
  );
  const command =
    globalThis.testCmd != null
      ? path.resolve(path.join(globalThis.projectDir, globalThis.testCmd))
      : 'ts-node';
  const tsNodeArgs =
    globalThis.testCmd != null ? [] : ['--project', tsConfigPath, polykeyPath];
  const subprocess = child_process.spawn(command, [...tsNodeArgs, ...args], {
    env,
    cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });
  // The readline library will trim newlines
  const rlOut = readline.createInterface(subprocess.stdout!);
  rlOut.on('line', (l) => logger.info(l));
  const rlErr = readline.createInterface(subprocess.stderr!);
  rlErr.on('line', (l) => logger.info(l));
  return subprocess;
}

/**
 * Mimics the behaviour of `pkStdio` while running the command as a separate process.
 * Note that this is incompatible with jest mocking.
 * @param args - args to be passed to the command.
 * @param env - environment variables to be passed to the command.
 * @param cwd - the working directory the command will be executed in.
 */
async function pkStdioTarget(
  args: Array<string> = [],
  env: Record<string, string | undefined> = {},
  cwd?: string,
): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  cwd = path.resolve(
    cwd ??
      (await fs.promises.mkdtemp(
        path.join(globalThis.tmpDir, 'polykey-test-'),
      )),
  );
  // Recall that we attempt to connect to all specified seed nodes on agent start.
  // Therefore, for testing purposes only, we default the seed nodes as empty
  // (if not defined in the env) to ensure no attempted connections. A regular
  // PolykeyAgent is expected to initially connect to the mainnet seed nodes
  env['PK_SEED_NODES'] = env['PK_SEED_NODES'] ?? '';

  // If using the command override we need to spawn a process
  env = {
    ...process.env,
    ...env,
    DOCKER_OPTIONS: generateDockerArgs(cwd).join(' '),
  };
  const command = globalThis.testCmd!;
  const escapedArgs = args.map((x) => x.replace(/(["\s'$`\\])/g, '\\$1'));
  const subprocess = child_process.spawn(command, escapedArgs, {
    env,
    cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
    shell: true,
  });
  const exitCodeProm = promise<number | null>();
  subprocess.on('exit', (code) => {
    exitCodeProm.resolveP(code);
  });
  subprocess.on('error', (e) => {
    exitCodeProm.rejectP(e);
  });
  let stdout = '',
    stderr = '';
  subprocess.stdout.on('data', (data) => {
    stdout += data.toString();
  });
  subprocess.stderr.on('data', (data) => {
    stderr += data.toString();
  });
  return { exitCode: (await exitCodeProm.p) ?? -255, stdout, stderr };
}

/**
 * Execs the target command spawning it as a seperate process
 * @param args - args to be passed to the command.
 * @param env Augments env for command execution
 * @param cwd Defaults to temporary directory
 */
async function pkExecTarget(
  args: Array<string> = [],
  env: Record<string, string | undefined> = {},
  cwd?: string,
): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  cwd = path.resolve(
    cwd ??
      (await fs.promises.mkdtemp(
        path.join(globalThis.tmpDir, 'polykey-test-'),
      )),
  );
  env = {
    ...process.env,
    ...env,
    DOCKER_OPTIONS: generateDockerArgs(cwd).join(' '),
  };
  // Recall that we attempt to connect to all specified seed nodes on agent start.
  // Therefore, for testing purposes only, we default the seed nodes as empty
  // (if not defined in the env) to ensure no attempted connections. A regular
  // PolykeyAgent is expected to initially connect to the mainnet seed nodes
  env['PK_SEED_NODES'] = env['PK_SEED_NODES'] ?? '';
  const command = globalThis.testCmd!;
  const escapedArgs = args.map((x) => x.replace(/(["\s'$`\\])/g, '\\$1'));
  return new Promise((resolve, reject) => {
    let stdout = '',
      stderr = '';
    const subprocess = child_process.spawn(command, escapedArgs, {
      env,
      cwd,
      windowsHide: true,
      shell: true,
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
 * This will spawn a process that executes the target `cmd` provided.
 * @param args - args to be passed to the command.
 * @param env - environment variables to be passed to the command.
 * @param cwd - the working directory the command will be executed in.
 * @param logger
 */
async function pkSpawnTarget(
  args: Array<string> = [],
  env: Record<string, string | undefined> = {},
  cwd?: string,
  logger: Logger = new Logger(pkSpawn.name),
): Promise<ChildProcess> {
  cwd = path.resolve(
    cwd ??
      (await fs.promises.mkdtemp(
        path.join(globalThis.tmpDir, 'polykey-test-'),
      )),
  );
  env = {
    ...process.env,
    ...env,
    DOCKER_OPTIONS: generateDockerArgs(cwd).join(' '),
  };
  // Recall that we attempt to connect to all specified seed nodes on agent start.
  // Therefore, for testing purposes only, we default the seed nodes as empty
  // (if not defined in the env) to ensure no attempted connections. A regular
  // PolykeyAgent is expected to initially connect to the mainnet seed nodes
  env['PK_SEED_NODES'] = env['PK_SEED_NODES'] ?? '';
  const command = globalThis.testCmd!;
  const escapedArgs = args.map((x) => x.replace(/(["\s'$`\\])/g, '\\$1'));
  const subprocess = child_process.spawn(command, escapedArgs, {
    env,
    cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
    shell: true,
  });
  // The readline library will trim newlines
  const rlOut = readline.createInterface(subprocess.stdout!);
  rlOut.on('line', (l) => logger.info(l));
  const rlErr = readline.createInterface(subprocess.stderr!);
  rlErr.on('line', (l) => logger.info(l));
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
  const tsConfigPath = path.resolve(
    path.join(globalThis.projectDir, 'tsconfig.json'),
  );
  const polykeyPath = path.resolve(
    path.join(globalThis.projectDir, 'src/bin/polykey.ts'),
  );
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

/**
 *
 * @param privateKeyPem - Optional root key override to skip key generation
 * @param logger
 */
async function setupTestAgent(privateKeyPem: PrivateKeyPem, logger: Logger) {
  const agentDir = await fs.promises.mkdtemp(
    path.join(globalThis.tmpDir, 'polykey-test-'),
  );
  const agentPassword = 'password';
  const agentProcess = await pkSpawn(
    [
      'agent',
      'start',
      '--node-path',
      agentDir,
      '--client-host',
      '127.0.0.1',
      '--proxy-host',
      '127.0.0.1',
      '--workers',
      '0',
      '--format',
      'json',
      '--verbose',
    ],
    {
      PK_PASSWORD: agentPassword,
      PK_ROOT_KEY: privateKeyPem,
    },
    agentDir,
    logger,
  );
  const startedProm = promise<any>();
  agentProcess.on('error', (d) => startedProm.rejectP(d));
  const rlOut = readline.createInterface(agentProcess.stdout!);
  rlOut.on('line', (l) => startedProm.resolveP(JSON.parse(l.toString())));
  const data = await startedProm.p;
  const agentStatus: StatusLive = {
    status: 'LIVE',
    data: { ...data, nodeId: validationUtils.parseNodeId(data.nodeId) },
  };
  try {
    return {
      agentStatus,
      agentClose: async () => {
        agentProcess.kill();
        await fs.promises.rm(agentDir, {
          recursive: true,
          force: true,
          maxRetries: 10,
        });
      },
      agentDir,
      agentPassword,
    };
  } catch (e) {
    agentProcess.kill();
    await fs.promises.rm(agentDir, {
      recursive: true,
      force: true,
      maxRetries: 10,
    });
    throw e;
  }
}

function spawnFile(path: string) {
  return child_process.spawn('ts-node', [
    '--require',
    'tsconfig-paths/register',
    path,
  ]);
}

/**
 * Formats the command to enter a namespace to run a process inside it
 */
const nsenter = (usrnsPid: number, netnsPid: number) => {
  return [
    '--target',
    usrnsPid.toString(),
    '--user',
    '--preserve-credentials',
    'nsenter',
    '--target',
    netnsPid.toString(),
    '--net',
  ];
};

/**
 * Runs pk command through subprocess inside a network namespace
 * This is used when a subprocess functionality needs to be used
 * This is intended for terminating subprocesses
 * Both stdout and stderr are the entire output including newlines
 * @param env Augments env for command execution
 * @param cwd Defaults to temporary directory
 */
async function pkExecNs(
  usrnsPid: number,
  netnsPid: number,
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
  env = {
    ...process.env,
    ...env,
  };
  // Recall that we attempt to connect to all specified seed nodes on agent start.
  // Therefore, for testing purposes only, we default the seed nodes as empty
  // (if not defined in the env) to ensure no attempted connections. A regular
  // PolykeyAgent is expected to initially connect to the mainnet seed nodes
  env['PK_SEED_NODES'] = env['PK_SEED_NODES'] ?? '';
  const tsConfigPath = path.resolve(
    path.join(globalThis.projectDir, 'tsconfig.json'),
  );
  const polykeyPath = path.resolve(
    path.join(globalThis.projectDir, 'src/bin/polykey.ts'),
  );
  return new Promise((resolve, reject) => {
    child_process.execFile(
      'nsenter',
      [
        ...nsenter(usrnsPid, netnsPid),
        'ts-node',
        '--project',
        tsConfigPath,
        polykeyPath,
        ...args,
      ],
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
 * Launch pk command through subprocess inside a network namespace
 * This is used when a subprocess functionality needs to be used
 * This is intended for non-terminating subprocesses
 * @param env Augments env for command execution
 * @param cwd Defaults to temporary directory
 */
async function pkSpawnNs(
  usrnsPid: number,
  netnsPid: number,
  args: Array<string> = [],
  env: Record<string, string | undefined> = {},
  cwd?: string,
  logger: Logger = new Logger(pkSpawnNs.name),
): Promise<ChildProcess> {
  cwd =
    cwd ?? (await fs.promises.mkdtemp(path.join(os.tmpdir(), 'polykey-test-')));
  env = {
    ...process.env,
    ...env,
  };
  // Recall that we attempt to connect to all specified seed nodes on agent start.
  // Therefore, for testing purposes only, we default the seed nodes as empty
  // (if not defined in the env) to ensure no attempted connections. A regular
  // PolykeyAgent is expected to initially connect to the mainnet seed nodes
  env['PK_SEED_NODES'] = env['PK_SEED_NODES'] ?? '';
  const tsConfigPath = path.resolve(
    path.join(globalThis.projectDir, 'tsconfig.json'),
  );
  const polykeyPath = path.resolve(
    path.join(globalThis.projectDir, 'src/bin/polykey.ts'),
  );
  const subprocess = child_process.spawn(
    'nsenter',
    [
      ...nsenter(usrnsPid, netnsPid),
      'ts-node',
      '--project',
      tsConfigPath,
      polykeyPath,
      ...args,
    ],
    {
      env,
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      shell: true,
    },
  );
  const rlErr = readline.createInterface(subprocess.stderr!);
  rlErr.on('line', (l) => {
    // The readline library will trim newlines
    logger.info(l);
  });
  return subprocess;
}

export {
  exec,
  pk,
  pkStdio,
  pkExec,
  pkSpawn,
  pkStdioTarget,
  pkExecTarget,
  pkSpawnTarget,
  pkExpect,
  processExit,
  expectProcessError,
  setupTestAgent,
  spawnFile,
  nsenter,
  pkExecNs,
  pkSpawnNs,
};
