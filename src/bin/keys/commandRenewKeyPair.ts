import { errors } from '@/grpc';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { clientPB } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import { createCommand, outputFormatter } from '../utils';

const commandRenewKeyPair = createCommand('renew', {
  description: {
    description:
      'Renews the root keypair, certificate will be self-signed and signed by the previous certificate',
    args: {
      privatePassphrase: 'Passphrase to the new root keypair',
    },
  },
  nodePath: true,
  verbose: true,
  format: true,
});
commandRenewKeyPair.requiredOption(
  '-pp, --private-passphrase <privatePassphrase>',
  '(required) The passphrase to the new root keypair',
);
commandRenewKeyPair.action(async (options) => {
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

    await grpcClient.keysRenewKeyPair(keyMessage);

    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [`Renewed root keypair successfully`],
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

export default commandRenewKeyPair;
