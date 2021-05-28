import { errors } from '@/grpc';
import { clientPB } from '../../client';
import { createCommand, outputFormatter } from '../utils';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyClient from '../../PolykeyClient';

const commandPullVault = createCommand('pull', {
  description: {
    description: 'Pulls a vault from another node',
    args: {
      nodeId: 'ID of the node to be pulled from',
      vaultName: 'Name of vault to be pulled',
    },
  },
  nodePath: true,
  verbose: true,
  format: true,
});
commandPullVault.requiredOption(
  '-ni, -node-id <nodeId>',
  '(required) Id of the node to pull the vault from',
);
commandPullVault.requiredOption(
  '-vn, -vault-name <vaultName>',
  '(required) Name of the vault to be pulled',
);
commandPullVault.action(async (options) => {
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

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    const echoMessage = new clientPB.EchoMessage();
    echoMessage.setChallenge(`${options.nodeId} ${options.vaultName}`);

    const pCall = grpcClient.echo(echoMessage);

    const responseMessage = await pCall;
    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [`scanvaults..., ${responseMessage.getChallenge()}`],
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

export default commandPullVault;
