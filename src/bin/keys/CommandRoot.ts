import type PolykeyClient from '../../PolykeyClient';
import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../utils/options';
import * as binProcessors from '../utils/processors';

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
        const emptyMessage = new utilsPB.EmptyMessage();
        const keyPair = await binUtils.retryAuthentication(
          (auth) => pkClient.grpcClient.keysKeyPairRoot(emptyMessage, auth),
          meta,
        );
        const result: any = {
          publicKey: keyPair.getPublic(),
        };
        if (options.privateKey) result.privateKey = keyPair.getPrivate();
        let output: any = result;
        if (options.format === 'human') {
          output = [`Public key:\t\t${result.publicKey}`];
          if (options.privateKey) {
            output.push(`Private key:\t\t${result.private}`);
          }
        }
        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data: output,
          }),
        );
      } finally {
        if (pkClient! != null) await pkClient.stop();
      }
    });
  }
}

export default CommandRoot;
