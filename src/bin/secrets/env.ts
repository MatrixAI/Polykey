import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { utils as clientUtils } from '../../client';
import * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import * as secretsPB from '../../proto/js/polykey/v1/secrets/secrets_pb';
import PolykeyClient from '../../PolykeyClient';
import * as utils from '../../utils';
import * as binUtils from '../utils';
import * as CLIErrors from '../errors';
import * as grpcErrors from '../../grpc/errors';

const env = binUtils.createCommand('env', {
  description: 'Runs a modified environment with injected secrets',
  nodePath: true,
  verbose: true,
  format: true,
});
env.option(
  '--command <command>',
  'In the environment of the derivation, run the shell command cmd in an interactive shell (Use --run to use a non-interactive shell instead)',
);
env.option(
  '--run <run>',
  'In the environment of the derivation, run the shell command cmd in a non-interactive shell, meaning (among other things) that if you hit Ctrl-C while the command is running, the shell exits (Use --command to use an interactive shell instead)',
);
env.arguments(
  "Secrets to inject into env, of the format '<vaultName>:<secretPath>[=<variableName>]', you can also control what the environment variable will be called using '[<variableName>]' (defaults to upper, snake case of the original secret name)",
);
env.action(async (options, command) => {
  const clientConfig = {};
  clientConfig['logger'] = new Logger('CLI Logger', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  if (options.verbose) {
    clientConfig['logger'].setLevel(LogLevel.DEBUG);
  }
  clientConfig['nodePath'] = options.nodePath
    ? options.nodePath
    : utils.getDefaultNodePath();

  let shellCommand;
  const client = await PolykeyClient.createPolykeyClient(clientConfig);
  const vaultMessage = new vaultsPB.Vault();
  const secretMessage = new secretsPB.Secret();
  secretMessage.setVault(vaultMessage);
  const secretPathList: string[] = Array.from<string>(command.args.values());
  if(!binUtils.pathRegex.test(secretPathList[secretPathList.length - 1])) {
    shellCommand = secretPathList.pop();
  }

  try {
    const secretPathList: string[] = Array.from<string>(command.args.values());
    console.log(options.export);

    if (secretPathList.length < 1) {
      throw new CLIErrors.ErrorSecretsUndefined();
    }

    if(!binUtils.pathRegex.test(secretPathList[secretPathList.length - 1])) {
      shellCommand = secretPathList.pop();
    }

    if (secretPathList.length < 1) {
      throw new CLIErrors.ErrorSecretsUndefined();
    }

    const secretEnv = { ...process.env };

    await client.start({});
    const grpcClient = client.grpcClient;

    let output = '';

    for (const path of secretPathList) {
      if (path.includes(':')) {
        if (options.export) {
          output = 'export ';
        }

        const [, vaultName, secretName, variableName] = path.match(
          binUtils.pathRegex,
        )!;

        const varName = variableName ?? secretName.toUpperCase().replace('-', '_');

        vaultMessage.setName(vaultName);
        vaultSpecificMessage.setVault(vaultMessage);
        vaultSpecificMessage.setName(secretName);
        const res = await grpcClient.vaultsGetSecret(vaultSpecificMessage, meta);
        const secret = res.getName();
        secretEnv[varName] = secret;

        data.push(output + `${varName}=${secret}`);

        output = '';
      } else if (path === '-e' || path === '--export') {
        output += 'export ';
      } else {
        throw new CLIErrors.ErrorSecretPathFormat();
      }
    }

    if(shellCommand) {
      binUtils.spawnShell(shellCommand, secretEnv, options.format);
    } else {
      process.stdout.write(
        binUtils.outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: data,
        }),
      );
    }

  } catch (err) {
    if (err instanceof grpcErrors.ErrorGRPCClientTimeout) {
      process.stderr.write(`${err.message}\n`);
    }
    if (err instanceof grpcErrors.ErrorGRPCServerNotStarted) {
      process.stderr.write(`${err.message}\n`);
    } else {
      process.stderr.write(
        binUtils.outputFormatter({
          type: 'error',
          description: err.description,
          message: err.message,
        }),
      );
      throw err;
    }
  } finally {
    await client.stop();
    options.nodePath = undefined;
    options.verbose = undefined;
    options.format = undefined;
    options.command = undefined;
    options.run = undefined;
  }
});

export default env;
