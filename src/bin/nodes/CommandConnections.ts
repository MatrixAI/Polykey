import type PolykeyClient from '../../PolykeyClient';
import type { NodeConnectionMessage } from '../../client/handlers/types';
import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils/utils';
import * as binProcessors from '../utils/processors';

class CommandAdd extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('connections');
    this.description('list all active node connections');
    this.action(async (options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
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
      let pkClient: PolykeyClient<typeof clientManifest>;
      this.exitHandlers.handlers.push(async () => {
        if (pkClient != null) await pkClient.stop();
      });
      try {
        pkClient = await PolykeyClient.createPolykeyClient({
          nodePath: options.nodePath,
          nodeId: clientOptions.nodeId,
          host: clientOptions.clientHost,
          port: clientOptions.clientPort,
          manifest: clientManifest,
          logger: this.logger.getChild(PolykeyClient.name),
        });
        // DO things here...
        // Like create the message.
        const connections = await binUtils.retryAuthentication(async (auth) => {
          const connections =
            await pkClient.rpcClient.methods.nodesListConnections({
              metadata: auth,
            });
          const connectionEntries: Array<NodeConnectionMessage> = [];
          for await (const connection of connections) {
            connectionEntries.push(connection);
          }
          return connectionEntries;
        }, auth);
        if (options.format === 'human') {
          const output: Array<string> = [];
          for (const connection of connections) {
            const hostnameString =
              connection.hostname === '' ? '' : `(${connection.hostname})`;
            const hostString = `${connection.nodeIdEncoded}@${connection.host}${hostnameString}:${connection.port}`;
            const usageCount = connection.usageCount;
            const timeout =
              connection.timeout === -1 ? 'NA' : `${connection.timeout}`;
            const outputLine = `${hostString}\t${usageCount}\t${timeout}`;
            output.push(outputLine);
          }
          process.stdout.write(
            binUtils.outputFormatter({
              type: 'list',
              data: output,
            }),
          );
        } else {
          process.stdout.write(
            binUtils.outputFormatter({
              type: 'json',
              data: connections,
            }),
          );
        }
      } finally {
        if (pkClient! != null) await pkClient.stop();
      }
    });
  }
}

export default CommandAdd;
