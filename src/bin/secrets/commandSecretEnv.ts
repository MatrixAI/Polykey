import { spawn } from 'child_process';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as grpc from '@grpc/grpc-js';
import { clientPB } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import * as utils from '../../utils';
import * as binUtils from '../utils';
import * as CLIErrors from '../errors';
import * as grpcErrors from '../../grpc/errors';

const commandSecretEnv = binUtils.createCommand('env', {
  description: 'Runs a modified environment with injected secrets',
  nodePath: true,
  verbose: true,
  format: true,
  passwordFile: true,
});
commandSecretEnv.arguments(
  "Secrets to inject into env, of the format '<vaultName>:<secretPath>[=<variableName>]', you can also control what the environment variable will be called using '[<variableName>]' (defaults to upper, snake case of the original secret name)",
);
commandSecretEnv.action(async (options, command) => {
  const meta = new grpc.Metadata();
  const clientConfig = {};
  clientConfig['logger'] = new Logger('CLI Logger', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  if (options.verbose) {
    clientConfig['logger'].setLevel(LogLevel.DEBUG);
  }
  if (options.passwordFile) {
    meta.set('passwordFile', options.passwordFile);
  }
  clientConfig['nodePath'] = options.nodePath
    ? options.nodePath
    : utils.getDefaultNodePath();

  let shellCommand;
  const client = new PolykeyClient(clientConfig);
  const vaultSpecificMessage = new clientPB.VaultSpecificMessage();
  const vaultMessage = new clientPB.VaultMessage();
  const secretPathList: string[] = Array.from<string>(command.args.values());
  if(!binUtils.pathRegex.test(secretPathList[secretPathList.length - 1])) {
    shellCommand = secretPathList.pop();
  }

  try {
    if (secretPathList.length < 1) {
      throw new CLIErrors.ErrorSecretsUndefined();
    }

    const parsedPathList: {
      vaultName: string;
      secretName: string;
      variableName: string;
    }[] = [];

    for (const path of secretPathList) {
      if (!path.includes(':')) {
        throw new CLIErrors.ErrorSecretPathFormat();
      }

      const [, vaultName, secretName, variableName] = path.match(
        binUtils.pathRegex,
      )!;
      parsedPathList.push({
        vaultName,
        secretName,
        variableName:
          variableName ?? secretName.toUpperCase().replace('-', '_'),
      });
    }

    const secretEnv = { ...process.env };

    // await client.start({});
    // const grpcClient = client.grpcClient;

    // for (const obj of parsedPathList) {
    //   vaultMessage.setName(obj.vaultName);
    //   vaultSpecificMessage.setVault(vaultMessage);
    //   vaultSpecificMessage.setName(obj.secretName);
    //   const res = await grpcClient.vaultsGetSecret(vaultSpecificMessage, meta);
    //   const secret = res.getName();
    //   secretEnv[obj.variableName] = secret;
    // }

    // binUtils.spawnShell(shellCommand, secretEnv, options.format);
    // process.stdout.write(
    //   binUtils.outputFormatter({
    //     type: options.format === 'json' ? 'json' : 'list',
    //     data: [
    //       // `${secretName.toUpperCase().replace('-', '_')}='${secret}`,
    //     ],
    //   }),
    // );

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
    client.stop();
    options.passwordFile = undefined;
    options.nodePath = undefined;
    options.verbose = undefined;
    options.format = undefined;
  }
});

export default commandSecretEnv;
