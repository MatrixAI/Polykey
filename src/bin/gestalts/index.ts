import commander from 'commander';
import * as agentPB from '../../../proto/js/Agent_pb';
import {
  actionRunner,
  getPKLogger,
  PKMessageType,
  resolveKeynodeStatePath,
  promisifyGrpc,
  getAgentClient,
} from '../utils';

const commandSearch = new commander.Command('search');
commandSearch.description('search a particular provider for a gestalt');
commandSearch.option('-k, --node-path <nodePath>', 'provide the polykey path');
commandSearch.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandSearch.requiredOption(
  '-pk, --provider-key <providerKey>',
  '(required) key of the target provider, e.g. github.com',
);
commandSearch.arguments('search terms for the search');
commandSearch.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const request = new agentPB.ProviderSearchMessage();
    request.setProviderKey(options.providerKey);
    request.setSearchTermList(commandSearch.args);
    const responseStream = client.getConnectedIdentityInfos(request);

    pkLogger.logV1(
      `searching for connected identities with search terms: ${commandSearch.args}`,
      PKMessageType.INFO,
    );
    await new Promise<void>((resolve, reject) => {
      responseStream.on('data', (identityInfo: agentPB.IdentityInfoMessage) => {
        pkLogger.logV1('found a new identity info: ', PKMessageType.INFO);
        pkLogger.logV1(`key: '${identityInfo.getKey()}'`, PKMessageType.INFO);
        pkLogger.logV1(
          `provider: '${identityInfo.getProvider()}'`,
          PKMessageType.INFO,
        );
        pkLogger.logV1(`name: '${identityInfo.getName()}'`, PKMessageType.INFO);
        pkLogger.logV1(
          `email: '${identityInfo.getEmail()}'`,
          PKMessageType.INFO,
        );
        pkLogger.logV1(`url: '${identityInfo.getUrl()}'`, PKMessageType.INFO);
      });
      responseStream.on('error', (error) => {
        reject(error);
      });
      responseStream.on('end', () => {
        resolve();
      });
    });

    pkLogger.logV1(
      'finished searching for connected identities',
      PKMessageType.INFO,
    );
  }),
);

const commandDiscoverIdentity = new commander.Command('discover');
commandDiscoverIdentity.alias('dis');
commandDiscoverIdentity.description(
  'search a particular provider for a gestalt',
);
commandDiscoverIdentity.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandDiscoverIdentity.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandDiscoverIdentity.requiredOption(
  '-pk, --provider-key <providerKey>',
  '(required) key of the target provider, e.g. github.com',
);
commandDiscoverIdentity.requiredOption(
  '-ik, --identity-key, <identityKey>',
  '(required) key of the target identity',
);
commandDiscoverIdentity.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const request = new agentPB.IdentityMessage();
    request.setProviderKey(options.providerKey);
    request.setKey(options.identityKey);
    const responseStream = client.discoverGestaltIdentity(request);
    await new Promise<void>((resolve, reject) => {
      responseStream.on('data', () => {
        pkLogger.logV1('discovery algorithm cycled once', PKMessageType.INFO);
      });
      responseStream.on('error', (error) => {
        reject(error);
      });
      responseStream.on('end', () => {
        resolve();
      });
    });

    pkLogger.logV1(
      'finished searching for connected identities',
      PKMessageType.INFO,
    );
  }),
);

const commandGetByIdentity = new commander.Command('identity');
commandGetByIdentity.alias('id');
commandGetByIdentity.description('retrieve a gestalt via an identity');
commandGetByIdentity.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandGetByIdentity.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandGetByIdentity.requiredOption(
  '-pk, --provider-key <providerKey>',
  '(required) key of the target provider, e.g. github.com',
);
commandGetByIdentity.requiredOption(
  '-ik, --identity-key, <identityKey>',
  '(required) key of the target identity',
);
commandGetByIdentity.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const request = new agentPB.IdentityMessage();
    request.setProviderKey(options.providerKey);
    request.setKey(options.identityKey);
    const response = (await promisifyGrpc(
      client.getGestaltByIdentity.bind(client),
    )(request)) as agentPB.GestaltMessage;

    pkLogger.logV1('GestaltMatrix: ', PKMessageType.INFO);
    pkLogger.logV1(
      JSON.stringify(response.getGestaltMatrixMap()),
      PKMessageType.SUCCESS,
    );
    pkLogger.logV1('Identities: ', PKMessageType.INFO);
    pkLogger.logV1(
      JSON.stringify(response.getIdentitiesMap()),
      PKMessageType.SUCCESS,
    );
    pkLogger.logV1('GestaltNodes: ', PKMessageType.INFO);
    pkLogger.logV1(
      JSON.stringify(response.getGestaltNodesMap()),
      PKMessageType.SUCCESS,
    );
  }),
);

const commandTrust = new commander.Command('trust');
commandTrust.description('trust a particular gestalt');
commandTrust.option('-k, --node-path <nodePath>', 'provide the polykey path');
commandTrust.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandTrust.requiredOption(
  '-gk, --gestalt-key, <gestaltKey>',
  '(required) key of the gestalt to trust',
);
commandTrust.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const request = new agentPB.StringMessage();
    request.setS(options.gestaltKey);
    await promisifyGrpc(client.trustGestalt.bind(client))(request);

    pkLogger.logV2('gestalt successfully trusted', PKMessageType.INFO);
  }),
);

const commandUntrust = new commander.Command('untrust');
commandUntrust.description('untrust a particular gestalt');
commandUntrust.option('-k, --node-path <nodePath>', 'provide the polykey path');
commandUntrust.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandUntrust.requiredOption(
  '-gk, --gestalt-key, <gestaltKey>',
  '(required) key of the gestalt to untrust',
);
commandUntrust.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const request = new agentPB.StringMessage();
    request.setS(options.gestaltKey);
    await promisifyGrpc(client.untrustGestalt.bind(client))(request);

    pkLogger.logV2('gestalt successfully untrusted', PKMessageType.INFO);
  }),
);

const commandTrusted = new commander.Command('untrust');
commandTrusted.description('check if a particular gestalt is trusted');
commandTrusted.option('-k, --node-path <nodePath>', 'provide the polykey path');
commandTrusted.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandTrusted.requiredOption(
  '-gk, --gestalt-key, <gestaltKey>',
  '(required) key of the gestalt to check trust for',
);
commandTrusted.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const request = new agentPB.StringMessage();
    request.setS(options.gestaltKey);
    const response = (await promisifyGrpc(client.gestaltIsTrusted.bind(client))(
      request,
    )) as agentPB.BooleanMessage;

    pkLogger.logV1(
      `gestalt is ${response.getB() ? '' : 'un '}trusted`,
      PKMessageType.SUCCESS,
    );
  }),
);

const commandGetGestalts = new commander.Command('list');
commandGetGestalts.alias('ls');
commandGetGestalts.description('list all the gestalts in the gestalt graph');
commandGetGestalts.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandGetGestalts.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandGetGestalts.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const response = (await promisifyGrpc(client.getGestalts.bind(client))(
      new agentPB.EmptyMessage(),
    )) as agentPB.GestaltListMessage;
    const gestaltList = response.getGestaltMessageList();

    gestaltList.forEach((g) => {
      pkLogger.logV1('GestaltMatrix: ', PKMessageType.INFO);
      pkLogger.logV1(
        JSON.stringify(g.getGestaltMatrixMap()),
        PKMessageType.SUCCESS,
      );
      pkLogger.logV1('Identities: ', PKMessageType.INFO);
      pkLogger.logV1(
        JSON.stringify(g.getIdentitiesMap()),
        PKMessageType.SUCCESS,
      );
      pkLogger.logV1('GestaltNodes: ', PKMessageType.INFO);
      pkLogger.logV1(
        JSON.stringify(g.getGestaltNodesMap()),
        PKMessageType.SUCCESS,
      );
    });
  }),
);

const commandGestalts = new commander.Command('gestalts');
commandGestalts.description('gestalt operations');
commandGestalts.addCommand(commandSearch);
commandGestalts.addCommand(commandGetByIdentity);
commandGestalts.addCommand(commandTrust);
commandGestalts.addCommand(commandUntrust);
commandGestalts.addCommand(commandTrusted);
commandGestalts.addCommand(commandGetGestalts);

export default commandGestalts;
