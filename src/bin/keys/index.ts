import commander from 'commander';
import { PolykeyAgent } from '../../Polykey';
import { actionRunner, pkLogger, PKMessageType, determineNodePath } from '../utils';

function makeNewKeyCommand() {
  return new commander.Command('new')
    .description('derive a new symmetric key')
    .option('--node-path <nodePath>', 'node path')
    .requiredOption('-n, --key-name <keyName>', 'the name of the new key')
    .requiredOption('-p, --key-passphrase <keyPassphrase>', 'the passphrase for the new key')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        const nodePath = determineNodePath(options.nodePath);
        const keyName = options.keyName;

        await client.deriveKey(nodePath, keyName, options.keyPassphrase);
        pkLogger(`'${keyName}' was added to the Key Manager`, PKMessageType.SUCCESS);
      }),
    );
}

function makeDeleteKeyCommand() {
  return new commander.Command('delete')
    .description('delete a symmetric key from the key manager')
    .option('--node-path <nodePath>', 'node path')
    .requiredOption('-n, --key-name <keyName>', 'the name of the symmetric key to be deleted')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        const nodePath = determineNodePath(options.nodePath);
        const keyName = options.keyName;

        const successful = await client.deleteKey(nodePath, keyName);
        pkLogger(
          `key '${keyName}' was ${successful ? '' : 'un-'}successfully deleted`,
          successful ? PKMessageType.SUCCESS : PKMessageType.INFO,
        );
      }),
    );
}

function makeListKeysCommand() {
  return new commander.Command('list')
    .alias('ls')
    .description('list all symmetric keys in the keynode')
    .option('--node-path <nodePath>', 'node path')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        const nodePath = determineNodePath(options.nodePath);

        const keyNames = await client.listKeys(nodePath);
        for (const name of keyNames) {
          pkLogger(name, PKMessageType.INFO);
        }
      }),
    );
}

function makeGetKeyCommand() {
  return new commander.Command('get')
    .description('get the contents of a specific symmetric key')
    .option('--node-path <nodePath>', 'node path')
    .requiredOption('-n, --key-name <keyName>', 'the name of the new key')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        const nodePath = determineNodePath(options.nodePath);

        const keyContent = await client.getKey(nodePath, options.keyName);
        pkLogger(keyContent, PKMessageType.INFO);
      }),
    );
}

function makeListPrimaryKeyPairCommand() {
  return new commander.Command('primary')
    .description('get the contents of the primary keypair')
    .option('--node-path <nodePath>', 'node path')
    .option('-p, --private-key', 'include private key')
    .option('-j, --output-json', 'output in JSON format')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        const nodePath = determineNodePath(options.nodePath);
        const privateKey: boolean = options.privateKey;

        const keypair = await client.getPrimaryKeyPair(nodePath, privateKey);
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
