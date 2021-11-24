import type { Metadata } from '@grpc/grpc-js';

import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../options';
import * as parsers from '../parsers';

class CommandRoot extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('root');
    this.description('Get the Root Keypair');
    this.option('-pk, --private-key', 'Include the private key');
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const utilsPB = await import('../../proto/js/polykey/v1/utils/utils_pb');

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
        const emptyMessage = new utilsPB.EmptyMessage();

        const keyPair = await binUtils.retryAuth(
          (auth?: Metadata) => grpcClient.keysKeyPairRoot(emptyMessage, auth),
          meta,
        );

        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data: [`public key:\t\t${keyPair.getPublic()}...`],
          }),
        );

        if (options.privateKey) {
          process.stdout.write(
            binUtils.outputFormatter({
              type: options.format === 'json' ? 'json' : 'list',
              data: [`private key:\t\t${keyPair.getPrivate()}...`],
            }),
          );
        }
      } finally {
        await client.stop();
      }
    });
  }
}

export default CommandRoot;
