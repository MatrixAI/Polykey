import { clientPB } from '../../client';
import { createCommand, outputFormatter } from '../utils';

const commandAuthenticateProvider = createCommand('authenticate', {
  verbose: true,
  format: true,
});
commandAuthenticateProvider.alias('auth');
commandAuthenticateProvider.description(
  'authenticate a social identity provider e.g. github.com',
);
commandAuthenticateProvider.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandAuthenticateProvider.requiredOption(
  '-pk, --provider-key <providerKey>',
  '(required) key of the target provider, e.g. github.com',
);
commandAuthenticateProvider.action(async (options) => {
  // const client = await getAgentClient();

  const echoMessage = new clientPB.EchoMessage();
  echoMessage.setChallenge('I challenge you!');
  // const pCall = client.echo(echoMessage);
  try {
    // const responseMessage = await pCall;
    // process.stdout.write(
    //   outputFormatter({
    //     type: options.format === 'json' ? 'json' : 'list',
    //     data: [`No, ${responseMessage.getChallenge()}`],
    //   }),
    // );
  } catch (e) {
    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: ["Something's wrong I can feel it."],
      }),
    );
  }
  // client.stop();
});

export default commandAuthenticateProvider;
