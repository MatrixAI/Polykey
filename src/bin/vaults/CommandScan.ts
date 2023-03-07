import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../utils/options';
import * as binProcessors from '../utils/processors';

class CommandScan extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('scan');
    this.description('Scans a node to reveal their shared vaults');
    this.argument('<nodeId>', 'Id of the node to scan');
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (nodeId, options) => {
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
      const client = await PolykeyClient.createPolykeyClient({
        nodePath: options.nodePath,
        nodeId: clientOptions.nodeId,
        host: clientOptions.clientHost,
        port: clientOptions.clientPort,
        manifest: clientManifest,
        logger: this.logger.getChild(PolykeyClient.name),
      });

      const meta = await binProcessors.processAuthentication(
        options.passwordFile,
        this.fs,
      );

      try {
        const rpcClient = client.rpcClient;
        const data = await binUtils.retryAuthentication(async (auth) => {
          const data: Array<string> = [];
          const stream = await rpcClient.methods.vaultsScan({
            metadata: auth,
            nodeIdEncoded: nodeId,
          });
          for await (const vault of stream) {
            const vaultName = vault.vaultName;
            const vaultIdEncoded = vault.vaultIdEncoded;
            const permissions = vault.permissions.join(',');
            data.push(`${vaultName}\t\t${vaultIdEncoded}\t\t${permissions}`);
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
        await client.stop();
      }
    });
  }
}

export default CommandScan;
