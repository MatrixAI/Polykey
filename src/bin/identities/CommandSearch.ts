import type { Metadata } from '@grpc/grpc-js';
import type { ProviderId, IdentityId } from '../../identities/types';

import CommandPolykey from '../CommandPolykey';
import * as binOptions from '../options';
import * as binUtils from '../utils';
import * as parsers from '../parsers';

class CommandSearch extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('search');
    this.description('Searches a Provider for any Connected Identities');
    this.argument(
      '<providerId>',
      'Name of the digital identity provider to search on',
    );
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (providerId, options) => {
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
        const providerMessage = new identitiesPB.Provider();
        providerMessage.setProviderId(providerId);
        const res = await binUtils.retryAuth(
          (auth?: Metadata) =>
            grpcClient.identitiesInfoGet(providerMessage, auth),
          meta,
        );

        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data: [
              parsers.formatIdentityString(
                res.getProviderId() as ProviderId,
                res.getMessage() as IdentityId,
              ),
            ],
          }),
        );
      } finally {
        await client.stop();
      }
    });
  }
}

export default CommandSearch;
