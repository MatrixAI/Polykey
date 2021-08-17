import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyClient from '../../PolykeyClient';
import { clientPB, utils as clientUtils } from '../../client';
import * as utils from '../../utils';
import * as binUtils from '../utils';
import * as grpcErrors from '../../grpc/errors';

const commandVerify = binUtils.createCommand('verify', {
  description: 'Verifies a signature with the root keypair',
  nodePath: true,
  verbose: true,
  format: true,
});
commandVerify.requiredOption(
  '-fp, --file-path <filePath>',
  '(required) Path to the file to be verified, file must be binary encoded',
);
commandVerify.requiredOption(
  '-sp, --signature-path <signaturePath>',
  '(required) Path to the signature to be verified, file must be binary encoded',
);
commandVerify.action(async (options) => {
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

  const client = new PolykeyClient(clientConfig);
  const cryptoMessage = new clientPB.CryptoMessage();

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    const data = await fs.promises.readFile(options.filePath, {
      encoding: 'binary',
    });
    const signature = await fs.promises.readFile(options.signaturePath, {
      encoding: 'binary',
    });

    cryptoMessage.setData(data);
    cryptoMessage.setSignature(signature);

    const pCall = grpcClient.keysVerify(
      cryptoMessage,
      await client.session.createCallCredentials(),
    );
    pCall.call.on('metadata', (meta) => {
      clientUtils.refreshSession(meta, client.session);
    });

    const response = await pCall;

    process.stdout.write(
      binUtils.outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [`Signature verification:\t\t${response.getSuccess()}`],
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

export default commandVerify;
