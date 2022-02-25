import type PolykeyClient from '../../PolykeyClient';
import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../utils/options';
import * as parsers from '../utils/parsers';
import * as binProcessors from '../utils/processors';
import * as identitiesUtils from '../../identities/utils';

class CommandAuthenticate extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('authenticate');
    this.description('Authenticate a Digital Identity Provider');
    this.argument(
      '<providerId>',
      'Name of the digital identity provider',
      parsers.parseProviderId,
    );
    this.argument(
      '<identityId>',
      'Digital identity to authenticate',
      parsers.parseIdentityId,
    );
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
      const meta = await binProcessors.processAuthentication(
        options.passwordFile,
        this.fs,
      );
      let pkClient: PolykeyClient;
      let genReadable: ReturnType<
        typeof pkClient.grpcClient.identitiesAuthenticate
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
        const providerMessage = new identitiesPB.Provider();
        providerMessage.setProviderId(providerId);
        providerMessage.setIdentityId(identityId);
        await binUtils.retryAuthentication(async (auth) => {
          genReadable = pkClient.grpcClient.identitiesAuthenticate(
            providerMessage,
            auth,
          );
          for await (const message of genReadable) {
            switch (message.getStepCase()) {
              case identitiesPB.AuthenticationProcess.StepCase.REQUEST: {
                const authRequest = message.getRequest()!;
                this.logger.info(
                  `Navigate to the URL in order to authenticate`,
                );
                this.logger.info(
                  'Use any additional additional properties to complete authentication',
                );
                identitiesUtils.browser(authRequest.getUrl());
                process.stdout.write(
                  binUtils.outputFormatter({
                    type: options.format === 'json' ? 'json' : 'dict',
                    data: {
                      url: authRequest.getUrl(),
                      ...Object.fromEntries(authRequest.getDataMap().entries()),
                    },
                  }),
                );
                break;
              }
              case identitiesPB.AuthenticationProcess.StepCase.RESPONSE: {
                const authResponse = message.getResponse()!;
                this.logger.info(
                  `Authenticated digital identity provider ${providerId} with identity ${identityId}`,
                );
                process.stdout.write(
                  binUtils.outputFormatter({
                    type: options.format === 'json' ? 'json' : 'list',
                    data: [authResponse.getIdentityId()],
                  }),
                );
                break;
              }
            }
          }
        }, meta);
      } finally {
        if (pkClient! != null) await pkClient.stop();
      }
    });
  }
}

export default CommandAuthenticate;
