import commander from 'commander';
import * as pb from '../../../proto/compiled/Agent_pb';
import { actionRunner, pkLogger, PKMessageType, determineNodePath, getAgentClient, promisifyGrpc } from '../utils';

function makeNewKeyCommand() {
  return new commander.Command('new')
    .description('derive a new symmetric key')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .requiredOption('-n, --key-name <keyName>', '(required) the name of the new key')
    .requiredOption('-p, --key-passphrase <keyPassphrase>', '(required) the passphrase for the new key')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const client = await getAgentClient(nodePath);

        const keyName = options.keyName;

        const request = new pb.DeriveKeyMessage();
        request.setKeyName(keyName);
        request.setPassphrase(options.keyPassphrase);
        const res = (await promisifyGrpc(client.deriveKey.bind(client))(request)) as pb.BooleanMessage;
        pkLogger(`'${keyName}' was added to the Key Manager`, PKMessageType.SUCCESS);
      }),
    );
}

function makeDeleteKeyCommand() {
  return new commander.Command('delete')
    .description('delete a symmetric key from the key manager')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .requiredOption('-n, --key-name <keyName>', '(required) the name of the symmetric key to be deleted')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const client = await getAgentClient(nodePath);

        const keyName = options.keyName;

        const request = new pb.StringMessage();
        request.setS(keyName);
        const res = (await promisifyGrpc(client.deleteKey.bind(client))(request)) as pb.BooleanMessage;
        pkLogger(
          `key '${keyName}' was ${res.getB() ? '' : 'un-'}successfully deleted`,
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
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const client = await getAgentClient(nodePath);

        const res = (await promisifyGrpc(client.listKeys.bind(client))(new pb.EmptyMessage())) as pb.StringListMessage;
        const keyNames = res.getSList();

        if (keyNames === undefined || keyNames.length == 0) {
          pkLogger('no keys exist', PKMessageType.INFO);
        } else {
          keyNames.forEach((keyName: string, index: number) => {
            pkLogger(`${index + 1}: ${keyName}`, PKMessageType.INFO);
          });
        }
      }),
    );
}

function makeGetKeyCommand() {
  return new commander.Command('get')
    .description('get the contents of a specific symmetric key')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .requiredOption('-kn, --key-name <keyName>', '(required) the name of the new key')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const client = await getAgentClient(nodePath);

        const request = new pb.StringMessage();
        request.setS(options.keyName);
        const res = (await promisifyGrpc(client.getKey.bind(client))(request)) as pb.StringMessage;
        pkLogger(res.getS(), PKMessageType.INFO);
      }),
    );
}

function makeListPrimaryKeyPairCommand() {
  return new commander.Command('primary')
    .description('get the contents of the primary keypair')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option('-pk, --private-key', 'include private key')
    .option('-oj, --output-json', 'output in JSON format')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const client = await getAgentClient(nodePath);

        const privateKey: boolean = options.privateKey;

        const request = new pb.BooleanMessage();
        request.setB(privateKey);
        const res = (await promisifyGrpc(client.getPrimaryKeyPair.bind(client))(request)) as pb.KeyPairMessage;
        const keypair = { publicKey: res.getPublicKey(), privateKey: res.getPrivateKey() };
        if (<boolean>options.outputJson) {
          pkLogger(JSON.stringify(keypair), PKMessageType.INFO);
        } else {
          pkLogger('Public Key:', PKMessageType.SUCCESS);
          pkLogger(keypair.publicKey, PKMessageType.INFO);
          if (privateKey) {
            pkLogger('Private Key:', PKMessageType.SUCCESS);
            pkLogger(keypair.privateKey, PKMessageType.INFO);
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
