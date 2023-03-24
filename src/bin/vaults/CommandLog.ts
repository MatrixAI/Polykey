import type PolykeyClient from '../../PolykeyClient';
import type WebSocketClient from '../../websockets/WebSocketClient';
import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../utils/options';
import * as binProcessors from '../utils/processors';

class CommandLog extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('log');
    this.description('Get the Version History of a Vault');
    this.argument('<vaultName>', 'Name of the vault to obtain the log from');
    this.addOption(binOptions.commitId);
    this.addOption(binOptions.depth);
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (vault, options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const { default: WebSocketClient } = await import(
        '../../websockets/WebSocketClient'
      );
      const { clientManifest } = await import(
        '../../client/handlers/clientManifest'
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
        const data = await binUtils.retryAuthentication(async (auth) => {
          const data: Array<string> = [];
          const logStream = await pkClient.rpcClient.methods.vaultsLog({
            metadata: auth,
            nameOrId: vault,
            depth: options.depth,
            commitId: options.commitId,
          });
          for await (const logEntryMessage of logStream) {
            data.push(`commit ${logEntryMessage.commitId}`);
            data.push(`committer ${logEntryMessage.committer}`);
            data.push(`Date: ${logEntryMessage.timestamp}`);
            data.push(`${logEntryMessage.message}`);
          }
          return data;
        }, meta);
        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data: data,
          }),
        );
      } finally {
        if (pkClient! != null) await pkClient.stop();
        if (webSocketClient! != null) await webSocketClient.destroy();
      }
    });
  }
}

export default CommandLog;
