import type PolykeyClient from '../../PolykeyClient';
import CommandPolykey from '../CommandPolykey';
import * as binOptions from '../utils/options';
import * as binUtils from '../utils';
import * as parsers from '../utils/parsers';
import * as binProcessors from '../utils/processors';

class CommandDiscover extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('discover');
    this.description(
      'Starts Discovery Process using Node or Identity as a Starting Point',
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
        let name: string;
        if (gestaltId.nodeId) {
          // Discovery by Node.
          const nodeMessage = new nodesPB.Node();
          nodeMessage.setNodeId(gestaltId.nodeId);
          name = `${gestaltId.nodeId}`;
          await binUtils.retryAuthentication(
            (auth) =>
              pkClient.grpcClient.gestaltsDiscoveryByNode(nodeMessage, auth),
            meta,
          );
        } else {
          //  Discovery by Identity
          const providerMessage = new identitiesPB.Provider();
          providerMessage.setProviderId(gestaltId.providerId);
          providerMessage.setMessage(gestaltId.identityId);
          name = `${parsers.formatIdentityString(
            gestaltId.providerId,
            gestaltId.identityId,
          )}`;
          await binUtils.retryAuthentication(
            (auth) =>
              pkClient.grpcClient.gestaltsDiscoveryByIdentity(providerMessage, auth),
            meta,
          );
        }
        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data: [`Starting discovery at: ${name}...`],
          }),
        );
      } finally {
        if (pkClient! != null) await pkClient.stop();
      }
    });
  }
}

export default CommandDiscover;
