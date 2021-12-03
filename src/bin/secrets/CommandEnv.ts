import type { Metadata } from '@grpc/grpc-js';

import path from 'path';
import CommandPolykey from '../CommandPolykey';
import * as binOptions from '../options';
import * as parsers from '../parsers';
import * as binUtils from '../utils';
import * as CLIErrors from '../errors';
import { InvalidArgumentError } from 'commander';

class CommandEnv extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('env');
    this.description('Secrets Env');
    this.argument('<secretFiles...>');
    this.option('-e, --export',
      'Sources all input secrets'
    );
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (secretFiles, options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const vaultsPB = await import(
        '../../proto/js/polykey/v1/vaults/vaults_pb'
      );
      const secretsPB = await import(
        '../../proto/js/polykey/v1/secrets/secrets_pb'
      );

      const client = await PolykeyClient.createPolykeyClient({
        nodePath: options.nodePath,
        logger: this.logger.getChild(PolykeyClient.name),
      });

      const meta = await parsers.parseAuth({
        passwordFile: options.passwordFile,
        fs: this.fs,
      });

      try {
        const directoryMessage = new secretsPB.Directory();
        const vaultMessage = new vaultsPB.Vault();
        directoryMessage.setVault(vaultMessage);
        let shellCommand;
        try {
          parsers.parseSecretPath(secretFiles[secretFiles.length - 1])
        } catch (e) {
          // If the last argument does not match the secret path format,
          // take it as a shell command
          if (e instanceof InvalidArgumentError) {
            shellCommand = secretFiles.pop();
          } else {
            throw e;
          }
        }
        // If there were no secrets passed in then we throw
        if (secretFiles.length < 1) {
          throw new CLIErrors.ErrorSecretsUndefined();
        }
        const secretEnv = { ...process.env };
        const grpcClient = client.grpcClient;
        let output = '';
        const data: string[] = [];
        for (const secretPath of secretFiles) {
          if (secretPath.includes(':')) {
            // If the overall flag for exporting has been specified then
            // export all variables
            if (options.export) {
              output = 'export ';
            }
            // Extract the secret path and the optional variable name
            const [vaultName, secretExpression, variableName] = parsers.parseSecretPath(secretPath);
            vaultMessage.setNameOrId(vaultName);
            directoryMessage.setSecretDirectory(secretExpression);
            await binUtils.retryAuth(async (meta: Metadata) => {
              const stream = grpcClient.vaultsSecretsEnv(directoryMessage, meta);
              for await (const secret of stream) {
                const secretName = secret.getSecretName();
                const secretContent = Buffer.from(secret.getSecretContent());
                const secretVariableName = variableName ? variableName: path.basename(secretName.toUpperCase().replace('-', '_'));
                // Set the secret as an environment variable for the subshell
                secretEnv[secretVariableName] = secretContent.toString();
                data.push(output + `${secretVariableName}=${secretContent.toString()}`);
              }
            }, meta);
            output = '';
          } else if (secretPath === '-e' || secretPath === '--export') {
            // The next secret will be exported
            output = 'export ';
          } else {
            throw new CLIErrors.ErrorSecretPathFormat();
          }
        }

        if (shellCommand) {
          binUtils.spawnShell(shellCommand, secretEnv, options.format);
        } else {
          process.stdout.write(
            binUtils.outputFormatter({
              type: options.format === 'json' ? 'json' : 'list',
              data: data,
            }),
          );
        }
      } finally {
        await client.stop();
      }
    });
  }
}

export default CommandEnv;
