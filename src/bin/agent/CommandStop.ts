import type { StatusInfo } from '../../status/types';
import type PolykeyClient from '../../PolykeyClient';
import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../utils/options';
import * as binProcessors from '../utils/processors';
import * as binErrors from '../errors';

class CommandStop extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('stop');
    this.description('Stop the Polykey Agent');
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const utilsPB = await import('../../proto/js/polykey/v1/utils/utils_pb');
      const clientStatus = await binProcessors.processClientStatus(
        options.nodePath,
        options.nodeId,
        options.clientHost,
        options.clientPort,
        this.fs,
        this.logger.getChild(binProcessors.processClientOptions.name),
      );
      const statusInfo = clientStatus.statusInfo;
      if (
        statusInfo?.status === 'DEAD'
      ) {
        this.logger.info('Agent is already dead');
        return;
      } else if (statusInfo?.status === 'STOPPING') {
        this.logger.info('Agent is already stopping');
        return;
      } else if (statusInfo?.status === 'STARTING') {
        throw new binErrors.ErrorCLIStatusStarting();
      }
      // Either the statusInfo is undefined or LIVE
      // Either way, the connection parameters now exist
      let pkClient: PolykeyClient;
      this.exitHandlers.handlers.push(async () => {
        if (pkClient != null) await pkClient.stop();
      });
      try {
        pkClient = await PolykeyClient.createPolykeyClient({
          nodePath: options.nodePath,
          nodeId: clientStatus.nodeId!,
          host: clientStatus.clientHost!,
          port: clientStatus.clientPort!,
          logger: this.logger.getChild(PolykeyClient.name),
        });
        const meta = await binProcessors.processAuthentication(
          options.passwordFile,
          this.fs,
        );
        const emptyMessage = new utilsPB.EmptyMessage();
        const grpcClient = pkClient.grpcClient;
        await binUtils.retryAuthentication(
          (auth) => grpcClient.agentStop(emptyMessage, auth),
          meta,
        );
        this.logger.info('Stopping Agent');
      } finally {
        if (pkClient! != null) await pkClient.stop();
      }
    });
  }
}

export default CommandStop;
