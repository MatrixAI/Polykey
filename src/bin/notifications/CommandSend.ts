import type { Metadata } from '@grpc/grpc-js';

import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../options';
import * as parsers from '../parsers';

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

      const client = await PolykeyClient.createPolykeyClient({
        nodePath: options.nodePath,
        logger: this.logger.getChild(PolykeyClient.name),
      });

      const meta = await parsers.parseAuth({
        passwordFile: options.passwordFile,
        fs: this.fs,
      });

      try {
        const grpcClient = client.grpcClient;
        const notificationsSendMessage = new notificationsPB.Send();
        const generalMessage = new notificationsPB.General();
        generalMessage.setMessage(message);
        notificationsSendMessage.setReceiverId(node);
        notificationsSendMessage.setData(generalMessage);

        await binUtils.retryAuth(
          (auth?: Metadata) =>
            grpcClient.notificationsSend(notificationsSendMessage, auth),
          meta,
        );

        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data: [
              `Successsfully sent notification: "${notificationsSendMessage
                .getData()
                ?.getMessage()}" to Keynode with ID: ${notificationsSendMessage.getReceiverId()}`,
            ],
          }),
        );
      } finally {
        await client.stop();
      }
    });
  }
}

export default CommandSend;
