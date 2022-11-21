import type PolykeyClient from '../../PolykeyClient';
import type { GestaltId } from '../../gestalts/types';
import type gestaltsPB from '../../proto/js/polykey/v1/gestalts/gestalts_pb';
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
      'Node ID or `Provider ID:Identity ID`',
      parsers.parseGestaltId,
    );
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (gestaltId: GestaltId, options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const identitiesPB = await import(
        '../../proto/js/polykey/v1/identities/identities_pb'
      );
      const nodesPB = await import('../../proto/js/polykey/v1/nodes/nodes_pb');
      const utils = await import('../../utils');
      const nodesUtils = await import('../../nodes/utils');
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
        let res: gestaltsPB.Graph | null = null;
        const [type, id] = gestaltId;
        switch (type) {
          case 'node':
            {
              // Getting from node
              const nodeMessage = new nodesPB.Node();
              nodeMessage.setNodeId(nodesUtils.encodeNodeId(id));
              res = await binUtils.retryAuthentication(
                (auth) =>
                  pkClient.grpcClient.gestaltsGestaltGetByNode(
                    nodeMessage,
                    auth,
                  ),
                meta,
              );
            }
            break;
          case 'identity':
            {
              // Getting from identity.
              const providerMessage = new identitiesPB.Provider();
              providerMessage.setProviderId(id[0]);
              providerMessage.setIdentityId(id[1]);
              res = await binUtils.retryAuthentication(
                (auth) =>
                  pkClient.grpcClient.gestaltsGestaltGetByIdentity(
                    providerMessage,
                    auth,
                  ),
                meta,
              );
            }
            break;
          default:
            utils.never();
        }
        const gestalt = JSON.parse(res!.getGestaltGraph());
        let output: any = gestalt;
        if (options.format !== 'json') {
          // Creating a list.
          output = [];
          // Listing nodes.
          for (const nodeKey of Object.keys(gestalt.nodes)) {
            const node = gestalt.nodes[nodeKey];
            output.push(`${node.nodeId}`);
          }
          // Listing identities
          for (const identityKey of Object.keys(gestalt.identities)) {
            const identity = gestalt.identities[identityKey];
            output.push(`${identity.providerId}:${identity.identityId}`);
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
