import type { Metadata } from '@grpc/grpc-js';

import CommandPolykey from '../CommandPolykey';
import * as binOptions from '../options';
import * as binUtils from '../utils';
import * as parsers from '../parsers';

class CommandDisallow extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('disallow');
    this.description('Disallow Permission for Identity');
    this.argument(
      '<gestaltId>',
      'Node ID or `Provider Id:Identity Id`',
      parsers.parseGestaltId,
    );
    this.argument('<permissions>', 'Permission to unset');
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (gestaltId, permissions, options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const identitiesPB = await import(
        '../../proto/js/polykey/v1/identities/identities_pb'
      );
      const permissionsPB = await import(
        '../../proto/js/polykey/v1/permissions/permissions_pb'
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
        let name: string;
        const setActionMessage = new permissionsPB.ActionSet();
        setActionMessage.setAction(permissions);

        if (gestaltId.nodeId) {
          // Setting by Node.
          const nodeMessage = new nodesPB.Node();
          nodeMessage.setNodeId(gestaltId.nodeId);
          setActionMessage.setNode(nodeMessage);
          name = `${gestaltId.nodeId}`;
          // Trusting
          await binUtils.retryAuth(
            (auth?: Metadata) =>
              grpcClient.gestaltsActionsUnsetByNode(setActionMessage, auth),
            meta,
          );
        } else {
          //  Setting by Identity
          const providerMessage = new identitiesPB.Provider();
          providerMessage.setProviderId(gestaltId.providerId);
          providerMessage.setMessage(gestaltId.identityId);
          setActionMessage.setIdentity(providerMessage);
          name = `${parsers.formatIdentityString(
            gestaltId.providerId,
            gestaltId.identityId,
          )}`;
          // Trusting.
          await binUtils.retryAuth(
            (auth?: Metadata) =>
              grpcClient.gestaltsActionsUnsetByIdentity(setActionMessage, auth),
            meta,
          );
        }

        const action = options.action;
        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data: [`Allowing: ${name} ${action}`],
          }),
        );
      } finally {
        await client.stop();
      }
    });
  }
}

export default CommandDisallow;
