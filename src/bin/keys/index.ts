import commander from 'commander';
import * as agentPB from '../../proto/js/Agent_pb';
import {
  actionRunner,
  PKMessageType,
  resolveKeynodeStatePath,
  getAgentClient,
  promisifyGrpc,
  getPKLogger,
} from '../utils';

const commandNewKey = new commander.Command('new');
commandNewKey.description('derive a new symmetric key');
commandNewKey.option('-k, --node-path <nodePath>', 'provide the polykey path');
commandNewKey.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandNewKey.requiredOption(
  '-n, --key-name <keyName>',
  '(required) the name of the new key',
);
commandNewKey.requiredOption(
  '-p, --key-passphrase <keyPassphrase>',
  '(required) the passphrase for the new key',
);
commandNewKey.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);
    const keyName = options.keyName;
    const request = new agentPB.DeriveKeyMessage();
    request.setKeyName(keyName);
    request.setPassphrase(options.keyPassphrase);
    await promisifyGrpc(client.deriveKey.bind(client))(request);
    pkLogger.logV2(
      `'${keyName}' was added to the Key Manager`,
      PKMessageType.SUCCESS,
    );
  }),
);

const commandNewKeyPair = new commander.Command('keypair');
commandNewKeyPair.description(
  'derive a new keypair for use in another keynode',
);
commandNewKeyPair.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandNewKeyPair.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandNewKeyPair.requiredOption(
  '-ui, --user-id <userId>',
  '(required) provide an identifier for the keypair to be generated',
);
commandNewKeyPair.requiredOption(
  '-pp, --private-passphrase <privatePassphrase>',
  '(required) provide the passphrase to the private key',
);
commandNewKeyPair.requiredOption(
  '-priv, --private-path <privatePath>',
  '(required) provide the path to store the private key',
);
commandNewKeyPair.requiredOption(
  '-pub, --public-path <publicPath>',
  '(required) provide the path to store the public key',
);
commandNewKeyPair.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);
    const subRequest = new agentPB.NewKeyPairMessage();
    subRequest.setUserid(options.userId!);
    subRequest.setPassphrase(options.passphrase!);
    const request = new agentPB.DeriveKeyPairMessage();
    request.setKeypairDetails(subRequest);
    request.setPublicKeyPath(options.publicPath!);
    request.setPrivateKeyPath(options.privatePath!);
    await promisifyGrpc(client.deriveKeyPair.bind(client))(request);
    pkLogger.logV2(`new keypair successfully generated`, PKMessageType.SUCCESS);
  }),
);

const commandDeleteKey = new commander.Command('delete');
commandDeleteKey.description('delete a symmetric key from the key manager');
commandDeleteKey.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandDeleteKey.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandDeleteKey.requiredOption(
  '-n, --key-name <keyName>',
  '(required) the name of the symmetric key to be deleted',
);
commandDeleteKey.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);
    const keyName = options.keyName;
    const request = new agentPB.StringMessage();
    request.setS(keyName);
    await promisifyGrpc(client.deleteKey.bind(client))(request);
    pkLogger.logV2(
      `key '${keyName}' was successfully deleted`,
      PKMessageType.SUCCESS,
    );
  }),
);

const commandListKeys = new commander.Command('list');
commandListKeys.alias('ls');
commandListKeys.description('list all symmetric keys in the keynode');
commandListKeys.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandListKeys.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandListKeys.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const res = (await promisifyGrpc(client.listKeys.bind(client))(
      new agentPB.EmptyMessage(),
    )) as agentPB.StringListMessage;
    const keyNames = res.getSList();

    if (keyNames === undefined || keyNames.length == 0) {
      pkLogger.logV1('no keys exist', PKMessageType.INFO);
    } else {
      keyNames.forEach((keyName: string, index: number) => {
        pkLogger.logV1(`${index + 1}: ${keyName}`, PKMessageType.SUCCESS);
      });
    }
  }),
);

const commandGetKey = new commander.Command('get');
commandGetKey.description('get the contents of a specific symmetric key');
commandGetKey.option('-k, --node-path <nodePath>', 'provide the polykey path');
commandGetKey.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandGetKey.requiredOption(
  '-kn, --key-name <keyName>',
  '(required) the name of the new key',
);
commandGetKey.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const request = new agentPB.StringMessage();
    request.setS(options.keyName);
    const res = (await promisifyGrpc(client.getKey.bind(client))(
      request,
    )) as agentPB.StringMessage;
    pkLogger.logV1(res.getS(), PKMessageType.SUCCESS);
  }),
);

const commandListPrimaryKeyPair = new commander.Command('primary');
commandListPrimaryKeyPair.description(
  'get the contents of the primary keypair',
);
commandListPrimaryKeyPair.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandListPrimaryKeyPair.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandListPrimaryKeyPair.option('-pk, --private-key', 'include private key');
commandListPrimaryKeyPair.option('-oj, --output-json', 'output in JSON format');
commandListPrimaryKeyPair.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

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
      pkLogger.logV1(JSON.stringify(keypair), PKMessageType.INFO);
    } else {
      pkLogger.logV2('Public Key:', PKMessageType.SUCCESS);
      pkLogger.logV1(keypair.publicKey, PKMessageType.INFO);
      if (privateKey) {
        pkLogger.logV2('Private Key:', PKMessageType.SUCCESS);
        pkLogger.logV1(keypair.privateKey, PKMessageType.INFO);
      }
    }
  }),
);

const commandKeys = new commander.Command('keys');
commandKeys.description('manipulate keys');
commandKeys.addCommand(commandNewKeyPair);
commandKeys.addCommand(commandNewKey);
commandKeys.addCommand(commandGetKey);
commandKeys.addCommand(commandDeleteKey);
commandKeys.addCommand(commandListKeys);
commandKeys.addCommand(commandListPrimaryKeyPair);

export default commandKeys;
