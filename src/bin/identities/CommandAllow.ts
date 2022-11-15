import type PolykeyClient from '../../PolykeyClient';
import type { GestaltId } from '../../gestalts/types';
import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../utils/options';
import * as binParsers from '../utils/parsers';
import * as binProcessors from '../utils/processors';

class CommandAllow extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('allow');
    this.description('Allow Permission for Identity');
    this.argument(
      '<gestaltId>',
      'Node ID or `Provider ID:Identity ID`',
      binParsers.parseGestaltId,
    );
    this.argument(
      '<permissions>',
      'Permission to set',
      binParsers.parseGestaltAction,
    );
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (gestaltId: GestaltId, permissions, options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const identitiesPB = await import(
        '../../proto/js/polykey/v1/identities/identities_pb'
      );
      const permissionsPB = await import(
        '../../proto/js/polykey/v1/permissions/permissions_pb'
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
        const setActionMessage = new permissionsPB.ActionSet();
        setActionMessage.setAction(permissions);
        const [type, id] = gestaltId;
        switch(type) {
          case 'node': {
            // Setting by Node
            const nodeMessage = new nodesPB.Node();
            nodeMessage.setNodeId(nodesUtils.encodeNodeId(id));
            setActionMessage.setNode(nodeMessage);
            // Trusting
            await binUtils.retryAuthentication(
              (auth) =>
                pkClient.grpcClient.gestaltsActionsSetByNode(
                  setActionMessage,
                  auth,
                ),
              meta,
            );
          }
          break;
          case 'identity': {
            // Setting By Identity
            const providerMessage = new identitiesPB.Provider();
            providerMessage.setProviderId(id[0]);
            providerMessage.setIdentityId(id[1]);
            setActionMessage.setIdentity(providerMessage);
            await binUtils.retryAuthentication(
              (auth) =>
                pkClient.grpcClient.gestaltsActionsSetByIdentity(
                  setActionMessage,
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

export default CommandAllow;
