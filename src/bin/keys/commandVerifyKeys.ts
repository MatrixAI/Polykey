import fs from 'fs/promises';

import { errors } from '@/grpc';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { clientPB } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import { createCommand, outputFormatter } from '../utils';

const commandVerify = createCommand('verify', {
  description: {
    description: 'Verify a signature with the root keypair',
    args: {
      filePath: 'Path to the data',
      signaturePath: 'Path to the signature',
    },
  },
  nodePath: true,
  verbose: true,
  format: true,
});
commandVerify.requiredOption(
  '-fp, --file-path <filePath>',
  '(required) Path to the file to be verified',
);
commandVerify.requiredOption(
  '-sp, --signature-path <signaturePath>',
  '(required) Path to the signature to be verified',
);
commandVerify.action(async (options) => {
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

    const data = await fs.readFile(options.filePath, { encoding: 'binary' });
    const signature = await fs.readFile(options.signaturePath, {
      encoding: 'binary',
    });

    cryptoMessage.setData(data);
    cryptoMessage.setSignature(signature);

    const response = await grpcClient.keysVerify(cryptoMessage);

    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [`Signature verification:\t\t${response.getSuccess()}`],
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

export default commandVerify;
