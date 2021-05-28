import { errors } from '@/grpc';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { clientPB } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import { createCommand, outputFormatter } from '../utils';

const commandResetKeyPair = createCommand('reset', {
  description: {
    description:
      'Forces a reset of a new root keypair which will be self-signed',
    args: {
      privatePassphrase: 'Passphrase to the new root keypair',
    },
  },
  nodePath: true,
  verbose: true,
  format: true,
});
commandResetKeyPair.requiredOption(
  '-pp, --private-passphrase <privatePassphrase>',
  '(required) The passphrase to the new root keypair',
);
commandResetKeyPair.action(async (options) => {
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
  const keyMessage = new clientPB.KeyMessage();

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    keyMessage.setName(options.passphrase);

    await grpcClient.keysResetKeyPair(keyMessage);

    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [`Reset root keypair successfully`],
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

export default commandResetKeyPair;
