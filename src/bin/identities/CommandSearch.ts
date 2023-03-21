import type PolykeyClient from '../../PolykeyClient';
import type WebSocketClient from '../../websockets/WebSocketClient';
import type { IdentityInfoMessage } from '../../client/handlers/types';
import type { ReadableStream } from 'stream/web';
import type { ClientRPCResponseResult } from '../../client/types';
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
      const { default: WebSocketClient } = await import(
        '../../websockets/WebSocketClient'
      );
      const { clientManifest } = await import('../../client/handlers');
      const clientOptions = await binProcessors.processClientOptions(
        options.nodePath,
        options.nodeId,
        options.clientHost,
        options.clientPort,
        this.fs,
        this.logger.getChild(binProcessors.processClientOptions.name),
      );
      const auth = await binProcessors.processAuthentication(
        options.passwordFile,
        this.fs,
      );
      let webSocketClient: WebSocketClient;
      let pkClient: PolykeyClient<typeof clientManifest>;
      this.exitHandlers.handlers.push(async () => {
        if (pkClient != null) await pkClient.stop();
        if (webSocketClient != null) await webSocketClient.destroy(true);
      });
      try {
        webSocketClient = await WebSocketClient.createWebSocketClient({
          expectedNodeIds: [clientOptions.nodeId],
          host: clientOptions.clientHost,
          port: clientOptions.clientPort,
          logger: this.logger.getChild(WebSocketClient.name),
        });
        pkClient = await PolykeyClient.createPolykeyClient({
          streamFactory: () => webSocketClient.startConnection(),
          nodePath: options.nodePath,
          manifest: clientManifest,
          logger: this.logger.getChild(PolykeyClient.name),
        });
        await binUtils.retryAuthentication(async (auth) => {
          let readableStream: ReadableStream<
            ClientRPCResponseResult<IdentityInfoMessage>
          >;
          if (options.identityId) {
            readableStream = await pkClient.rpcClient.methods.identitiesInfoGet(
              {
                metadata: auth,
                identityId: options.identityId,
                authIdentityId: options.authIdentityId,
                disconnected: options.disconnected,
                providerIdList: options.providerId ?? [],
                searchTermList: searchTerms,
                limit: options.limit,
              },
            );
          } else {
            readableStream =
              await pkClient.rpcClient.methods.identitiesInfoConnectedGet({
                metadata: auth,
                identityId: options.identityId,
                authIdentityId: options.authIdentityId,
                disconnected: options.disconnected,
                providerIdList: options.providerId ?? [],
                searchTermList: searchTerms,
                limit: options.limit,
              });
          }
          for await (const identityInfoMessage of readableStream) {
            const output = {
              providerId: identityInfoMessage.providerId,
              identityId: identityInfoMessage.identityId,
              name: identityInfoMessage.name,
              email: identityInfoMessage.email,
              url: identityInfoMessage.url,
            };
            process.stdout.write(
              binUtils.outputFormatter({
                type: options.format === 'json' ? 'json' : 'dict',
                data: output,
              }),
            );
          }
        }, auth);
      } finally {
        if (pkClient! != null) await pkClient.stop();
        if (webSocketClient! != null) await webSocketClient.destroy();
      }
    });
  }
}

export default CommandSearch;
