import type { Metadata } from '@grpc/grpc-js';

import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../options';
import * as parsers from '../parsers';

class CommandReset extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('reset');
    this.description('Reset the Root Keypair');
    this.argument(
      '<passwordPath>',
      'Path to the password for the new root key',
    );
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (passwordPath, options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const keysPB = await import('../../proto/js/polykey/v1/keys/keys_pb');

      const client = await PolykeyClient.createPolykeyClient({
        logger: this.logger.getChild(PolykeyClient.name),
        nodePath: options.nodePath,
      });

      const meta = await parsers.parseAuth({
        passwordFile: options.passwordFile,
        fs: this.fs,
      });

      try {
        const grpcClient = client.grpcClient;
        const keyMessage = new keysPB.Key();

        const password = await this.fs.promises.readFile(passwordPath, {
          encoding: 'utf-8',
        });
        keyMessage.setName(password);

        await binUtils.retryAuth(
          (auth?: Metadata) => grpcClient.keysKeyPairReset(keyMessage, auth),
          meta,
        );

        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data: [`Reset root keypair successfully`],
          }),
        );
      } finally {
        await client.stop();
      }
    });
  }
}

export default CommandReset;
