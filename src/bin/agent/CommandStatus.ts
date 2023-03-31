import type PolykeyClient from '../../PolykeyClient';
import type WebSocketClient from '../../websockets/WebSocketClient';
import type { StatusResultMessage } from '../../client/handlers/types';
import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../utils/options';
import * as binProcessors from '../utils/processors';

class CommandStatus extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('status');
    this.description('Get the Status of the Polykey Agent');
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const { default: WebSocketClient } = await import(
        '../../websockets/WebSocketClient'
      );
      const { clientManifest } = await import(
        '../../client/handlers/clientManifest'
      );
      const clientStatus = await binProcessors.processClientStatus(
        options.nodePath,
        options.nodeId,
        options.clientHost,
        options.clientPort,
        this.fs,
        this.logger.getChild(binProcessors.processClientOptions.name),
      );
      const statusInfo = clientStatus.statusInfo;
      // If status is not LIVE, we return what we have in the status info
      // If status is LIVE, then we connect and acquire agent information
      if (statusInfo != null && statusInfo?.status !== 'LIVE') {
        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'dict',
            data: {
              status: statusInfo.status,
              ...statusInfo.data,
            },
          }),
        );
      } else {
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
        let response: StatusResultMessage;
        try {
          webSocketClient = await WebSocketClient.createWebSocketClient({
            expectedNodeIds: [clientStatus.nodeId!],
            host: clientStatus.clientHost!,
            port: clientStatus.clientPort!,
            logger: this.logger.getChild(WebSocketClient.name),
          });
          pkClient = await PolykeyClient.createPolykeyClient({
            streamFactory: (ctx) => webSocketClient.startConnection(ctx),
            nodePath: options.nodePath,
            manifest: clientManifest,
            logger: this.logger.getChild(PolykeyClient.name),
          });
          response = await binUtils.retryAuthentication(
            (auth) =>
              pkClient.rpcClient.methods.agentStatus({
                metadata: auth,
              }),
            auth,
          );
        } finally {
          if (pkClient! != null) await pkClient.stop();
          if (webSocketClient! != null) await webSocketClient.destroy();
        }
        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'dict',
            data: {
              status: 'LIVE',
              pid: response.pid,
              nodeId: response.nodeIdEncoded,
              clientHost: response.clientHost,
              clientPort: response.clientPort,
              proxyHost: response.proxyHost,
              proxyPort: response.proxyPort,
              agentHost: response.agentHost,
              agentPort: response.agentPort,
              forwardHost: response.forwardHost,
              forwardPort: response.forwardPort,
              publicKeyJWK: response.publicKeyJwk,
              certChainPEM: response.certChainPEM,
            },
          }),
        );
      }
    });
  }
}

export default CommandStatus;
