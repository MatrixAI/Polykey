import type { Metadata } from '@grpc/grpc-js';

import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../options';
import * as parsers from '../parsers';

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
        // Constructing message.
        const providerMessage = new identitiesPB.Provider();
        providerMessage.setProviderId(providerId);
        providerMessage.setMessage(identityId);
        // Sending message.
        const successMessage = await binUtils.retryAuth(
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
        await client.stop();
      }
    });
  }
}

export default CommandAuthenticate;
