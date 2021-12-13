import type gestaltsPB from '../../proto/js/polykey/v1/gestalts/gestalts_pb';
import type PolykeyClient from '../../PolykeyClient';
import CommandPolykey from '../CommandPolykey';
import * as binOptions from '../utils/options';
import * as binUtils from '../utils';
import * as parsers from '../utils/parsers';
import * as binProcessors from '../utils/processors';

class CommandGet extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('get');
    this.description(
      'Gets a Gestalt with a Node or Identity ID from the Gestalt Graph',
    );
    this.argument(
      '<gestaltId>',
      'Node ID or `Provider Id:Identity Id`',
      parsers.parseGestaltId,
    );
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (gestaltId, options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const identitiesPB = await import(
        '../../proto/js/polykey/v1/identities/identities_pb'
      );
      const nodesPB = await import('../../proto/js/polykey/v1/nodes/nodes_pb');
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
        let res: gestaltsPB.Graph;
        if (gestaltId.nodeId) {
          // Getting from node.
          const nodeMessage = new nodesPB.Node();
          nodeMessage.setNodeId(gestaltId.nodeId);
          res = await binUtils.retryAuthentication(
            (auth) =>
              pkClient.grpcClient.gestaltsGestaltGetByNode(nodeMessage, auth),
            meta,
          );
        } else {
          // Getting from identity.
          const providerMessage = new identitiesPB.Provider();
          providerMessage.setProviderId(gestaltId.providerId);
          providerMessage.setMessage(gestaltId.identityId);
          res = await binUtils.retryAuthentication(
            (auth) =>
              pkClient.grpcClient.gestaltsGestaltGetByIdentity(providerMessage, auth),
            meta,
          );
        }
        const gestalt = JSON.parse(res.getGestaltGraph());
        let output: any = gestalt;
        if (options.format !== 'json') {
          // Creating a list.
          output = [];
          // Listing nodes.
          for (const nodeKey of Object.keys(gestalt.nodes)) {
            const node = gestalt.nodes[nodeKey];
            output.push(`${node.id}`);
          }
          // Listing identities
          for (const identityKey of Object.keys(gestalt.identities)) {
            const identity = gestalt.identities[identityKey];
            output.push(
              parsers.formatIdentityString(
                identity.providerId,
                identity.identityId,
              ),
            );
          }
        }
        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data: output,
          }),
        );
      } finally {
        if (pkClient! != null) await pkClient.stop();
      }
    });
  }
}

export default CommandGet;
