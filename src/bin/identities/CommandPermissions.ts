import type { Metadata } from '@grpc/grpc-js';

import CommandPolykey from '../CommandPolykey';
import * as binOptions from '../options';
import * as binUtils from '../utils';
import * as parsers from '../parsers';

class CommandPermissions extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('permissions');
    this.description('Gets the Permissions for a Node or Identity');
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

      const client = await PolykeyClient.createPolykeyClient({
        logger: this.logger.getChild(PolykeyClient.name),
        nodePath: options.nodePath,
      });

      const meta = await parsers.parseAuth({
        passwordFile: options.passwordFile,
        fs: this.fs,
      });

      try {
        const grpcClient = client.grpcClient;
        let actions;
        if (gestaltId.nodeId) {
          // Getting by Node.
          const nodeMessage = new nodesPB.Node();
          nodeMessage.setNodeId(gestaltId.nodeId);
          const res = await binUtils.retryAuth(
            (auth?: Metadata) =>
              grpcClient.gestaltsActionsGetByNode(nodeMessage, auth),
            meta,
          );
          actions = res.getActionList();
        } else {
          // Getting by Identity
          const providerMessage = new identitiesPB.Provider();
          providerMessage.setProviderId(gestaltId.providerId);
          providerMessage.setMessage(gestaltId.identityId);
          const res = await binUtils.retryAuth(
            (auth?: Metadata) =>
              grpcClient.gestaltsActionsGetByIdentity(providerMessage, auth),
            meta,
          );
          actions = res.getActionList();
        }

        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data: [`Permissions: ${actions}`],
          }),
        );
      } finally {
        await client.stop();
      }
    });
  }
}

export default CommandPermissions;
