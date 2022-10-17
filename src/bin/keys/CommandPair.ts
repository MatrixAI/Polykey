import type PolykeyClient from '../../PolykeyClient';
import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../utils/options';
import * as binProcessors from '../utils/processors';

class CommandKeypair extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('keypair');
    this.description(
      'Exports the encrypted private key JWE and public key JWK',
    );
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.addOption(binOptions.passwordNewFile);
    this.action(async (options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const sessionsPB = await import(
        '../../proto/js/polykey/v1/sessions/sessions_pb'
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
      const passwordNew = await binProcessors.processNewPassword(
        options.passwordNewFile,
        this.fs,
        true,
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
        const passwordMessage = new sessionsPB.Password();
        passwordMessage.setPassword(passwordNew);
        const keyPairJWK = await binUtils.retryAuthentication(
          (auth) => pkClient.grpcClient.keysKeyPair(passwordMessage, auth),
          meta,
        );
        const publicKeyJWK = JSON.parse(keyPairJWK.getPublicKeyJwk());
        const privateKeyJWE = JSON.parse(keyPairJWK.getPrivateKeyJwe());
        const pair = {
          publicKey: publicKeyJWK,
          privateKey: privateKeyJWE,
        };
        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'dict',
            data: pair,
          }),
        );
      } finally {
        if (pkClient! != null) await pkClient.stop();
      }
    });
  }
}

export default CommandKeypair;
