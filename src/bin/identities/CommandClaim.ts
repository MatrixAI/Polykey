import type { Metadata } from '@grpc/grpc-js';

import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../options';
import * as parsers from '../parsers';

class CommandClaim extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('claim');
    this.description('Claim a Digital Identity for this Keynode');
    this.argument('<providerId>', 'Name of the digital identity provider');
    this.argument('<identityId>', 'Digital identity to claim');
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
        await binUtils.retryAuth(
          (auth?: Metadata) =>
            grpcClient.identitiesClaim(providerMessage, auth),
          meta,
        );
      } finally {
        await client.stop();
      }
    });
  }
}

export default CommandClaim;
