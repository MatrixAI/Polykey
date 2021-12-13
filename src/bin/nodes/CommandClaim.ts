import type PolykeyClient from '../../PolykeyClient';
import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../utils/options';
import * as binProcessors from '../utils/processors';

class CommandClaim extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('claim');
    this.description('Claim another Keynode');
    this.argument('<nodeId>', 'Id of the node to claim');
    this.option(
      '-f, --force-invite',
      '(optional) Flag to force a Gestalt Invitation to be sent rather than a node claim.',
    );
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (nodeId, options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const nodesPB = await import('../../proto/js/polykey/v1/nodes/nodes_pb');

      const clientOptions = await binProcessors.processClientOptions(
        options.nodePath,
        options.nodeId,
        options.clientHost,
        options.clientPort,
        this.fs,
        this.logger.getChild(binProcessors.processClientOptions.name),
      );

      let pkClient: PolykeyClient | undefined;
      this.exitHandlers.handlers.push(async () => {
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

        const meta = await binProcessors.processAuthentication(
          options.passwordFile,
          this.fs,
        );
        const grpcClient = pkClient.grpcClient;
        const nodeClaimMessage = new nodesPB.Claim();
        nodeClaimMessage.setNodeId(nodeId);
        if (options.forceInvite) {
          nodeClaimMessage.setForceInvite(true);
        } else {
          nodeClaimMessage.setForceInvite(false);
        }

        const response = await binUtils.retryAuthentication(
          (auth) => grpcClient.nodesClaim(nodeClaimMessage, auth),
          meta,
        );
        const claimed = response.getSuccess();

        if (claimed) {
          process.stdout.write(
            binUtils.outputFormatter({
              type: options.format === 'json' ? 'json' : 'list',
              data: [
                `Successfully generated a cryptolink claim on Keynode with ID ${nodeId}`,
              ],
            }),
          );
        } else {
          process.stdout.write(
            binUtils.outputFormatter({
              type: options.format === 'json' ? 'json' : 'list',
              data: [
                `Successfully sent Gestalt Invite notification to Keynode with ID ${nodeId}`,
              ],
            }),
          );
        }
      } finally {
        if (pkClient != null) await pkClient.stop();
      }
    });
  }
}

export default CommandClaim;
