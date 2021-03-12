import process from 'process';
import * as agentPB from '../../proto/js/Agent_pb';
import {
  createCommand,
  verboseToLogLevel,
  promisifyGrpc,
  getAgentClient,
} from '../utils';
import { getNodePath } from '../../utils';

const commandSign = createCommand('sign', { verbose: true });
commandSign.description('signing operations [files]');
commandSign.option('-np, --node-path <nodePath>', 'provide the polykey path');
commandSign.option(
  '-k, --signing-key <signingKey>',
  'path to private key that will be used to sign files',
);
commandSign.option(
  '-p, --key-passphrase <keyPassphrase>',
  'passphrase to unlock the provided signing key',
);
commandSign.arguments('file(s) to be signed');
commandSign.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = getNodePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const signingKeyPath = options.signingKey;
  const keyPassphrase = options.keyPassphrase;
  if ((signingKeyPath || keyPassphrase) && !(signingKeyPath && keyPassphrase)) {
    throw Error('signing key and passphrase must be specified together');
  }
  const filePathList = options.args.values();
  if (filePathList.length == 0) {
    throw Error('no files provided');
  }
  for (const filePath of filePathList) {
    try {
      const request = new agentPB.SignFileMessage();
      request.setFilePath(filePath);
      request.setPrivateKeyPath(signingKeyPath);
      request.setPassphrase(keyPassphrase);
      const res = (await promisifyGrpc(client.signFile.bind(client))(
        request,
      )) as agentPB.StringMessage;
      process.stdout.write(
        `file '${filePath}' successfully signed at '${res.getS()}'\n`,
      );
    } catch (err) {
      throw Error(`failed to sign '${filePath}': ${err}`);
    }
  }
});

const commandVerify = createCommand('verify', { verbose: true });
commandVerify.description('verification operations');
commandVerify.option('-np, --node-path <nodePath>', 'provide the polykey path');
commandVerify.option(
  '-k, --public-key <publicKey>',
  'path to public key that will be used to verify files, defaults to primary key',
);
commandVerify.requiredOption(
  '-f, --signed-file <signedFile>',
  '(required) file to be verified',
);
commandVerify.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = getNodePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const filePath = options.signedFile;
  const request = new agentPB.VerifyFileMessage();
  request.setFilePath(filePath);
  request.setPublicKeyPath(options.publicKey);
  await promisifyGrpc(client.verifyFile.bind(client))(request);
  process.stdout.write(`file '${filePath}' was successfully verified\n`);
});

const commandEncrypt = createCommand('encrypt', { verbose: true });
commandEncrypt.description('encryption operations');
commandEncrypt.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandEncrypt.option(
  '-k, --public-key <publicKey>',
  'path to public key that will be used to encrypt files, defaults to primary key',
);
commandEncrypt.requiredOption(
  '-f, --file-path <filePath>',
  '(required) file to be encrypted',
);
commandEncrypt.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = getNodePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const filePath = options.filePath;
  try {
    const request = new agentPB.EncryptFileMessage();
    request.setFilePath(filePath);
    request.setPublicKeyPath(options.publicKey);
    const res = (await promisifyGrpc(client.encryptFile.bind(client))(
      request,
    )) as agentPB.StringMessage;
    process.stdout.write(`file successfully encrypted: '${res.getS()}'\n`);
  } catch (err) {
    throw Error(`failed to encrypt '${filePath}': ${err}`);
  }
});

const commandDecrypt = createCommand('decrypt', { verbose: true });
commandDecrypt.description('decryption operations');
commandDecrypt.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandDecrypt.option(
  '-k, --private-key <privateKey>',
  'path to private key that will be used to decrypt files, defaults to primary key',
);
commandDecrypt.option(
  '-p, --key-passphrase <keyPassphrase>',
  'passphrase to unlock the provided private key',
);
commandDecrypt.requiredOption(
  '-f, --file-path <filePath>',
  '(required) file to be decrypted',
);
commandDecrypt.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = getNodePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const filePath = options.filePath;
  try {
    const request = new agentPB.DecryptFileMessage();
    request.setFilePath(filePath);
    request.setPrivateKeyPath(options.privateKey);
    request.setPassphrase(options.keyPassphrase);
    const res = (await promisifyGrpc(client.decryptFile.bind(client))(
      request,
    )) as agentPB.StringMessage;
    process.stdout.write(`file successfully decrypted: '${res.getS()}'\n`);
  } catch (err) {
    throw Error(`failed to decrypt '${filePath}': ${err}`);
  }
});

const commandCrypto = createCommand('crypto');
commandCrypto.description('crypto operations');
commandCrypto.addCommand(commandSign);
commandCrypto.addCommand(commandVerify);
commandCrypto.addCommand(commandEncrypt);
commandCrypto.addCommand(commandDecrypt);

export default commandCrypto;
