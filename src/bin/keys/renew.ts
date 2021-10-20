import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyClient from '../../PolykeyClient';
import { utils as clientUtils } from '../../client';
import * as keysPB from '../../proto/js/polykey/v1/keys/keys_pb';
import * as utils from '../../utils';
import * as binUtils from '../utils';
import * as grpcErrors from '../../grpc/errors';

const renew = binUtils.createCommand('renew', {
  description:
    'Renews the root keypair, certificate will be self-signed and signed by the previous certificate',
  nodePath: true,
  verbose: true,
  format: true,
});
renew.requiredOption(
  '-pp, --password-path <passwordPath>',
  '(required) File path to the password to the new root keypair',
);
renew.action(async (options) => {
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
  const keyMessage = new keysPB.Key();

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    const password = await fs.promises.readFile(options.passwordPath, {
      encoding: 'utf-8',
    });
    keyMessage.setName(password);

    const pCall = grpcClient.keysKeyPairRenew(keyMessage);
    const { p, resolveP } = utils.promise();
    pCall.call.on('metadata', async (meta) => {
      await clientUtils.refreshSession(meta, client.session);
      resolveP(null);
    });

    await pCall;
    await p;

    process.stdout.write(
      binUtils.outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [`Renewed root keypair successfully`],
      }),
    );
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
    options.nodePath = undefined;
    options.verbose = undefined;
    options.format = undefined;
  }
});

export default renew;
