import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as grpc from '@grpc/grpc-js';
import PolykeyClient from '../../PolykeyClient';
import { clientPB } from '../../client';
import * as utils from '../../utils';
import * as binUtils from '../utils';
import * as grpcErrors from '../../grpc/errors';

const commandRenewKeyPair = binUtils.createCommand('renew', {
  description:
    'Renews the root keypair, certificate will be self-signed and signed by the previous certificate',
  nodePath: true,
  verbose: true,
  format: true,
  passwordFile: true,
});
commandRenewKeyPair.requiredOption(
  '-pp, --password-path <passwordPath>',
  '(required) File path to the password to the new root keypair',
);
commandRenewKeyPair.action(async (options) => {
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
  clientConfig['nodePath'] = options.nodePath
    ? options.nodePath
    : utils.getDefaultNodePath();

  const client = new PolykeyClient(clientConfig);
  const keyMessage = new clientPB.KeyMessage();

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    const password = await fs.promises.readFile(options.passwordPath, {
      encoding: 'utf-8',
    });
    keyMessage.setName(password);

    await grpcClient.keysRenewKeyPair(keyMessage, meta);

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
    client.stop();
    options.passwordFile = undefined;
    options.nodePath = undefined;
    options.verbose = undefined;
    options.format = undefined;
  }
});

export default commandRenewKeyPair;
