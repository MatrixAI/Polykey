import process from 'process';
import * as agentPB from '../../proto/js/Agent_pb';
import {
  createCommand,
  verboseToLogLevel,
  getAgentClient,
  promisifyGrpc,
  outputFormatter,
} from '../utils';
import { getNodePath } from '../../utils';

const commandNewKey = createCommand('new', { verbose: true, format: true });
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
  const nodePath = getNodePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const keyName = options.keyName;
  const request = new agentPB.DeriveKeyMessage();
  request.setKeyName(keyName);
  request.setPassphrase(options.keyPassphrase);
  await promisifyGrpc(client.deriveKey.bind(client))(request);
  process.stdout.write(
    outputFormatter({
      type: options.format === 'json' ? 'json' : 'list',
      data: [`Added`, `${keyName}`],
    }),
  );
});

const commandNewKeyPair = createCommand('keypair', {
  verbose: true,
  format: true,
});
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
  const nodePath = getNodePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const subRequest = new agentPB.NewKeyPairMessage();
  subRequest.setNbits(options.nbits);
  subRequest.setPassphrase(options.passphrase);
  const request = new agentPB.DeriveKeyPairMessage();
  request.setKeypairDetails(subRequest);
  request.setPublicKeyPath(options.publicPath!);
  request.setPrivateKeyPath(options.privatePath!);
  await promisifyGrpc(client.deriveKeyPair.bind(client))(request);
  process.stdout.write(
    outputFormatter({
      type: options.format === 'json' ? 'json' : 'list',
      data: [`Generated Keypair`],
    }),
  );
});

const commandDeleteKey = createCommand('delete', {
  verbose: true,
  format: true,
});
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
  const nodePath = getNodePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const keyName = options.keyName;
  const request = new agentPB.StringMessage();
  request.setS(keyName);
  await promisifyGrpc(client.deleteKey.bind(client))(request);
  process.stdout.write(
    outputFormatter({
      type: options.format === 'json' ? 'json' : 'list',
      data: [`Deleted ${keyName}`],
    }),
  );
});

const commandListKeys = createCommand('list', { verbose: true, format: true });
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
  const nodePath = getNodePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const res = (await promisifyGrpc(client.listKeys.bind(client))(
    new agentPB.EmptyMessage(),
  )) as agentPB.StringListMessage;
  const keyNames = res.getSList();
  if (keyNames === undefined || keyNames.length == 0) {
    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [`No keys exist`],
      }),
    );
  } else {
    const output: Array<string> = [];
    keyNames.forEach((keyName: string, index: number) => {
      output.push(`Key ${index + 1}: ${keyName}`);
    });
    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: output,
      }),
    );
  }
});

const commandGetKey = createCommand('get', { verbose: true, format: true });
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
  const nodePath = getNodePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const request = new agentPB.StringMessage();
  request.setS(options.keyName);
  const res = (await promisifyGrpc(client.getKey.bind(client))(
    request,
  )) as agentPB.StringMessage;
  process.stdout.write(
    outputFormatter({
      type: options.format === 'json' ? 'json' : 'list',
      data: [`Key: ${res.getS()}`],
    }),
  );
});

const commandListPrimaryKeyPair = createCommand('primary', {
  verbose: true,
  format: true,
});
commandListPrimaryKeyPair.description(
  'get the contents of the primary keypair',
);
commandListPrimaryKeyPair.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandListPrimaryKeyPair.option('-pk, --private-key', 'include private key');
commandListPrimaryKeyPair.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = getNodePath(options.nodePath);
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
  let msg = [`Public`];
  let value = [`${keypair.publicKey}`];
  if (privateKey) {
    msg = [`Public`, `Private`];
    value = [`${keypair.publicKey}`, `${keypair.privateKey}`];
  }
  // Convert to OutputObject format
  const output: Array<string> = [];
  msg.forEach((m, index) => {
    output.push(`${m}: ${value[index]}`);
  });
  process.stdout.write(
    outputFormatter({
      type: options.format === 'json' ? 'json' : 'list',
      data: output,
    }),
  );
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
