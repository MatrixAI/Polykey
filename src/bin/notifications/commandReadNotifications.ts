import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { createCommand, outputFormatter } from '../utils';
import { errors } from '../../grpc';
import { clientPB } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import * as utils from '../../utils';

const commandReadNotifications = createCommand('read', {
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
commandReadNotifications.option(
  '-u, --unread <unread>',
  '(optional) Flag to only display unread notifications',
  false,
);
commandReadNotifications.option(
  '-n, --number <number>',
  '(optional) Number of notifications to read',
  'all',
);
commandReadNotifications.option(
  '-o, --order <order>',
  '(optional) Order to read notifications',
  'newest',
);
commandReadNotifications.action(async (options) => {
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

  const client = new PolykeyClient(clientConfig);
  const notificationDisplayMessage = new clientPB.NotificationDisplayMessage();

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    notificationDisplayMessage.setUnread(options.unread);

    const numberMessage = new clientPB.NumberMessage();
    if (options.number === 'all') {
      numberMessage.setAll('all');
    } else {
      numberMessage.setNumber(parseInt(options.number));
    }
    notificationDisplayMessage.setNumber(numberMessage);

    notificationDisplayMessage.setOrder(options.order);

    const response = await grpcClient.notificationsRead(
      notificationDisplayMessage,
      await client.session.createJWTCallCredentials(),
    );
    const notifications = JSON.parse(response.getMessages());

    if (notifications.length === 0) {
      process.stdout.write(
        outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: [`No notifications to display`],
        }),
      );
    } else {
      const output: any = [];
      let count = 1;
      for (const notification of notifications) {
        output.push(`Notification ${count}`);
        output.push(`"${notification}"`);
        output.push('');
        count++;
      }
      process.stdout.write(
        outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: output,
        }),
      );
    }
  } catch (err) {
    console.error(err);
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
  } finally {
    client.stop();
  }
});

export default commandReadNotifications;
