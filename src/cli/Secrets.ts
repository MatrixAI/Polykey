import commander from 'commander';
import { actionRunner, pkLogger, PKMessageType, determineNodePath } from '.';
import { PolykeyAgent } from '../lib/Polykey';

function makeListSecretsCommand() {
  return new commander.Command('list')
    .description('list all available secrets for a given vault')
    .alias('ls')
    .requiredOption('-n, --vault-name <vaultName>', 'the vault name')
    .option('--node-path <nodePath>', 'node path')
    .option('--verbose', 'increase verbosity level by one')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();

        const nodePath = determineNodePath(options);
        const isVerbose: boolean = options.verbose ?? false;
        const vaultName: string = options.vaultName;
        // Get list of secrets from pk
        const secretNames = await client.listSecrets(nodePath, vaultName);

        // List secrets
        if (secretNames.length == 0) {
          pkLogger(`no secrets found for vault '${vaultName}'`, PKMessageType.INFO);
        } else {
          if (isVerbose) {
            pkLogger(`secrets contained within the ${vaultName} vault:`, PKMessageType.INFO);
          }
          secretNames.forEach((secretName) => {
            pkLogger(secretName, PKMessageType.INFO);
          });
        }
      }),
    );
}

function makeNewSecretCommand() {
  return new commander.Command('new')
    .description('create a secret within a given vault')
    .option('--node-path <nodePath>', 'node path')
    .requiredOption('-n, --vault-name <vaultName>', 'the vault name')
    .requiredOption('-s, --secret-name <secretName>', 'the new secret name')
    .requiredOption('-p, --secret-path <secretPath>', 'path to the secret to be added')
    .option('--verbose', 'increase verbosity level by one')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        const nodePath = determineNodePath(options);

        const isVerbose: boolean = options.verbose ?? false;
        const vaultName: string = options.vaultName;
        const secretName: string = options.secretName;
        const secretPath: string = options.secretPath;
        try {
          // Add the secret
          const successful = await client.createSecret(nodePath, vaultName, secretName, secretPath);
          pkLogger(
            `secret '${secretName}' was ${successful ? '' : 'un-'}sucessfully added to vault '${vaultName}'`,
            PKMessageType.SUCCESS,
          );
        } catch (err) {
          throw Error(`Error when adding secret: ${err.message}`);
        }
      }),
    );
}

function makeUpdateSecretCommand() {
  return new commander.Command('update')
    .description('update a secret within a given vault')
    .option('--node-path <nodePath>', 'node path')
    .requiredOption('-n, --vault-name <vaultName>', 'the vault name')
    .requiredOption('-s, --secret-name <secretName>', 'an existing secret name')
    .requiredOption('-p, --secret-path <secretPath>', 'path to the new secret')
    .option('--verbose', 'increase verbosity level by one')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        const nodePath = determineNodePath(options);

        const isVerbose: boolean = options.verbose ?? false;
        const vaultName: string = options.vaultName;
        const secretName: string = options.secretName;
        const secretPath: string = options.secretPath;
        try {
          // Update the secret
          const successful = await client.updateSecret(nodePath, vaultName, secretName, secretPath);
          pkLogger(
            `secret '${secretName}' was ${successful ? '' : 'un-'}sucessfully updated in vault '${vaultName}'`,
            PKMessageType.SUCCESS,
          );
        } catch (err) {
          throw Error(`Error when updating secret: ${err.message}`);
        }
      }),
    );
}

function makeRemoveSecretCommand() {
  return new commander.Command('remove')
    .alias('rm')
    .description('remove a secret from a given vault')
    .requiredOption('-n, --vault-name <vaultName>', 'the vault name')
    .requiredOption('-s, --secret-name <secretName>', 'the new secret name')
    .option('--verbose', 'increase verbosity level by one')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        const nodePath = determineNodePath(options);

        const isVerbose: boolean = options.verbose ?? false;
        const vaultName: string = options.vaultName;
        const secretName: string = options.secretName;
        try {
          // Remove secret
          const successful = await client.destroySecret(nodePath, vaultName, secretName);
          pkLogger(
            `secret '${secretName}' was ${successful ? '' : 'un-'}sucessfully removed from vault '${vaultName}'`,
            PKMessageType.SUCCESS,
          );
        } catch (err) {
          throw Error(`Error when removing secret: ${err.message}`);
        }
      }),
    );
}

function makeGetSecretCommand() {
  return new commander.Command('get')
    .description('retrieve a secret from a given vault')
    .requiredOption('-n, --vault-name <vaultName>', 'the vault name')
    .requiredOption('-s, --secret-name <secretName>', 'the new secret name')
    .option('--verbose', 'increase verbosity level by one')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        const nodePath = determineNodePath(options);

        const isVerbose: boolean = options.verbose ?? false;
        const vaultName: string = options.vaultName;
        const secretName: string = options.secretName;
        try {
          // Remove secret
          const secret = await client.getSecret(nodePath, vaultName, secretName);
          pkLogger(`secret '${secretName}' from vault '${vaultName}':`, PKMessageType.SUCCESS);
          pkLogger(secret.toString(), PKMessageType.none);
        } catch (err) {
          throw Error(`Error when retrieving secret: ${err.message}`);
        }
      }),
    );
}

function makeSecretsCommand() {
  return new commander.Command('secrets')
    .description('manipulate secrets for a given vault')
    .addCommand(makeListSecretsCommand())
    .addCommand(makeNewSecretCommand())
    .addCommand(makeUpdateSecretCommand())
    .addCommand(makeRemoveSecretCommand())
    .addCommand(makeGetSecretCommand());
}

export default makeSecretsCommand;
