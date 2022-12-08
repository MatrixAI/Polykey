import type { Notification } from '../../notifications/types';
import type PolykeyClient from '../../PolykeyClient';
import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../utils/options';
import * as binProcessors from '../utils/processors';

class CommandRead extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('read');
    this.description('Display Notifications');
    this.option(
      '-u, --unread',
      '(optional) Flag to only display unread notifications',
    );
    this.option(
      '-n, --number [number]',
      '(optional) Number of notifications to read',
      'all',
    );
    this.option(
      '-o, --order [order]',
      '(optional) Order to read notifications',
      'newest',
    );
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const notificationsPB = await import(
        '../../proto/js/polykey/v1/notifications/notifications_pb'
      );
      const notificationsUtils = await import('../../notifications/utils');
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
        const notificationsReadMessage = new notificationsPB.Read();
        if (options.unread) {
          notificationsReadMessage.setUnread(true);
        } else {
          notificationsReadMessage.setUnread(false);
        }
        notificationsReadMessage.setNumber(options.number);
        notificationsReadMessage.setOrder(options.order);
        const response = await binUtils.retryAuthentication(
          (auth) =>
            pkClient.grpcClient.notificationsRead(
              notificationsReadMessage,
              auth,
            ),
          meta,
        );
        const notificationMessages = response.getNotificationList();
        const notifications: Array<Notification> = [];
        for (const message of notificationMessages) {
          const notification = notificationsUtils.parseNotification(
            JSON.parse(message.getContent()),
          );
          notifications.push(notification);
        }
        for (const notification of notifications) {
          process.stdout.write(
            binUtils.outputFormatter({
              type: options.format === 'json' ? 'json' : 'dict',
              data: notification,
            }),
          );
        }
      } finally {
        if (pkClient! != null) await pkClient.stop();
      }
    });
  }
}

export default CommandRead;
