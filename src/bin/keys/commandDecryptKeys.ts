import fs from 'fs/promises';
import { errors } from '../../grpc';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { clientPB } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import { createCommand, outputFormatter } from '../utils';

const commandDecryptKeys = createCommand('decrypt', {
  description: {
    description: 'Decrypt a file with the root keypair',
    args: {
      filePath: 'Path to the encrypted data',
    },
  },
  nodePath: true,
  verbose: true,
  format: true,
});
commandDecryptKeys.requiredOption(
  '-fp, --file-path <filePath>',
  '(required) Path to file to be decrypted',
);
commandDecryptKeys.action(async (options) => {
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

    const cipherText = await fs.readFile(options.filePath, {
      encoding: 'binary',
    });

    cryptoMessage.setData(cipherText);

    const response = await grpcClient.keysDecrypt(cryptoMessage);

    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [`Decrypted data:\t\t${response.getData()}`],
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

export default commandDecryptKeys;
