import type PolykeyClient from '../../PolykeyClient';
import type { GestaltId } from '../../gestalts/types';
import CommandPolykey from '../CommandPolykey';
import * as binOptions from '../utils/options';
import * as binUtils from '../utils';
import * as parsers from '../utils/parsers';
import * as binProcessors from '../utils/processors';

class CommandDiscover extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('discover');
    this.description('Adds a Node or Identity to the Discovery Queue');
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
        const [type, id] = gestaltId;
        switch (type) {
          case 'node':
            {
              // Discovery by Node
              const nodeMessage = new nodesPB.Node();
              nodeMessage.setNodeId(nodesUtils.encodeNodeId(id));
              await binUtils.retryAuthentication(
                (auth) =>
                  pkClient.grpcClient.gestaltsDiscoveryByNode(
                    nodeMessage,
                    auth,
                  ),
                meta,
              );
            }
            break;
          case 'identity':
            {
              //  Discovery by Identity
              const providerMessage = new identitiesPB.Provider();
              providerMessage.setProviderId(id[0]);
              providerMessage.setIdentityId(id[1]);
              await binUtils.retryAuthentication(
                (auth) =>
                  pkClient.grpcClient.gestaltsDiscoveryByIdentity(
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
      } finally {
        if (pkClient! != null) await pkClient.stop();
      }
    });
  }
}

export default CommandDiscover;
