import * as utils from '../../utils';
import * as binUtils from '../utils';
import * as grpc from '@grpc/grpc-js';
import * as grpcErrors from '../../grpc/errors';

import PolykeyClient from '../../PolykeyClient';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import { clientPB } from '../../client';

const commandAgentLockAll = binUtils.createCommand('lockall', {
  description:
    'Requests a jwt token from the Polykey Agent and starts a session.',
  nodePath: true,
  verbose: true,
  format: true,
  passwordFile: true,
});
commandAgentLockAll.action(async (options) => {
  const meta = new grpc.Metadata();

  const clientConfig = {};
  clientConfig['logger'] = new Logger('CLI Logger', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  if (options.verbose) {
    clientConfig['logger'].setLevel(LogLevel.DEBUG);
  }
  if (options.passwordFile) {
    meta.set('passwordFile', options.passwordFile);
  }
  const nodePath = options.nodePath
    ? options.nodePath
    : utils.getDefaultNodePath();
  clientConfig['nodePath'] = nodePath;

  const client = new PolykeyClient(clientConfig);
  const m = new clientPB.EmptyMessage();

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    await grpcClient.sessionChangeKey(
      m,
      meta,
      await client.session.createJWTCallCredentials(),
    );

    process.stdout.write('Locked all clients');
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
    client.stop();
    options.passwordFile = undefined;
    options.nodePath = undefined;
    options.verbose = undefined;
    options.format = undefined;
  }
});

export default commandAgentLockAll;
