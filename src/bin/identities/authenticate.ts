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

  const client = await PolykeyClient.createPolykeyClient(clientConfig);

  try {
    //Starting client
    await client.start({});
    const grpcClient = client.grpcClient;

    //Constructing message.
    const providerMessage = new clientPB.ProviderMessage();
    providerMessage.setProviderId(providerId);
    providerMessage.setMessage(identitiyId);

    //Sending message.
    const gen = grpcClient.identitiesAuthenticate(providerMessage);
    const { p, resolveP } = utils.promise();
    gen.stream.on('metadata', async (meta) => {
      await clientUtils.refreshSession(meta, client.session);
      resolveP(null);
    });
    const codeMessage = (await gen.next()).value;
    await p;

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
    options.nodePath = undefined;
    options.verbose = undefined;
    options.format = undefined;
  }
});

export default commandAugmentKeynode;
