import type PolykeyClient from '../../PolykeyClient';
import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../utils/options';
import * as parsers from '../utils/parsers';
import * as binProcessors from '../utils/processors';

class CommandMkdir extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('mkdir');
    this.description('Create a Directory within a Vault');
    this.argument(
      '<secretPath>',
      'Path to where the directory to be created, specified as <vaultName>:<directoryPath>',
      parsers.parseSecretPath,
    );
    this.option('-r, --recursive', 'Create the directory recursively');
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (secretPath, options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const vaultsPB = await import(
        '../../proto/js/polykey/v1/vaults/vaults_pb'
      );
      const clientOptions = await binProcessors.processClientOptions(
        options.nodePath,
        options.nodeId,
        options.clientHost,
        options.clientPort,
        this.fs,
        this.logger.getChild(binProcessors.processClientOptions.name),
      );
      const meta = await binProcessors.processAuthentication(
        options.passwordFile,
        this.fs,
      );
      let pkClient: PolykeyClient;
      this.exitHandlers.handlers.push(async () => {
        if (pkClient != null) await pkClient.stop();
      });
      try {
        pkClient = await PolykeyClient.createPolykeyClient({
          nodePath: options.nodePath,
          nodeId: clientOptions.nodeId,
          host: clientOptions.clientHost,
          port: clientOptions.clientPort,
          logger: this.logger.getChild(PolykeyClient.name),
        });
        const vaultMkdirMessage = new vaultsPB.Mkdir();
        const vaultMessage = new vaultsPB.Vault();
        vaultMessage.setNameOrId(secretPath[0]);
        vaultMkdirMessage.setVault(vaultMessage);
        vaultMkdirMessage.setDirName(secretPath[1]);
        vaultMkdirMessage.setRecursive(options.recursive);
        await binUtils.retryAuthentication(
          (auth) =>
            pkClient.grpcClient.vaultsSecretsMkdir(vaultMkdirMessage, auth),
          meta,
        );
        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data: [
              `Directory: ${vaultMkdirMessage.getDirName()} created inside vault: ${vaultMessage.getNameOrId()}`,
            ],
          }),
        );
      } finally {
        if (pkClient! != null) await pkClient.stop();
      }
    });
  }
}

export default CommandMkdir;
