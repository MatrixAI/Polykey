import { errors } from '@/grpc';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { clientPB } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import { createCommand, outputFormatter } from '../utils';

const commandChangePassword = createCommand('password', {
  description: {
    description: 'Change the password of the root keypair',
    args: {
      newPassword: 'Password to change to',
    },
  },
  nodePath: true,
  verbose: true,
  format: true,
});
commandChangePassword.requiredOption(
  ' -p, --new-password <newPassword>',
  '(required) Password to be changed to',
);
commandChangePassword.action(async (options) => {
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
  const passwordMessage = new clientPB.PasswordMessage();

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    passwordMessage.setPassword(options.newPassword);

    await grpcClient.keysChangePassword(passwordMessage);

    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [`Password to root keypair changed`],
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

export default commandChangePassword;
