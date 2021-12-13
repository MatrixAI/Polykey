import type PolykeyClient from '../../PolykeyClient';
import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils/utils';
import * as binProcessors from '../utils/processors';
import * as binOptions from '../utils/options';

class CommandAdd extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('add');
    this.description('Add a Node to the Node Graph');
    this.argument('<nodeId>', 'Id of the node to add');
    this.argument('<host>', 'Address of the node');
    this.argument('<port>', 'Port of the node');
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (nodeId, host, port, options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const nodesPB = await import('../../proto/js/polykey/v1/nodes/nodes_pb');
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
        const nodeAddressMessage = new nodesPB.NodeAddress();
        nodeAddressMessage.setNodeId(nodeId);
        nodeAddressMessage.setAddress(
          new nodesPB.Address().setHost(host).setPort(port),
        );
        await binUtils.retryAuthentication(
          (auth) => pkClient.grpcClient.nodesAdd(nodeAddressMessage, auth),
          meta,
        );
      } finally {
        if (pkClient! != null) await pkClient.stop();
      }
    });
  }
}

export default CommandAdd;
