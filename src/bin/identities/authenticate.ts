import { clientPB, utils as clientUtils } from '../../client';
import { createCommand, outputFormatter } from '../utils';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyClient from '../../PolykeyClient';
import { errors } from '../../grpc';
import * as utils from '../../utils';

const commandAugmentKeynode = createCommand('authenticate', {
  description: {
    description: 'authenticate a social identity provider e.g. github.com',
    args: {
      providerId: 'Provider that identity is linked to',
      identityId: 'Identitiy to augment the keynode with',
    },
  },
  verbose: true,
  format: true,
  nodePath: true,
});
commandAugmentKeynode.arguments('<providerId> <identityId>');
commandAugmentKeynode.alias('aug');
commandAugmentKeynode.action(async (providerId, identitiyId, options) => {
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

  try {
    //starting client
    await client.start({});
    const grpcClient = client.grpcClient;

    //constructing message.
    const providerMessage = new clientPB.ProviderMessage();
    providerMessage.setId(providerId);
    providerMessage.setMessage(identitiyId);

    //sending message.
    const gen = grpcClient.identitiesAuthenticate(
      providerMessage,
      await client.session.createCallCredentials(),
    );
    gen.stream.on('metadata', (meta) => {
      clientUtils.refreshSession(meta, client.session);
    });
    const codeMessage = (await gen.next()).value;

    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [`Your device code is: ${codeMessage!.getMessage()}`],
      }),
    );

    const successMessage = (await gen.next()).value;

    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [
          `Successfully authenticated user: ${successMessage!.getMessage()}`,
        ],
      }),
    );
  } catch (err) {
    if (err instanceof errors.ErrorGRPCClientTimeout) {
      process.stderr.write(`${err.message}\n`);
    }
    if (err instanceof errors.ErrorGRPCServerNotStarted) {
      process.stderr.write(`${err.message}\n`);
    } else {
      process.stderr.write(
        outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: ['Error:', err.message],
        }),
      );
    }
    throw err;
  } finally {
    await client.stop();
  }
});

export default commandAugmentKeynode;
