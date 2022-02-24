import type PolykeyClient from '../../PolykeyClient';
import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../utils/options';
import * as binProcessors from '../utils/processors';
import * as binErrors from '../errors';
import config from '../../config';

class CommandRestart extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('restart');
    this.description('Restart the Polykey Agent');
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.addOption(binOptions.ingressHost);
    this.addOption(binOptions.ingressPort);
    this.addOption(binOptions.fresh);
    this.action(async (options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const agentPB = await import('../../proto/js/polykey/v1/agent/agent_pb');
      const clientStatus = await binProcessors.processClientStatus(
        options.nodePath,
        options.nodeId,
        options.clientHost,
        options.clientPort,
        this.fs,
        this.logger.getChild(binProcessors.processClientOptions.name),
      );
      const statusInfo = clientStatus.statusInfo;
      if (statusInfo?.status === 'DEAD') {
        this.logger.info('Agent is already dead');
        return;
      } else if (statusInfo?.status === 'STOPPING') {
        this.logger.info('Agent is already stopping');
        return;
      } else if (statusInfo?.status === 'STARTING') {
        throw new binErrors.ErrorCLIStatusStarting();
      }
      const meta = await binProcessors.processAuthentication(
        options.passwordFile,
        this.fs,
      );
      const password = await binProcessors.processPassword(
        options.passwordFile,
        this.fs,
      );
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
        const restartMessage = new agentPB.RestartMessage();
        restartMessage.setPassword(password);
        restartMessage.setClientHost(
          options.clientHost ?? config.defaults.networkConfig.clientHost,
        );
        restartMessage.setClientPort(
          options.clientPort ?? config.defaults.networkConfig.clientPort,
        );
        restartMessage.setIngressHost(options.ingressHost);
        restartMessage.setIngressPort(options.ingressPort);
        restartMessage.setFresh(options.fresh);
        await binUtils.retryAuthentication(
          (auth) => pkClient.grpcClient.agentRestart(restartMessage, auth),
          meta,
        );
        this.logger.info('Restarting Agent');
      } finally {
        if (pkClient! != null) await pkClient.stop();
      }
    });
  }
}

export default CommandRestart;
