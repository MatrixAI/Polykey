import type PolykeyClient from '../../PolykeyClient';
import * as binErrors from '../errors';
import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../utils/options';
import * as binProcessors from '../utils/processors';

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
        const cryptoMessage = new keysPB.Crypto();
        let data: string;
        let signature: string;
        try {
          data = await this.fs.promises.readFile(filePath, {
            encoding: 'binary',
          });
          signature = await this.fs.promises.readFile(signaturePath, {
            encoding: 'binary',
          });
        } catch (e) {
          throw new binErrors.ErrorCLIFileRead(e.message, {
            errno: e.errno,
            syscall: e.syscall,
            code: e.code,
            path: e.path,
          });
        }
        cryptoMessage.setData(data);
        cryptoMessage.setSignature(signature);
        const response = await binUtils.retryAuthentication(
          (auth) => pkClient.grpcClient.keysVerify(cryptoMessage, auth),
          meta,
        );
        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data: [`Signature verification:\t\t${response.getSuccess()}`],
          }),
        );
      } finally {
        if (pkClient! != null) await pkClient.stop();
      }
    });
  }
}

export default CommandVerify;
