import { clientPB } from '../../client';
import { createCommand, outputFormatter } from '../utils';

const commandAugmentKeynode = createCommand('augment', {
  verbose: true,
  format: true,
});
commandAugmentKeynode.alias('aug');
commandAugmentKeynode.description(
  'augment the keynode on a given provider and identity',
);
commandAugmentKeynode.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandAugmentKeynode.requiredOption(
  '-pk, --provider-key <providerKey>',
  '(required) key of the target provider, e.g. github.com',
);
commandAugmentKeynode.requiredOption(
  '-ik, --identity-key, <identityKey>',
  '(required) key of the target identity',
);
commandAugmentKeynode.action(async (options) => {
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

export default commandAugmentKeynode;
