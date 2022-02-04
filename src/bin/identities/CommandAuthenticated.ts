import type PolykeyClient from '../../PolykeyClient';
import type { IdentityId, ProviderId } from '../../identities/types';
import CommandPolykey from '../CommandPolykey';
import * as binOptions from '../utils/options';
import * as binUtils from '../utils';
import * as parsers from '../utils/parsers';
import * as binProcessors from '../utils/processors';

class CommandAuthenticated extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('authenticated');
    this.description('Lists all authenticated identities across all providers');
    this.option(
      '-pi, --provider-id [providerId]',
      'Digital identity provider to retrieve tokens from',
      parsers.parseProviderId,
    );
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (options) => {
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
        typeof pkClient.grpcClient.identitiesAuthenticatedGet
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
        const optionalProviderMessage = new identitiesPB.OptionalProvider();
        if (options.providerId) {
          optionalProviderMessage.setProviderId(options.providerId);
        }
        await binUtils.retryAuthentication(async (auth) => {
          const genReadable = pkClient.grpcClient.identitiesAuthenticatedGet(
            optionalProviderMessage,
            auth,
          );
          for await (const val of genReadable) {
            const output = {
              providerId: val.getProviderId() as ProviderId,
              identityId: val.getIdentityId() as IdentityId,
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

export default CommandAuthenticated;
