import fs from 'fs/promises';

import { errors } from '@/grpc';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { clientPB } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import { createCommand, outputFormatter } from '../utils';

const commandEncryptKeys = createCommand('encrypt', {
  description: {
    description: 'Encrypt a file with the root keypair',
    args: {
      filePath: 'Path to the data',
    },
  },
  nodePath: true,
  verbose: true,
  format: true,
});
commandEncryptKeys.requiredOption(
  '-fp, --file-path <filePath>',
  '(required) Path to file to be encrypted',
);
commandEncryptKeys.action(async (options) => {
  const clientConfig = {};
  clientConfig['logger'] = new Logger('CLI Logger', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  if (options.verbose) {
    clientConfig['logger'].setLevel(LogLevel.DEBUG);
  }
  if (options.nodePath) {
    clientConfig['nodePath'] = options.nodePath;
  }

  const client = new PolykeyClient(clientConfig);
  const cryptoMessage = new clientPB.CryptoMessage();

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    const plainText = await fs.readFile(options.filePath, {
      encoding: 'binary',
    });

    cryptoMessage.setData(plainText);

    const response = await grpcClient.keysEncrypt(cryptoMessage);

    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [`Encrypted data:\t\t${response.getData()}`],
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
  } finally {
    client.stop();
  }
});

export default commandEncryptKeys;
