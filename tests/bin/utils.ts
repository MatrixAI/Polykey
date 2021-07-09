import path from 'path';
import { exec, ExecException } from 'child_process';
import main from '../../src/bin/polykey';

type CliRes = {
  code: number;
  error: ExecException | null;
  stdout: string;
  stderr: string;
};

/**
 * Creates a new process and executes './src/bin/polykey' with the args provided
 * Gives stdout, stderr and exitcode
 * @param args List of args
 * @param cwd current working directory, usually '.'
 * @returns { code, error, stdout, stderr }
 */
function cli(args: Array<string>, cwd: string): Promise<CliRes> {
  return new Promise<CliRes>((resolve) => {
    exec(
      `ts-node -r tsconfig-paths/register ${path.resolve(
        './src/bin/polykey',
      )} ${args.join(' ')}`,
      { cwd },
      (error, stdout, stderr) => {
        resolve({
          code: error && error.code ? error.code : 0,
          error,
          stdout,
          stderr,
        });
      },
    );
  });
}

function pk(args: Array<string>): Promise<any> {
  return main(['', '', ...args]);
}

export { cli, pk };
