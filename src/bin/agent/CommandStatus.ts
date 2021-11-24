import type { Metadata } from '@grpc/grpc-js';

import type PolykeyClient from '@/PolykeyClient';
import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../options';
import * as parsers from '../parsers';
import * as errors from '../../errors';

class CommandStatus extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('status');
    this.description('Get the Status of the Polykey Agent');
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const utilsPB = await import('../../proto/js/polykey/v1/utils/utils_pb');
      let client: PolykeyClient;
      try {
        client = await PolykeyClient.createPolykeyClient({
          nodePath: options.nodePath,
          logger: this.logger.getChild(PolykeyClient.name),
        });
      } catch (err) {
        if (err instanceof errors.ErrorPolykey) {
          process.stdout.write(
            binUtils.outputFormatter({
              type: options.format === 'json' ? 'json' : 'list',
              data: [`Agent is offline.`],
            }),
          );
        }
        throw err;
      }

      const meta = await parsers.parseAuth({
        passwordFile: options.passwordFile,
        fs: this.fs,
      });

      try {
        const grpcClient = client.grpcClient;
        const emptyMessage = new utilsPB.EmptyMessage();

        const response = await binUtils.retryAuth(
          (auth?: Metadata) => grpcClient.agentStatus(emptyMessage, auth),
          meta,
        );
        const nodeMessage = response.getNodeId()!;
        const addressMessage = response.getAddress()!;
        const certMessage = response.getCert()!;

        const nodeId = nodeMessage.getNodeId();
        const host = addressMessage.getHost();
        const port = addressMessage.getPort();
        const certChain = certMessage.getCert();
        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data: [
              `Agent is online.`,
              `Node ID: ${nodeId}`,
              `Host: ${host}`,
              `Port: ${port}`,
              `Root Certificate Chain: ${certChain}`,
            ],
          }),
        );
      } finally {
        await client.stop();
      }
    });
  }
}

export default CommandStatus;
