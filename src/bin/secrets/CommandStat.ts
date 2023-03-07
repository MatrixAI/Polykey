import type PolykeyClient from '../../PolykeyClient';
import * as binProcessors from '../utils/processors';
import * as parsers from '../utils/parsers';
import * as binUtils from '../utils';
import CommandPolykey from '../CommandPolykey';
import * as binOptions from '../utils/options';

class CommandStat extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('stat');
    this.description('Vaults Stat');
    this.argument(
      '<secretPath>',
      'Path to where the secret, specified as <vaultName>:<directoryPath>',
      parsers.parseSecretPath,
    );
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (secretPath, options) => {
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
      const meta = await binProcessors.processAuthentication(
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
        // Get the secret's stat.
        const response = await binUtils.retryAuthentication(
          (auth) =>
            pkClient.rpcClient.methods.vaultsSecretsStat({
              metadata: auth,
              nameOrId: secretPath[0],
              secretName: secretPath[1],
            }),
          meta,
        );

        const data: string[] = [`Stats for "${secretPath[1]}"`];
        for (const [key, value] of Object.entries(response.stat)) {
          data.push(`${key}: ${value}`);
        }

        // Print out the result.
        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data,
          }),
        );
      } finally {
        if (pkClient! != null) await pkClient.stop();
      }
    });
  }
}

export default CommandStat;
