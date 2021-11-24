import type { Metadata } from '@grpc/grpc-js';

import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../options';
import * as parsers from '../parsers';

class CommandSign extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('sign');
    this.description('Sign a File using the Root Keypair');
    this.argument(
      '<filePath>',
      'Path to the file to sign, file must use binary encoding',
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

        const data = await parsers.parseFilePath({ filePath, fs: this.fs });
        cryptoMessage.setData(data);

        const response = await binUtils.retryAuth(
          (auth?: Metadata) => grpcClient.keysSign(cryptoMessage, auth),
          meta,
        );

        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data: [`Signature:\t\t${response.getSignature()}`],
          }),
        );
      } finally {
        await client.stop();
      }
    });
  }
}

export default CommandSign;
