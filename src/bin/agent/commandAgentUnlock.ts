import type { SessionToken } from '../../sessions/types';

import * as utils from '../../utils';
import * as binUtils from '../utils';
import * as grpc from '@grpc/grpc-js';
import * as grpcErrors from '../../grpc/errors';

import PolykeyClient from '../../PolykeyClient';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import { clientPB } from '../../client';

const commandAgentUnlock = binUtils.createCommand('unlock', {
  description:
    'Requests a jwt token from the Polykey Agent and starts a session.',
  nodePath: true,
  verbose: true,
  format: true,
  passwordFile: true,
});
commandAgentUnlock.arguments('[password]');
commandAgentUnlock.action(async (password, options) => {
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

  if (password) {
    meta.set('password', password);
  }

  if (!password && !options.passwordFile) {
    const input = await binUtils.requestPassword();
    meta.set('password', input);
  }

  const client = new PolykeyClient(clientConfig);
  const m = new clientPB.EmptyMessage();

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    const pCall = grpcClient.sessionUnlock(m, meta);

    const responseMessage = await pCall;
    const token: SessionToken = responseMessage.getToken() as SessionToken;

    // Write token to file
    await client.session.start({ token });
    await client.session.writeToken();

    process.stdout.write('Client session started');
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

export default commandAgentUnlock;
