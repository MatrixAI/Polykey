import type { ChildProcess } from 'child_process';
import type ErrorPolykey from '@/ErrorPolykey';
import childProcess from 'child_process';
import path from 'path';
import process from 'process';
import readline from 'readline';
import Logger from '@matrixai/logger';

type ExecOpts = {
  env: Record<string, string | undefined>;
  command?: string | undefined;
  cwd?: string;
  shell?: boolean;
};

const tsConfigPath = path.resolve(
  path.join(globalThis.projectDir ?? '', 'tsconfig.json'),
);

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
  exec,
  spawn,
  processExit,
  expectProcessError,
  escapeShellArgs,
};
