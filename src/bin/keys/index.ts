import process from 'process';
import * as agentPB from '../../../proto/js/Agent_pb';
import {
  createCommand,
  verboseToLogLevel,
  resolveKeynodeStatePath,
  getAgentClient,
  promisifyGrpc,
} from '../utils';

const commandNewKey = createCommand('new', { verbose: true });
commandNewKey.description('derive a new symmetric key');
commandNewKey.option('-np, --node-path <nodePath>', 'provide the polykey path');
commandNewKey.requiredOption(
  '-n, --key-name <keyName>',
  '(required) the name of the new key',
);
commandNewKey.requiredOption(
  '-p, --key-passphrase <keyPassphrase>',
  '(required) the passphrase for the new key',
);
commandNewKey.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = resolveKeynodeStatePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const keyName = options.keyName;
  const request = new agentPB.DeriveKeyMessage();
  request.setKeyName(keyName);
  request.setPassphrase(options.keyPassphrase);
  await promisifyGrpc(client.deriveKey.bind(client))(request);
  process.stdout.write(`'${keyName}' was added to the Key Manager\n`);
});

const commandNewKeyPair = createCommand('keypair', { verbose: true });
commandNewKeyPair.description(
  'derive a new keypair for use in another keynode',
);
commandNewKeyPair.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandNewKeyPair.requiredOption(
  '-pp, --private-passphrase <privatePassphrase>',
  '(required) provide the passphrase to the private key',
);
commandNewKeyPair.option(
  '-nb, --nbits <nbits>',
  '(optional) number of bits to go into the rsa keypair generation',
  (str) => parseInt(str),
  4096,
);
commandNewKeyPair.requiredOption(
  '-priv, --private-path <privatePath>',
  '(required) provide the path to store the private key',
);
commandNewKeyPair.requiredOption(
  '-pub, --public-path <publicPath>',
  '(required) provide the path to store the public key',
);
commandNewKeyPair.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = resolveKeynodeStatePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const subRequest = new agentPB.NewKeyPairMessage();
  subRequest.setNbits(options.nbits);
  subRequest.setPassphrase(options.passphrase);
  const request = new agentPB.DeriveKeyPairMessage();
  request.setKeypairDetails(subRequest);
  request.setPublicKeyPath(options.publicPath!);
  request.setPrivateKeyPath(options.privatePath!);
  await promisifyGrpc(client.deriveKeyPair.bind(client))(request);
  process.stdout.write(`new keypair successfully generated\n`);
});

const commandDeleteKey = createCommand('delete', { verbose: true });
commandDeleteKey.description('delete a symmetric key from the key manager');
commandDeleteKey.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandDeleteKey.requiredOption(
  '-n, --key-name <keyName>',
  '(required) the name of the symmetric key to be deleted',
);
commandDeleteKey.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = resolveKeynodeStatePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const keyName = options.keyName;
  const request = new agentPB.StringMessage();
  request.setS(keyName);
  await promisifyGrpc(client.deleteKey.bind(client))(request);
  process.stdout.write(`key '${keyName}' was successfully deleted\n`);
});

const commandListKeys = createCommand('list', { verbose: true });
commandListKeys.alias('ls');
commandListKeys.description('list all symmetric keys in the keynode');
commandListKeys.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandListKeys.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = resolveKeynodeStatePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const res = (await promisifyGrpc(client.listKeys.bind(client))(
    new agentPB.EmptyMessage(),
  )) as agentPB.StringListMessage;
  const keyNames = res.getSList();
  if (keyNames === undefined || keyNames.length == 0) {
    process.stdout.write('no keys exist\n');
  } else {
    keyNames.forEach((keyName: string, index: number) => {
      process.stdout.write(`${index + 1}: ${keyName}\n`);
    });
  }
});

const commandGetKey = createCommand('get', { verbose: true });
commandGetKey.description('get the contents of a specific symmetric key');
commandGetKey.option('-np, --node-path <nodePath>', 'provide the polykey path');
commandGetKey.requiredOption(
  '-kn, --key-name <keyName>',
  '(required) the name of the new key',
);
commandGetKey.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = resolveKeynodeStatePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const request = new agentPB.StringMessage();
  request.setS(options.keyName);
  const res = (await promisifyGrpc(client.getKey.bind(client))(
    request,
  )) as agentPB.StringMessage;
  process.stdout.write(res.getS() + '\n');
});

const commandListPrimaryKeyPair = createCommand('primary', { verbose: true });
commandListPrimaryKeyPair.description(
  'get the contents of the primary keypair',
);
commandListPrimaryKeyPair.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandListPrimaryKeyPair.option('-pk, --private-key', 'include private key');
commandListPrimaryKeyPair.option('-oj, --output-json', 'output in JSON format');
commandListPrimaryKeyPair.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = resolveKeynodeStatePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const privateKey: boolean = options.privateKey;
  const request = new agentPB.BooleanMessage();
  request.setB(privateKey);
  const res = (await promisifyGrpc(client.getPrimaryKeyPair.bind(client))(
    request,
  )) as agentPB.KeyPairMessage;
  const keypair = {
    publicKey: res.getPublicKey(),
    privateKey: res.getPrivateKey(),
  };

  if (options.outputJson as boolean) {
    process.stdout.write(JSON.stringify(keypair) + '\n');
  } else {
    process.stdout.write('Public Key:\n');
    process.stdout.write(keypair.publicKey + '\n');
    if (privateKey) {
      process.stdout.write('Private Key:\n');
      process.stdout.write(keypair.privateKey + '\n');
    }
  }
});

const commandKeys = createCommand('keys');
commandKeys.description('manipulate keys');
commandKeys.addCommand(commandNewKey);
commandKeys.addCommand(commandNewKeyPair);
commandKeys.addCommand(commandGetKey);
commandKeys.addCommand(commandDeleteKey);
commandKeys.addCommand(commandListKeys);
commandKeys.addCommand(commandListPrimaryKeyPair);

export default commandKeys;
