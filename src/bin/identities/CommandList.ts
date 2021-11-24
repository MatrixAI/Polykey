import type { Metadata } from '@grpc/grpc-js';

import CommandPolykey from '../CommandPolykey';
import * as binOptions from '../options';
import * as binUtils from '../utils';
import * as parsers from '../parsers';

class CommandList extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('list');
    this.description('List all the Gestalts in the Gestalt Graph');
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const utilsPB = await import('../../proto/js/polykey/v1/utils/utils_pb');
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
        const emptyMessage = new utilsPB.EmptyMessage();
        let output: any;
        const gestalts = await binUtils.retryAuth(async (meta: Metadata) => {
          const gestalts: Array<any> = [];
          const stream = grpcClient.gestaltsGestaltList(emptyMessage, meta);
          for await (const val of stream) {
            const gestalt = JSON.parse(val.getName());
            const newGestalt: any = {
              permissions: [],
              nodes: [],
              identities: [],
            };
            for (const node of Object.keys(gestalt.nodes)) {
              const nodeInfo = gestalt.nodes[node];
              newGestalt.nodes.push({ id: nodeInfo.id });
            }
            for (const identity of Object.keys(gestalt.identities)) {
              const identityInfo = gestalt.identities[identity];
              newGestalt.identities.push({
                providerId: identityInfo.providerId,
                identityId: identityInfo.identityId,
              });
            }
            // Getting the permissions for the gestalt.
            const nodeMessage = new nodesPB.Node();
            nodeMessage.setNodeId(newGestalt.nodes[0].id);
            const actionsMessage = await binUtils.retryAuth(
              (auth?: Metadata) =>
                grpcClient.gestaltsActionsGetByNode(nodeMessage, auth),
              meta,
            );
            const actionList = actionsMessage.getActionList();
            if (actionList.length === 0) newGestalt.permissions = null;
            else newGestalt.permissions = actionList;
            gestalts.push(newGestalt);
          }
          return gestalts;
        }, meta);

        output = gestalts;
        if (options.format !== 'json') {
          // Convert to a human readable list.
          output = [];
          let count = 1;
          for (const gestalt of gestalts) {
            output.push(`gestalt ${count}`);
            output.push(`permissions: ${gestalt.permissions ?? 'None'}`);

            // Listing nodes
            for (const node of gestalt.nodes) {
              output.push(`${node.id}`);
            }
            // Listing identities
            for (const identity of gestalt.identities) {
              output.push(
                parsers.formatIdentityString(
                  identity.providerId,
                  identity.identityId,
                ),
              );
            }
            output.push('');
            count++;
          }
        }

        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data: output,
          }),
        );
      } finally {
        await client.stop();
      }
    });
  }
}

export default CommandList;
