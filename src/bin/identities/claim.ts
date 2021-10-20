import { utils as clientUtils } from '../../client';
import * as identitiesPB from '../../proto/js/polykey/v1/identities/identities_pb';
import { createCommand, outputFormatter } from '../utils';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyClient from '../../PolykeyClient';
import { errors } from '../../grpc';
import * as utils from '../../utils';

const claim = createCommand('claim', {
  description: {
    description: 'Claim an identity for this keynode.',
    args: {
      providerId: 'Provider that identity is linked to',
      identityId: 'Identitiy to augment the keynode with',
    },
  },
  verbose: true,
  format: true,
  nodePath: true,
});
claim.arguments('<providerId> <identityId>');
claim.alias('aug');
claim.action(async (providerId, identitiyId, options) => {
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
    const providerMessage = new identitiesPB.Provider();
    providerMessage.setProviderId(providerId);
    providerMessage.setMessage(identitiyId);

    //Sending message.
    const pCall = grpcClient.identitiesClaim(providerMessage);
    const { p, resolveP } = utils.promise();
    pCall.call.on('metadata', async (meta) => {
      await clientUtils.refreshSession(meta, client.session);
      resolveP(null);
    });
    await pCall;
    await p;
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
    throw err;
  } finally {
    await client.stop();
    options.nodePath = undefined;
    options.verbose = undefined;
    options.format = undefined;
  }
});

export default claim;
