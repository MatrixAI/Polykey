import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { createCommand, outputFormatter } from '../utils';
import { errors } from '../../grpc';
import { clientPB } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import * as utils from '../../utils';

const clear = createCommand('clear', {
  description: {
    description: 'Clears all read and unread notifications',
    args: {},
  },
  nodePath: true,
  verbose: true,
  format: true,
});
clear.action(async (options) => {
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
  const emptyMessage = new clientPB.EmptyMessage();

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    await grpcClient.notificationsClear(emptyMessage);

    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [`Successsfully cleared all notifications`],
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
  }
});

export default clear;
