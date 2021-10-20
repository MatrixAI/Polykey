import PolykeyClient from '../../PolykeyClient';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { createCommand, outputFormatter } from '../utils';
import { messages, utils as clientUtils } from '../../client';
import * as utils from '../../utils';

const echo = createCommand('echo', {
  description: {
    description: 'Calls echo',
    args: {
      text: 'Text to echo',
    },
  },
  nodePath: true,
  verbose: true,
  format: true,
});
echo.arguments('<text>');
echo.action(async (text, options) => {
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

  const client = await PolykeyClient.createPolykeyClient(clientConfig);

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    const echoMessage = new messages.EchoMessage();
    echoMessage.setChallenge(text);

    const pCall = grpcClient.echo(echoMessage);
    const { p, resolveP } = utils.promise();
    pCall.call.on('metadata', async (meta) => {
      await clientUtils.refreshSession(meta, client.session);
      resolveP(null);
    });

    const responseMessage = await pCall;
    await p;
    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [`${responseMessage.getChallenge()}`],
      }),
    );
  } catch (e) {
    process.stderr.write(
      outputFormatter({
        // If set as --format json, we would expect output to be in JSON. But,
        // for stderr output, we should override this with 'error'
        type: 'error',
        description: e.description,
        message: e.message,
      }),
    );
    throw e;
  } finally {
    await client.stop();
    options.nodePath = undefined;
    options.verbose = undefined;
    options.format = undefined;
  }
});

export default echo;
