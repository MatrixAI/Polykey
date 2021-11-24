import type { Metadata } from '@grpc/grpc-js';

import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../options';
import * as parsers from '../parsers';

class CommandVerify extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('verify');
    this.description('Verify a Signature using the Root Keypair');
    this.argument(
      '<filePath>',
      'Path to the file to verify, file must use binary encoding',
    );
    this.argument(
      '<signaturePath>',
      'Path to the signature to be verified, file must be binary encoded',
    );
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (filePath, signaturePath, options) => {
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
        const signature = await parsers.parseFilePath({
          filePath: signaturePath,
          fs: this.fs,
        });

        cryptoMessage.setData(data);
        cryptoMessage.setSignature(signature);

        const response = await binUtils.retryAuth(
          (auth?: Metadata) => grpcClient.keysVerify(cryptoMessage, auth),
          meta,
        );

        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data: [`Signature verification:\t\t${response.getSuccess()}`],
          }),
        );
      } finally {
        await client.stop();
      }
    });
  }
}

export default CommandVerify;
