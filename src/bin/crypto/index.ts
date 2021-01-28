import commander from 'commander';
import * as agentPB from '../../../proto/js/Agent_pb';
import {
  actionRunner,
  PKMessageType,
  resolveKeynodeStatePath,
  promisifyGrpc,
  getAgentClient,
  getPKLogger,
} from '../utils';

const commandSign = new commander.Command('sign');
commandSign.description('signing operations [files]');
commandSign.option('-k, --node-path <nodePath>', 'provide the polykey path');
commandSign.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandSign.option(
  '-k, --signing-key <signingKey>',
  'path to private key that will be used to sign files',
);
commandSign.option(
  '-p, --key-passphrase <keyPassphrase>',
  'passphrase to unlock the provided signing key',
);
commandSign.arguments('file(s) to be signed');
commandSign.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const signingKeyPath = options.signingKey;
    const keyPassphrase = options.keyPassphrase;
    if (
      (signingKeyPath || keyPassphrase) &&
      !(signingKeyPath && keyPassphrase)
    ) {
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
        pkLogger.logV2(
          `file '${filePath}' successfully signed at '${res.getS()}'`,
          PKMessageType.SUCCESS,
        );
      } catch (err) {
        throw Error(`failed to sign '${filePath}': ${err}`);
      }
    }
  }),
);

const commandVerify = new commander.Command('verify');
commandVerify.description('verification operations');
commandVerify.option('-k, --node-path <nodePath>', 'provide the polykey path');
commandVerify.option(
  '-k, --public-key <publicKey>',
  'path to public key that will be used to verify files, defaults to primary key',
);
commandVerify.requiredOption(
  '-f, --signed-file <signedFile>',
  '(required) file to be verified',
);
commandVerify.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);
    const filePath = options.signedFile;
    const request = new agentPB.VerifyFileMessage();
    request.setFilePath(filePath);
    request.setPublicKeyPath(options.publicKey);
    await promisifyGrpc(client.verifyFile.bind(client))(request);
    pkLogger.logV2(
      `file '${filePath}' was successfully verified`,
      PKMessageType.SUCCESS,
    );
  }),
);

const commandEncrypt = new commander.Command('encrypt');
commandEncrypt.description('encryption operations');
commandEncrypt.option('-k, --node-path <nodePath>', 'provide the polykey path');
commandEncrypt.option(
  '-k, --public-key <publicKey>',
  'path to public key that will be used to encrypt files, defaults to primary key',
);
commandEncrypt.requiredOption(
  '-f, --file-path <filePath>',
  '(required) file to be encrypted',
);
commandEncrypt.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const filePath = options.filePath;

    try {
      const request = new agentPB.EncryptFileMessage();
      request.setFilePath(filePath);
      request.setPublicKeyPath(options.publicKey);
      const res = (await promisifyGrpc(client.encryptFile.bind(client))(
        request,
      )) as agentPB.StringMessage;
      pkLogger.logV2(
        `file successfully encrypted: '${res.getS()}'`,
        PKMessageType.SUCCESS,
      );
    } catch (err) {
      throw Error(`failed to encrypt '${filePath}': ${err}`);
    }
  }),
);

const commandDecrypt = new commander.Command('decrypt');
commandDecrypt.description('decryption operations');
commandDecrypt.option('-k, --node-path <nodePath>', 'provide the polykey path');
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
commandDecrypt.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const filePath = options.filePath;

    try {
      const request = new agentPB.DecryptFileMessage();
      request.setFilePath(filePath);
      request.setPrivateKeyPath(options.privateKey);
      request.setPassphrase(options.keyPassphrase);
      const res = (await promisifyGrpc(client.decryptFile.bind(client))(
        request,
      )) as agentPB.StringMessage;
      pkLogger.logV2(
        `file successfully decrypted: '${res.getS()}'`,
        PKMessageType.SUCCESS,
      );
    } catch (err) {
      throw Error(`failed to decrypt '${filePath}': ${err}`);
    }
  }),
);

const commandCrypto = new commander.Command('crypto');
commandCrypto.description('crypto operations');
commandCrypto.addCommand(commandSign);
commandCrypto.addCommand(commandVerify);
commandCrypto.addCommand(commandEncrypt);
commandCrypto.addCommand(commandDecrypt);

export default commandCrypto;
