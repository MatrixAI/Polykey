import type PolykeyClient from '../../PolykeyClient';
import type { IdentityId, ProviderId } from '../../identities/types';
import CommandPolykey from '../CommandPolykey';
import * as binOptions from '../utils/options';
import * as binUtils from '../utils';
import * as parsers from '../utils/parsers';
import * as binProcessors from '../utils/processors';

class CommandSearch extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('search');
    this.description('Searches a Provider for any Connected Identities');
    this.argument(
      '[searchTerms...]',
      'Search parameters to apply to connected identities',
    );
    this.option(
      '-pi, --provider-id [providerId...]',
      'Digital identity provider(s) to search on',
    );
    this.option(
      '-aii, --auth-identity-id [authIdentityId]',
      'Name of your own authenticated identity to find connected identities of',
      parsers.parseIdentityId,
    );
    this.option(
      '-ii, --identity-id [identityId]',
      'Name of the digital identity to search for',
      parsers.parseIdentityId,
    );
    this.option(
      '-d, --disconnected',
      'Include disconnected identities in search',
    );
    this.option(
      '-l, --limit [number]',
      'Limit the number of search results to display to a specific number',
      parsers.parseInteger,
    );
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (searchTerms, options) => {
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
      const meta = await binProcessors.processAuthentication(
        options.passwordFile,
        this.fs,
      );
      let pkClient: PolykeyClient;
      let genReadable: ReturnType<
        typeof pkClient.grpcClient.identitiesInfoConnectedGet
      >;
      this.exitHandlers.handlers.push(async () => {
        if (genReadable != null) genReadable.stream.cancel();
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
        const providerSearchMessage = new identitiesPB.ProviderSearch();
        providerSearchMessage.setSearchTermList(searchTerms);
        if (options.providerId) {
          providerSearchMessage.setProviderIdList(options.providerId);
        }
        if (options.authIdentityId) {
          providerSearchMessage.setAuthIdentityId(options.authIdentityId);
        }
        if (options.disconnected) {
          providerSearchMessage.setDisconnected(true);
        }
        if (options.limit) {
          providerSearchMessage.setLimit(options.limit.toString());
        }
        await binUtils.retryAuthentication(async (auth) => {
          if (options.identityId) {
            providerSearchMessage.setIdentityId(options.identityId);
            genReadable = pkClient.grpcClient.identitiesInfoGet(
              providerSearchMessage,
              auth,
            );
          } else {
            genReadable = pkClient.grpcClient.identitiesInfoConnectedGet(
              providerSearchMessage,
              auth,
            );
          }
          for await (const val of genReadable) {
            const output = {
              providerId: val.getProvider()!.getProviderId() as ProviderId,
              identityId: val.getProvider()!.getIdentityId() as IdentityId,
              name: val.getName(),
              email: val.getEmail(),
              url: val.getUrl(),
            };
            process.stdout.write(
              binUtils.outputFormatter({
                type: options.format === 'json' ? 'json' : 'dict',
                data: output,
              }),
            );
          }
        }, meta);
      } finally {
        if (pkClient! != null) await pkClient.stop();
      }
    });
  }
}

export default CommandSearch;
