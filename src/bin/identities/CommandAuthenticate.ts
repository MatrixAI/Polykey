import type PolykeyClient from '../../PolykeyClient';
import type WebSocketClient from '../../websockets/WebSocketClient';
import type { ClientRPCResponseResult } from '../../client/types';
import type { AuthProcessMessage } from '../../client/handlers/types';
import type { ReadableStream } from 'stream/web';
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
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (providerId, options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const { default: WebSocketClient } = await import(
        '../../websockets/WebSocketClient'
      );
      const { never } = await import('../../utils');
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
      let pkClient: PolykeyClient;
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
          streamFactory: (ctx) => webSocketClient.startConnection(ctx),
          nodePath: options.nodePath,
          logger: this.logger.getChild(PolykeyClient.name),
        });
        let genReadable: ReadableStream<
          ClientRPCResponseResult<AuthProcessMessage>
        >;
        await binUtils.retryAuthentication(async (auth) => {
          genReadable =
            await pkClient.rpcClientClient.methods.identitiesAuthenticate({
              metadata: auth,
              providerId: providerId,
            });
          for await (const message of genReadable) {
            if (message.request != null) {
              this.logger.info(`Navigate to the URL in order to authenticate`);
              this.logger.info(
                'Use any additional additional properties to complete authentication',
              );
              identitiesUtils.browser(message.request.url);
              process.stdout.write(
                binUtils.outputFormatter({
                  type: options.format === 'json' ? 'json' : 'dict',
                  data: {
                    url: message.request.url,
                    ...message.request.dataMap,
                  },
                }),
              );
            } else if (message.response != null) {
              this.logger.info(
                `Authenticated digital identity provider ${providerId}`,
              );
              process.stdout.write(
                binUtils.outputFormatter({
                  type: options.format === 'json' ? 'json' : 'list',
                  data: [message.response.identityId],
                }),
              );
            } else {
              never();
            }
          }
        }, auth);
      } finally {
        if (pkClient! != null) await pkClient.stop();
        if (webSocketClient! != null) await webSocketClient.destroy();
      }
    });
  }
}

export default CommandAuthenticate;
