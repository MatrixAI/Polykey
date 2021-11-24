import type { Metadata } from '@grpc/grpc-js';

import CommandPolykey from '../CommandPolykey';
import * as binOptions from '../options';
import * as binUtils from '../utils';
import * as parsers from '../parsers';

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

        if (gestaltId.nodeId) {
          // Discovery by Node.
          const nodeMessage = new nodesPB.Node();
          nodeMessage.setNodeId(gestaltId.nodeId);
          name = `${gestaltId.nodeId}`;
          await binUtils.retryAuth(
            (auth?: Metadata) =>
              grpcClient.gestaltsDiscoveryByNode(nodeMessage, auth),
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
          await binUtils.retryAuth(
            (auth?: Metadata) =>
              grpcClient.gestaltsDiscoveryByIdentity(providerMessage, auth),
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
        await client.stop();
      }
    });
  }
}

export default CommandDiscover;
