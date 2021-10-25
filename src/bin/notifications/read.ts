import type { Notification } from '../../notifications/types';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { createCommand, outputFormatter } from '../utils';
import { errors } from '../../grpc';
import { clientPB, utils as clientUtils } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import * as utils from '../../utils';
import * as notificationsUtils from '../../notifications/utils';

const read = createCommand('read', {
  description: {
    description: 'Displays notifications and marks them as "read"',
    args: {
      unread: 'Flag to only display unread notifications',
      number: 'Number of notifications to read (default all)',
      order:
        'Order to read notifications - "newest" for newest first and "oldest" for oldest first (default newest)',
    },
  },
  nodePath: true,
  verbose: true,
  format: true,
});
read.option(
  '-u, --unread',
  '(optional) Flag to only display unread notifications',
);
read.option(
  '-n, --number <number>',
  '(optional) Number of notifications to read',
  'all',
);
read.option(
  '-o, --order <order>',
  '(optional) Order to read notifications',
  'newest',
);
read.action(async (options) => {
  const clientConfig = {};
  clientConfig['logger'] = new Logger('CLI Logger', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  if (options.verbose) {
    clientConfig['logger'].setLevel(LogLevel.DEBUG);
  }
  clientConfig['nodePath'] = options.nodePath
    ? options.nodePath
    : utils.getDefaultNodePath();

  const client = await PolykeyClient.createPolykeyClient(clientConfig);
  const notificationsReadMessage = new clientPB.NotificationsReadMessage();

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    if (options.unread) {
      notificationsReadMessage.setUnread(true);
    } else {
      notificationsReadMessage.setUnread(false);
    }
    notificationsReadMessage.setNumber(options.number);
    notificationsReadMessage.setOrder(options.order);

    const pCall = grpcClient.notificationsRead(notificationsReadMessage);
    const { p, resolveP } = utils.promise();
    pCall.call.on('metadata', async (meta) => {
      await clientUtils.refreshSession(meta, client.session);
      resolveP(null);
    });

    const response = await pCall;
    await p;

    const notificationMessages = response.getNotificationList();
    const notifications: Array<Notification> = [];
    for (const message of notificationMessages) {
      let data;
      switch (message.getDataCase()) {
        case clientPB.NotificationsMessage.DataCase.GENERAL: {
          data = {
            type: 'General',
            message: message.getGeneral()!.getMessage(),
          };
          break;
        }
        case clientPB.NotificationsMessage.DataCase.GESTALT_INVITE: {
          data = {
            type: 'GestaltInvite',
          };
          break;
        }
        case clientPB.NotificationsMessage.DataCase.VAULT_SHARE: {
          const actions = message.getVaultShare()!.getActionsList();
          data = {
            type: 'VaultShare',
            vaultId: message.getVaultShare()!.getVaultId(),
            vaultName: message.getVaultShare()!.getVaultName(),
            actions: actions.reduce(
              (acc, curr) => ((acc[curr] = null), acc),
              {},
            ),
          };
          break;
        }
      }

      const notification = {
        data: data,
        senderId: message.getSenderId(),
        isRead: message.getIsRead(),
      };
      notifications.push(notificationsUtils.validateNotification(notification));
    }

    if (notifications.length === 0) {
      process.stdout.write(
        outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: [`No notifications to display`],
        }),
      );
    } else {
      const output: any = [];
      let notifCount = 1;
      for (const notification of notifications) {
        output.push(`${notifCount} - `);
        switch (notification.data.type) {
          case 'General': {
            output.push(
              `Message from Keynode with ID ${notification.senderId}: ${notification.data.message}`,
            );
            output.push('');
            break;
          }
          case 'GestaltInvite': {
            output.push(
              `Keynode with ID ${notification.senderId} has invited you to join their Gestalt. Type the following command to accept their invitation: nodes claim ${notification.senderId}`,
            );
            output.push('');
            break;
          }
          case 'VaultShare': {
            output.push(
              `Keynode with ID ${notification.senderId} has shared their vault '${notification.data.vaultName}' with you.`,
            );
            output.push('');
            break;
          }
        }
        notifCount++;
      }
      process.stdout.write(
        outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: output,
        }),
      );
    }
  } catch (err) {
    if (err instanceof errors.ErrorGRPCClientTimeout) {
      process.stderr.write(`${err.message}\n`);
    }
    if (err instanceof errors.ErrorGRPCServerNotStarted) {
      process.stderr.write(`${err.message}\n`);
    } else {
      process.stdout.write(
        outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: ['Error:', err.message],
        }),
      );
    }
    throw err;
  } finally {
    await client.stop();
    options.nodePath = undefined;
    options.verbose = undefined;
    options.format = undefined;
    options.unread = undefined;
    options.number = 'all';
    options.order = 'newest';
  }
});

export default read;
