import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { createCommand, outputFormatter } from '../utils';
import { errors } from '../../grpc';
import { clientPB } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import * as utils from '../../utils';

const commandSendNotification = createCommand('send', {
  description: {
    description: 'Sends a notification to another node',
    args: {
      nodeId: 'Id of the node to send notification to',
      message: 'Message to send in notification',
    },
  },
  nodePath: true,
  verbose: true,
  format: true,
});
commandSendNotification.arguments('<nodeId> <message>');
commandSendNotification.action(async (nodeId, message, options) => {
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
  const notificationInfoMessage = new clientPB.NotificationInfoMessage();

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    notificationInfoMessage.setReceiverId(nodeId);
    notificationInfoMessage.setMessage(message);

    await grpcClient.notificationsSend(
      notificationInfoMessage,
      await client.session.createCallCredentials(),
    );

    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [
          `Successsfully sent notification: "${notificationInfoMessage.getMessage()}" to Node with ID: ${notificationInfoMessage.getReceiverId()}`,
        ],
      }),
    );
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
    await client.stop();
  }
});

export default commandSendNotification;
