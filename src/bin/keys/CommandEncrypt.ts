import type { Metadata } from '@grpc/grpc-js';

import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../options';
import * as parsers from '../parsers';

class CommandEncypt extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('encrypt');
    this.description('Encrypt a File using the Root Keypair');
    this.argument(
      '<filePath>',
      'Path to the file to encrypt, file must use binary encoding',
    );
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (filePath, options) => {
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
        const cryptoMessage = new keysPB.Crypto();

        const plainText = await parsers.parseFilePath({
          filePath,
          fs: this.fs,
        });

        cryptoMessage.setData(plainText);
        const response = await binUtils.retryAuth(
          (auth?: Metadata) => grpcClient.keysEncrypt(cryptoMessage, auth),
          meta,
        );

        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data: [`Encrypted data:\t\t${response.getData()}`],
          }),
        );
      } finally {
        await client.stop();
      }
    });
  }
}

export default CommandEncypt;
