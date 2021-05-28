import { spawn } from 'child_process';

import { errors } from '@/grpc';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { clientPB } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import { createCommand, outputFormatter } from '../utils';

const pathRegex = /^([\w-]+)(?::)([\w\-\\\/\.\$]+)(?:=)?([a-zA-Z_][\w]+)?$/;

const commandSecretEnv = createCommand('env', {
  description:
    "Runs a modified environment with injected secrets, specify a secret path with '<vaultName>:<secretPath>[=<variableName>]'",
  nodePath: true,
  verbose: true,
  format: true,
});
commandSecretEnv.option(
  '--command <command>',
  'In the environment of the derivation, run the shell command cmd. This command is executed in an interactive shell. (Use --run to use a non-interactive shell instead.)',
);
commandSecretEnv.option(
  '--run <run>',
  'Like --command, but executes the command in a non-interactive shell. This means (among other things) that if you hit Ctrl-C while the command is running, the shell exits.',
);
commandSecretEnv.arguments(
  "secrets to inject into env, of the format '<vaultName>:<secretPath>[=<variableName>]'. you can also control what the environment variable will be called using '<vaultName>:<secretPath>[=<variableName>]', defaults to upper, snake case of the original secret name.",
);
commandSecretEnv.action(async (options, command) => {
  const clientConfig = {};
  clientConfig['logger'] = new Logger('CLI Logger', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  if (options.verbose) {
    clientConfig['logger'].setLevel(LogLevel.DEBUG);
  }
  if (options.nodePath) {
    clientConfig['nodePath'] = options.nodePath;
  }

  const client = new PolykeyClient(clientConfig);
  const vaultSpecificMessage = new clientPB.VaultSpecificMessage();
  const vaultMessage = new clientPB.VaultMessage();
  const secretPathList: string[] = Array.from<string>(command.args.values());

  if (secretPathList.length < 1) {
    throw Error('please specify at least one secret');
  }

  try {
    // Parse secret paths in list
    const parsedPathList: {
      vaultName: string;
      secretName: string;
      variableName: string;
    }[] = [];
    for (const path of secretPathList) {
      if (!pathRegex.test(path)) {
        throw Error(
          `secret path was not of the format '<vaultName>:<secretPath>[=<variableName>]': ${path}`,
        );
      }
      const [, vaultName, secretName, variableName] = path.match(pathRegex)!;
      parsedPathList.push({
        vaultName,
        secretName,
        variableName:
          variableName ?? secretName.toUpperCase().replace('-', '_'),
      });
    }

    const secretEnv = { ...process.env };
    try {
      await client.start({});
      const grpcClient = client.grpcClient;
      // Get all the secrets
      for (const obj of parsedPathList) {
        vaultMessage.setId(obj.vaultName);
        vaultSpecificMessage.setVault(vaultMessage);
        vaultSpecificMessage.setName(obj.secretName);
        const res = await grpcClient.vaultsGetSecret(client);
        const secret = res.getName();

        secretEnv[obj.variableName] = secret;
      }
    } catch (err) {
      throw Error(`Error when retrieving secret: ${err.message}`);
    }
    try {
      const shellPath = process.env.SHELL ?? 'sh';
      const args: string[] = [];
      if (options.command && options.run) {
        throw Error('only one of --command or --run can be specified');
      } else if (options.command) {
        args.push('-i');
        args.push('-c');
        args.push(`"${options.command}"`);
      } else if (options.run) {
        args.push('-c');
        args.push(`"${options.run}"`);
      }
      const shell = spawn(shellPath, args, {
        stdio: 'inherit',
        env: secretEnv,
        shell: true,
      });
      shell.on('close', (code) => {
        if (code != 0) {
          process.stdout.write(
            outputFormatter({
              type: options.format === 'json' ? 'json' : 'list',
              data: [`Terminated with ${code}`],
            }),
          );
        }
      });
    } catch (err) {
      throw Error(`Error when running environment: ${err.message}`);
    }
  } catch (err) {
    if (err instanceof errors.ErrorGRPCClientTimeout) {
      process.stderr.write(`${err.message}\n`);
    }
    if (err instanceof errors.ErrorGRPCServerNotStarted) {
      process.stderr.write(`${err.message}\n`);
    } else {
      process.stdout.write(
        outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: ['Error:', err.message],
        }),
      );
    }
  } finally {
    client.stop();
  }
});

export default commandSecretEnv;
