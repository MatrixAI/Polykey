import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { createCommand, outputFormatter } from '../utils';
import { errors } from '../../grpc';
import { utils as clientUtils } from '../../client';
import * as notificationsPB from '../../proto/js/polykey/v1/notifications/notifications_pb';
import PolykeyClient from '../../PolykeyClient';
import * as utils from '../../utils';

const send = createCommand('send', {
  description: {
    description:
      'Sends a general notification to another node containing a custom message',
    args: {
      nodeId: 'Id of the node to send notification to',
      message: 'Message to send in notification',
    },
  },
  nodePath: true,
  verbose: true,
  format: true,
});
send.arguments('<nodeId> <message>');
send.action(async (nodeId, message, options) => {
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
  const notificationsSendMessage = new notificationsPB.Send();
  const generalMessage = new notificationsPB.General();

  try {
    await client.start({});
    const grpcClient = client.grpcClient;
    generalMessage.setMessage(message);
    notificationsSendMessage.setReceiverId(nodeId);
    notificationsSendMessage.setData(generalMessage);

    const pCall = grpcClient.notificationsSend(notificationsSendMessage);
    const { p, resolveP } = utils.promise();
    pCall.call.on('metadata', async (meta) => {
      await clientUtils.refreshSession(meta, client.session);
      resolveP(null);
    });
    await pCall;
    await p;

    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [
          `Successsfully sent notification: "${notificationsSendMessage
            .getData()
            ?.getMessage()}" to Keynode with ID: ${notificationsSendMessage.getReceiverId()}`,
        ],
      }),
    );
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
    options.nodepath = undefined;
    options.verbose = undefined;
    options.format = undefined;
  }
});

export default send;
