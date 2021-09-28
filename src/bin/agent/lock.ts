import * as utils from '../../utils';
import * as binUtils from '../utils';
import * as grpcErrors from '../../grpc/errors';

import PolykeyClient from '../../PolykeyClient';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

const lock = binUtils.createCommand('lock', {
  description: 'Locks the client & clears the existing token from the client.',
  nodePath: true,
  verbose: true,
  format: true,
});
lock.action(async (options) => {
  const clientConfig = {};
  clientConfig['logger'] = new Logger('CLI Logger', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  if (options.verbose) {
    clientConfig['logger'].setLevel(LogLevel.DEBUG);
  }
  const nodePath = options.nodePath
    ? options.nodePath
    : utils.getDefaultNodePath();
  clientConfig['nodePath'] = nodePath;

  const client = await PolykeyClient.createPolykeyClient(clientConfig);

  try {
    await client.start({});

    // Clear token from memory
    await client.session.stop();
    // Remove token from fs
    await client.session.clearFSToken();

    process.stdout.write('Client session stopped');
  } catch (err) {
    if (err instanceof grpcErrors.ErrorGRPCClientTimeout) {
      process.stderr.write(`${err.message}\n`);
    } else if (err instanceof grpcErrors.ErrorGRPCServerNotStarted) {
      process.stderr.write(`${err.message}\n`);
    } else {
      process.stderr.write(
        binUtils.outputFormatter({
          type: 'error',
          description: err.description,
          message: err.message,
        }),
      );
      throw err;
    }
  } finally {
    await client.stop();
    options.passwordFile = undefined;
    options.nodePath = undefined;
    options.verbose = undefined;
    options.format = undefined;
  }
});

export default lock;
