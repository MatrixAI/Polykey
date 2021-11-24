import type { Metadata } from '@grpc/grpc-js';

import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../options';
import * as parsers from '../parsers';

class CommandCreate extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('create');
    this.aliases(['touch']);
    this.description('Create a new Vault');
    this.argument('<vaultName>', 'Name of the new vault to be created');
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (vaultName, options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const vaultsPB = await import(
        '../../proto/js/polykey/v1/vaults/vaults_pb'
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
        const grpcClient = client.grpcClient;
        const vaultMessage = new vaultsPB.Vault();
        vaultMessage.setNameOrId(vaultName);

        const response = await binUtils.retryAuth(
          (auth?: Metadata) => grpcClient.vaultsCreate(vaultMessage, auth),
          meta,
        );

        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data: [`Vault ${response.getNameOrId()} created successfully`],
          }),
        );
      } finally {
        await client.stop();
      }
    });
  }
}

export default CommandCreate;
