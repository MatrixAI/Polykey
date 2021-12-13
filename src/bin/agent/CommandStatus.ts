import type PolykeyClient from '../../PolykeyClient';
import type * as agentPB from '../../proto/js/polykey/v1/agent/agent_pb';
import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../utils/options';
import * as binProcessors from '../utils/processors';

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
      const clientStatus = await binProcessors.processClientStatus(
        options.nodePath,
        options.nodeId,
        options.clientHost,
        options.clientPort,
        this.fs,
        this.logger.getChild(binProcessors.processClientOptions.name),
      );
      const statusInfo = clientStatus.statusInfo;
      // If status is not LIVE, we return what we have in the status info
      // If status is LIVE, then we connect and acquire agent information
      if (statusInfo != null && statusInfo?.status !== 'LIVE') {
        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'dict',
            data: {
              status: statusInfo.status,
              ...statusInfo.data,
            },
          }),
        );
      } else {
        const meta = await binProcessors.processAuthentication(
          options.passwordFile,
          this.fs,
        );
        let pkClient: PolykeyClient;
        this.exitHandlers.handlers.push(async () => {
          if (pkClient != null) await pkClient.stop();
        });
        let response: agentPB.InfoMessage;
        try {
          pkClient = await PolykeyClient.createPolykeyClient({
            nodeId: clientStatus.nodeId!,
            host: clientStatus.clientHost!,
            port: clientStatus.clientPort!,
            nodePath: options.nodePath,
            logger: this.logger.getChild(PolykeyClient.name),
          });
          const emptyMessage = new utilsPB.EmptyMessage();
          response = await binUtils.retryAuthentication(
            (auth) => pkClient.grpcClient.agentStatus(emptyMessage, auth),
            meta,
          );
        } finally {
          if (pkClient! != null) await pkClient.stop();
        }
        const pid = response.getPid();
        const nodeId = response.getNodeId();
        const clientHost = response.getClientHost();
        const clientPort = response.getClientPort();
        const ingressHost = response.getIngressHost();
        const ingressPort = response.getIngressPort();
        const egressHost = response.getEgressHost();
        const egressPort = response.getEgressPort();
        const agentHost = response.getAgentHost();
        const agentPort = response.getAgentPort();
        const proxyHost = response.getProxyHost();
        const proxyPort = response.getProxyPort();
        const rootPublicKeyPem = response.getRootPublicKeyPem();
        const rootCertPem = response.getRootCertPem();
        const rootCertChainPem = response.getRootCertChainPem();
        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'dict',
            data: {
              status: 'LIVE',
              pid,
              nodeId,
              clientHost,
              clientPort,
              ingressHost,
              ingressPort,
              egressHost,
              egressPort,
              agentHost,
              agentPort,
              proxyHost,
              proxyPort,
              rootPublicKeyPem,
              rootCertPem,
              rootCertChainPem,
            },
          }),
        );
      }
    });
  }
}

export default CommandStatus;
