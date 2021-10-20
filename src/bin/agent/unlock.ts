import type { SessionToken } from '../../sessions/types';

import * as utils from '../../utils';
import * as binUtils from '../utils';
import * as grpcErrors from '../../grpc/errors';

import PolykeyClient from '../../PolykeyClient';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as sessionsPB from '../../proto/js/polykey/v1/sessions/sessions_pb';

const unlock = binUtils.createCommand('unlock', {
  description:
    'Requests a jwt token from the Polykey Agent and starts a session.',
  nodePath: true,
  verbose: true,
  format: true,
  passwordFile: true,
});
unlock.arguments('[password]');
unlock.action(async (password, options) => {
  const sessionPasswordMessage = new sessionsPB.Password();

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

  if (options.passwordFile) {
    sessionPasswordMessage.setPasswordFile(options.passwordFile);
  }

  if (password) {
    sessionPasswordMessage.setPassword(password);
  }

  if (!password && !options.passwordFile) {
    const input = await binUtils.requestPassword();
    sessionPasswordMessage.setPassword(input);
  }

  const client = await PolykeyClient.createPolykeyClient(clientConfig);

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    const pCall = grpcClient.sessionUnlock(sessionPasswordMessage);

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

export default unlock;
