import process from 'process';
import * as agentPB from '../../../proto/js/Agent_pb';
import {
  createCommand,
  verboseToLogLevel,
  resolveKeynodeStatePath,
  promisifyGrpc,
  getAgentClient,
} from '../utils';

const commandSearch = createCommand('search', { verbose: true });
commandSearch.description('search a particular provider for a gestalt');
commandSearch.option('-np, --node-path <nodePath>', 'provide the polykey path');
commandSearch.requiredOption(
  '-pk, --provider-key <providerKey>',
  '(required) key of the target provider, e.g. github.com',
);
commandSearch.arguments('search terms for the search');
commandSearch.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = resolveKeynodeStatePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const request = new agentPB.ProviderSearchMessage();
  request.setProviderKey(options.providerKey);
  request.setSearchTermList(commandSearch.args);
  const responseStream = client.getConnectedIdentityInfos(request);
  process.stdout.write(
    `searching for connected identities with search terms: ${commandSearch.args}\n`,
  );
  await new Promise<void>((resolve, reject) => {
    responseStream.on('data', (identityInfo: agentPB.IdentityInfoMessage) => {
      process.stdout.write('found a new identity info:\n');
      process.stdout.write(`key: '${identityInfo.getKey()}'\n`);
      process.stdout.write(`provider: '${identityInfo.getProvider()}'\n`);
      process.stdout.write(`name: '${identityInfo.getName()}'\n`);
      process.stdout.write(`email: '${identityInfo.getEmail()}'\n`);
      process.stdout.write(`url: '${identityInfo.getUrl()}'\n`);
    });
    responseStream.on('error', (error) => {
      reject(error);
    });
    responseStream.on('end', () => {
      resolve();
    });
  });
  process.stdout.write('finished searching for connected identities\n');
});

const commandDiscoverIdentity = createCommand('discover', { verbose: true });
commandDiscoverIdentity.alias('dis');
commandDiscoverIdentity.description(
  'search a particular provider for a gestalt',
);
commandDiscoverIdentity.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandDiscoverIdentity.requiredOption(
  '-pk, --provider-key <providerKey>',
  '(required) key of the target provider, e.g. github.com',
);
commandDiscoverIdentity.requiredOption(
  '-ik, --identity-key, <identityKey>',
  '(required) key of the target identity',
);
commandDiscoverIdentity.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = resolveKeynodeStatePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const request = new agentPB.IdentityMessage();
  request.setProviderKey(options.providerKey);
  request.setKey(options.identityKey);
  const responseStream = client.discoverGestaltIdentity(request);
  await new Promise<void>((resolve, reject) => {
    responseStream.on('data', () => {
      process.stdout.write('discovery algorithm cycled once\n');
    });
    responseStream.on('error', (error) => {
      reject(error);
    });
    responseStream.on('end', () => {
      resolve();
    });
  });
  process.stdout.write('finished searching for connected identities\n');
});

const commandGetByIdentity = createCommand('identity', { verbose: true });
commandGetByIdentity.alias('id');
commandGetByIdentity.description('retrieve a gestalt via an identity');
commandGetByIdentity.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandGetByIdentity.requiredOption(
  '-pk, --provider-key <providerKey>',
  '(required) key of the target provider, e.g. github.com',
);
commandGetByIdentity.requiredOption(
  '-ik, --identity-key, <identityKey>',
  '(required) key of the target identity',
);
commandGetByIdentity.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = resolveKeynodeStatePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const request = new agentPB.IdentityMessage();
  request.setProviderKey(options.providerKey);
  request.setKey(options.identityKey);
  const response = (await promisifyGrpc(
    client.getGestaltByIdentity.bind(client),
  )(request)) as agentPB.GestaltMessage;
  process.stdout.write('GestaltMatrix:\n');
  process.stdout.write(JSON.stringify(response.getGestaltMatrixMap()) + '\n');
  process.stdout.write('Identities:\n');
  process.stdout.write(JSON.stringify(response.getIdentitiesMap()) + '\n');
  process.stdout.write('GestaltNodes:\n');
  process.stdout.write(JSON.stringify(response.getGestaltNodesMap()) + '\n');
});

const commandTrust = createCommand('trust', { verbose: true });
commandTrust.description('trust a particular gestalt');
commandTrust.option('-np, --node-path <nodePath>', 'provide the polykey path');
commandTrust.requiredOption(
  '-gk, --gestalt-key, <gestaltKey>',
  '(required) key of the gestalt to trust',
);
commandTrust.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = resolveKeynodeStatePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const request = new agentPB.StringMessage();
  request.setS(options.gestaltKey);
  await promisifyGrpc(client.trustGestalt.bind(client))(request);
  process.stdout.write('gestalt successfully trusted\n');
});

const commandUntrust = createCommand('untrust', { verbose: true });
commandUntrust.description('untrust a particular gestalt');
commandUntrust.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandUntrust.requiredOption(
  '-gk, --gestalt-key, <gestaltKey>',
  '(required) key of the gestalt to untrust',
);
commandUntrust.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = resolveKeynodeStatePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const request = new agentPB.StringMessage();
  request.setS(options.gestaltKey);
  await promisifyGrpc(client.untrustGestalt.bind(client))(request);
  process.stdout.write('gestalt successfully untrusted\n');
});

const commandTrusted = createCommand('status', { verbose: true });
commandTrusted.description('check if a particular gestalt is trusted');
commandTrusted.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandTrusted.requiredOption(
  '-gk, --gestalt-key, <gestaltKey>',
  '(required) key of the gestalt to check trust for',
);
commandTrusted.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = resolveKeynodeStatePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const request = new agentPB.StringMessage();
  request.setS(options.gestaltKey);
  const response = (await promisifyGrpc(client.gestaltIsTrusted.bind(client))(
    request,
  )) as agentPB.BooleanMessage;
  process.stdout.write(`gestalt is ${response.getB() ? '' : 'un '}trusted\n`);
});

const commandGetGestalts = createCommand('list', { verbose: true });
commandGetGestalts.alias('ls');
commandGetGestalts.description('list all the gestalts in the gestalt graph');
commandGetGestalts.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandGetGestalts.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = resolveKeynodeStatePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const response = (await promisifyGrpc(client.getGestalts.bind(client))(
    new agentPB.EmptyMessage(),
  )) as agentPB.GestaltListMessage;
  const gestaltList = response.getGestaltMessageList();
  gestaltList.forEach((g) => {
    process.stdout.write('GestaltMatrix:\n');
    process.stdout.write(JSON.stringify(g.getGestaltMatrixMap()) + '\n');
    process.stdout.write('Identities:\n');
    process.stdout.write(JSON.stringify(g.getIdentitiesMap()) + '\n');
    process.stdout.write('GestaltNodes:\n');
    process.stdout.write(JSON.stringify(g.getGestaltNodesMap()) + '\n');
  });
});

const commandGestalts = createCommand('gestalts');
commandGestalts.description('gestalt operations');
commandGestalts.addCommand(commandSearch);
commandGestalts.addCommand(commandGetByIdentity);
commandGestalts.addCommand(commandTrust);
commandGestalts.addCommand(commandUntrust);
commandGestalts.addCommand(commandTrusted);
commandGestalts.addCommand(commandGetGestalts);

export default commandGestalts;
