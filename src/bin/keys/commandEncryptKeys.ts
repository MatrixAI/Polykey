import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as grpc from '@grpc/grpc-js';
import PolykeyClient from '../../PolykeyClient';
import { clientPB } from '../../client';
import * as utils from '../../utils';
import * as binUtils from '../utils';
import * as grpcErrors from '../../grpc/errors';

const commandEncryptKeys = binUtils.createCommand('encrypt', {
  description: 'Encrypts a file with the root keypair',
  nodePath: true,
  verbose: true,
  format: true,
  passwordFile: true,
});
commandEncryptKeys.requiredOption(
  '-fp, --file-path <filePath>',
  '(required) Path to file to be encrypted, file must use binary encoding',
);
commandEncryptKeys.action(async (options) => {
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
  const cryptoMessage = new clientPB.CryptoMessage();

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    const plainText = await fs.promises.readFile(options.filePath, {
      encoding: 'binary',
    });

    cryptoMessage.setData(plainText);

    const response = await grpcClient.keysEncrypt(
      cryptoMessage,
      meta,
      await client.session.createJWTCallCredentials(),
    );

    process.stdout.write(
      binUtils.outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [`Encrypted data:\t\t${response.getData()}`],
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

export default commandEncryptKeys;
