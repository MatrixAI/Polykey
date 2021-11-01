import type { Metadata } from '@grpc/grpc-js';

import type PolykeyClient from '../../PolykeyClient';
import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../utils/options';
import * as binProcessors from '../utils/processors';

class CommandAuthenticate extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('authenticate');
    this.description('Authenticate a Digital Identity Provider');
    this.argument('<providerId>', 'Name of the digital identity provider');
    this.argument('<identityId>', 'Digital identity to authenticate');
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (providerId, identityId, options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const identitiesPB = await import(
        '../../proto/js/polykey/v1/identities/identities_pb'
      );

      const clientOptions = await binProcessors.processClientOptions(
        options.nodePath,
        options.nodeId,
        options.clientHost,
        options.clientPort,
        this.fs,
        this.logger.getChild(binProcessors.processClientOptions.name),
      );

      let pkClient: PolykeyClient | undefined;
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

        const meta = await binProcessors.processAuthentication(
          options.passwordFile,
          this.fs,
        );

        const grpcClient = pkClient.grpcClient;
        // Constructing message.
        const providerMessage = new identitiesPB.Provider();
        providerMessage.setProviderId(providerId);
        providerMessage.setMessage(identityId);
        // Sending message.
        const successMessage = await binUtils.retryAuthentication(
          async (meta: Metadata) => {
            const stream = grpcClient.identitiesAuthenticate(
              providerMessage,
              meta,
            );
            const codeMessage = (await stream.next()).value;
            process.stdout.write(
              binUtils.outputFormatter({
                type: options.format === 'json' ? 'json' : 'list',
                data: [`Your device code is: ${codeMessage!.getMessage()}`],
              }),
            );
            return (await stream.next()).value;
          },
          meta,
        );

        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data: [
              `Successfully authenticated user: ${successMessage!.getMessage()}`,
            ],
          }),
        );
      } finally {
        if (pkClient != null) await pkClient.stop();
      }
    });
  }
}

export default CommandAuthenticate;
