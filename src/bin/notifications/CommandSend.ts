import type PolykeyClient from '../../PolykeyClient';
import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../utils/options';
import * as binProcessors from '../utils/processors';

class CommandSend extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('send');
    this.description('Send a Notification with a Message to another Node');
    this.argument('<nodeId>', 'Id of the node to send a message to');
    this.argument('<message>', 'Message to send');
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (node, message, options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const notificationsPB = await import(
        '../../proto/js/polykey/v1/notifications/notifications_pb'
      );
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
        const notificationsSendMessage = new notificationsPB.Send();
        const generalMessage = new notificationsPB.General();
        generalMessage.setMessage(message);
        notificationsSendMessage.setReceiverId(node);
        notificationsSendMessage.setData(generalMessage);
        await binUtils.retryAuthentication(
          (auth) =>
            pkClient.grpcClient.notificationsSend(
              notificationsSendMessage,
              auth,
            ),
          meta,
        );
      } finally {
        if (pkClient! != null) await pkClient.stop();
      }
    });
  }
}

export default CommandSend;
