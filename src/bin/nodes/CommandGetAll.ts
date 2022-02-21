import type PolykeyClient from '../../PolykeyClient';
import type nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../utils/options';
import * as binProcessors from '../utils/processors';

class CommandGetAll extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('getall');
    this.description('Get all Nodes from Node Graph');
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const utilsPB = await import('../../proto/js/polykey/v1/utils/utils_pb');

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
      let result: nodesPB.NodeBuckets;
      try {
        pkClient = await PolykeyClient.createPolykeyClient({
          nodePath: options.nodePath,
          nodeId: clientOptions.nodeId,
          host: clientOptions.clientHost,
          port: clientOptions.clientPort,
          logger: this.logger.getChild(PolykeyClient.name),
        });
        const emptyMessage = new utilsPB.EmptyMessage();
        try {
          result = await binUtils.retryAuthentication(
            (auth) => pkClient.grpcClient.nodesGetAll(emptyMessage, auth),
            meta,
          );
        } catch (err) {
          throw err;
        }
        let output: any = {};
        for (const [bucketIndex, bucket] of result.getBucketsMap().entries()) {
          output[bucketIndex] = {};
          for (const [encodedId, address] of bucket
            .getNodeTableMap()
            .entries()) {
            output[bucketIndex][encodedId] = {};
            output[bucketIndex][encodedId].host = address.getHost();
            output[bucketIndex][encodedId].port = address.getPort();
          }
        }
        if (options.format === 'human') {
          output = [result.getBucketsMap().getEntryList()];
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

export default CommandGetAll;
