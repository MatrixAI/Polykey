import type { Metadata } from '@grpc/grpc-js';

import CommandPolykey from '../CommandPolykey';
import * as binOptions from '../options';
import * as binUtils from '../utils';
import * as parsers from '../parsers';

class CommandTrust extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('trust');
    this.description('Trust a Keynode or Identity');
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
        const action = 'notify';
        const setActionMessage = new permissionsPB.ActionSet();
        setActionMessage.setAction(action);
        let name: string;

        if (gestaltId.nodeId) {
          // Setting by Node.
          const nodeMessage = new nodesPB.Node();
          nodeMessage.setNodeId(gestaltId.nodeId);
          setActionMessage.setNode(nodeMessage);
          name = `${gestaltId.nodeId}`;
          await binUtils.retryAuth(
            (auth?: Metadata) =>
              grpcClient.gestaltsActionsSetByNode(setActionMessage, auth),
            meta,
          );
        } else {
          //  Setting by Identity
          const providerMessage = new identitiesPB.Provider();
          providerMessage.setProviderId(gestaltId.providerId!);
          providerMessage.setMessage(gestaltId.identityId!);
          setActionMessage.setIdentity(providerMessage);
          name = `${parsers.formatIdentityString(
            gestaltId.providerId,
            gestaltId.identityId,
          )}`;
          await binUtils.retryAuth(
            (auth?: Metadata) =>
              grpcClient.gestaltsActionsSetByIdentity(setActionMessage, auth),
            meta,
          );
        }

        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data: [`Trusting: ${name}`],
          }),
        );
      } finally {
        await client.stop();
      }
    });
  }
}

export default CommandTrust;
