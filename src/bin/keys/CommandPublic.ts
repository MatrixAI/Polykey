import type PolykeyClient from '../../PolykeyClient';
import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../utils/options';
import * as binProcessors from '../utils/processors';

class CommandPublic extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('public');
    this.description('Exports the encrypted private key JWE');
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
        const passwordMessage = new utilsPB.EmptyMessage();
        const keyPairJWK = await binUtils.retryAuthentication(
          (auth) => pkClient.grpcClient.keysPublicKey(passwordMessage, auth),
          meta,
        );
        const publicKeyJWK = JSON.parse(keyPairJWK.getPublicKeyJwk());
        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'dict',
            data: publicKeyJWK,
          }),
        );
      } finally {
        if (pkClient! != null) await pkClient.stop();
      }
    });
  }
}

export default CommandPublic;
