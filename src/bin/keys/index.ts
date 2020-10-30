import commander from 'commander';
import * as pb from '../../../proto/compiled/Agent_pb';
import { actionRunner, PKMessageType, determineNodePath, getAgentClient, promisifyGrpc, getPKLogger } from '../utils';

function makeNewKeyCommand() {
  return new commander.Command('new')
    .description('derive a new symmetric key')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option('-v, --verbosity, <verbosity>', 'set the verbosity level, can choose from levels 1, 2 or 3', str => parseInt(str), 1)
    .requiredOption('-n, --key-name <keyName>', '(required) the name of the new key')
    .requiredOption('-p, --key-passphrase <keyPassphrase>', '(required) the passphrase for the new key')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity)
        const client = await getAgentClient(nodePath, undefined, undefined, undefined, pkLogger);

        const keyName = options.keyName;

        const request = new pb.DeriveKeyMessage();
        request.setKeyName(keyName);
        request.setPassphrase(options.keyPassphrase);
        const res = (await promisifyGrpc(client.deriveKey.bind(client))(request)) as pb.BooleanMessage;
        pkLogger.logV2(`'${keyName}' was added to the Key Manager`, PKMessageType.SUCCESS);
      }),
    );
}

function makeDeleteKeyCommand() {
  return new commander.Command('delete')
    .description('delete a symmetric key from the key manager')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option('-v, --verbosity, <verbosity>', 'set the verbosity level, can choose from levels 1, 2 or 3', str => parseInt(str), 1)
    .requiredOption('-n, --key-name <keyName>', '(required) the name of the symmetric key to be deleted')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity)
        const client = await getAgentClient(nodePath, undefined, undefined, undefined, pkLogger);

        const keyName = options.keyName;

        const request = new pb.StringMessage();
        request.setS(keyName);
        const res = (await promisifyGrpc(client.deleteKey.bind(client))(request)) as pb.BooleanMessage;
        pkLogger.logV2(
          `key '${keyName}' was successfully deleted`,
          res.getB() ? PKMessageType.SUCCESS : PKMessageType.INFO,
        );
      }),
    );
}

function makeListKeysCommand() {
  return new commander.Command('list')
    .alias('ls')
    .description('list all symmetric keys in the keynode')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option('-v, --verbosity, <verbosity>', 'set the verbosity level, can choose from levels 1, 2 or 3', str => parseInt(str), 1)
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity)
        const client = await getAgentClient(nodePath, undefined, undefined, undefined, pkLogger);

        const res = (await promisifyGrpc(client.listKeys.bind(client))(new pb.EmptyMessage())) as pb.StringListMessage;
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
}

function makeGetKeyCommand() {
  return new commander.Command('get')
    .description('get the contents of a specific symmetric key')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option('-v, --verbosity, <verbosity>', 'set the verbosity level, can choose from levels 1, 2 or 3', str => parseInt(str), 1)
    .requiredOption('-kn, --key-name <keyName>', '(required) the name of the new key')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity)
        const client = await getAgentClient(nodePath, undefined, undefined, undefined, pkLogger);

        const request = new pb.StringMessage();
        request.setS(options.keyName);
        const res = (await promisifyGrpc(client.getKey.bind(client))(request)) as pb.StringMessage;
        pkLogger.logV1(res.getS(), PKMessageType.SUCCESS);
      }),
    );
}

function makeListPrimaryKeyPairCommand() {
  return new commander.Command('primary')
    .description('get the contents of the primary keypair')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option('-v, --verbosity, <verbosity>', 'set the verbosity level, can choose from levels 1, 2 or 3', str => parseInt(str), 1)
    .option('-pk, --private-key', 'include private key')
    .option('-oj, --output-json', 'output in JSON format')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity)
        const client = await getAgentClient(nodePath, undefined, undefined, undefined, pkLogger);

        const privateKey: boolean = options.privateKey;

        const request = new pb.BooleanMessage();
        request.setB(privateKey);
        const res = (await promisifyGrpc(client.getPrimaryKeyPair.bind(client))(request)) as pb.KeyPairMessage;
        const keypair = { publicKey: res.getPublicKey(), privateKey: res.getPrivateKey() };
        if (<boolean>options.outputJson) {
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
}

function makeKeyManagerCommand() {
  return new commander.Command('keys')
    .description('manipulate keys')
    .addCommand(makeNewKeyCommand())
    .addCommand(makeDeleteKeyCommand())
    .addCommand(makeListKeysCommand())
    .addCommand(makeGetKeyCommand())
    .addCommand(makeListPrimaryKeyPairCommand());
}

export default makeKeyManagerCommand;
