import commander from 'commander';
import { actionRunner, PKMessageType, determineNodePath, promisifyGrpc, getAgentClient, getPKLogger } from '../utils';
import * as pb from '../../../proto/compiled/Agent_pb';

function makeSignCommand() {
  return new commander.Command('sign')
    .description('signing operations [files]')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option(
      '-v, --verbosity, <verbosity>',
      'set the verbosity level, can choose from levels 1, 2 or 3',
      (str) => parseInt(str),
      1,
    )
    .option('-k, --signing-key <signingKey>', 'path to private key that will be used to sign files')
    .option('-p, --key-passphrase <keyPassphrase>', 'passphrase to unlock the provided signing key')
    .arguments('file(s) to be signed')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity);
        const client = await getAgentClient(nodePath, pkLogger);

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
            const request = new pb.SignFileMessage();
            request.setFilePath(filePath);
            request.setPrivateKeyPath(signingKeyPath);
            request.setPassphrase(keyPassphrase);
            const res = (await promisifyGrpc(client.signFile.bind(client))(request)) as pb.StringMessage;
            pkLogger.logV2(`file '${filePath}' successfully signed at '${res.getS()}'`, PKMessageType.SUCCESS);
          } catch (err) {
            throw Error(`failed to sign '${filePath}': ${err}`);
          }
        }
      }),
    );
}

function makeVerifyCommand() {
  return new commander.Command('verify')
    .description('verification operations')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option(
      '-k, --public-key <publicKey>',
      'path to public key that will be used to verify files, defaults to primary key',
    )
    .requiredOption('-f, --signed-file <signedFile>', '(required) file to be verified')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity);
        const client = await getAgentClient(nodePath, pkLogger);

        const filePath = options.signedFile;

        const request = new pb.VerifyFileMessage();
        request.setFilePath(filePath);
        request.setPublicKeyPath(options.publicKey);
        await promisifyGrpc(client.verifyFile.bind(client))(request);
        pkLogger.logV2(`file '${filePath}' was successfully verified`, PKMessageType.SUCCESS);
      }),
    );
}

function makeEncryptCommand() {
  return new commander.Command('encrypt')
    .description('encryption operations')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option(
      '-k, --public-key <publicKey>',
      'path to public key that will be used to encrypt files, defaults to primary key',
    )
    .requiredOption('-f, --file-path <filePath>', '(required) file to be encrypted')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity);
        const client = await getAgentClient(nodePath, pkLogger);

        const filePath = options.filePath;

        try {
          const request = new pb.EncryptFileMessage();
          request.setFilePath(filePath);
          request.setPublicKeyPath(options.publicKey);
          const res = (await promisifyGrpc(client.encryptFile.bind(client))(request)) as pb.StringMessage;
          pkLogger.logV2(`file successfully encrypted: '${res.getS()}'`, PKMessageType.SUCCESS);
        } catch (err) {
          throw Error(`failed to encrypt '${filePath}': ${err}`);
        }
      }),
    );
}

function makeDecryptCommand() {
  return new commander.Command('decrypt')
    .description('decryption operations')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option(
      '-k, --private-key <privateKey>',
      'path to private key that will be used to decrypt files, defaults to primary key',
    )
    .option('-p, --key-passphrase <keyPassphrase>', 'passphrase to unlock the provided private key')
    .requiredOption('-f, --file-path <filePath>', '(required) file to be decrypted')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity);
        const client = await getAgentClient(nodePath, pkLogger);

        const filePath = options.filePath;

        try {
          const request = new pb.DecryptFileMessage();
          request.setFilePath(filePath);
          request.setPrivateKeyPath(options.privateKey);
          request.setPassphrase(options.keyPassphrase);
          const res = (await promisifyGrpc(client.decryptFile.bind(client))(request)) as pb.StringMessage;
          pkLogger.logV2(`file successfully decrypted: '${res.getS()}'`, PKMessageType.SUCCESS);
        } catch (err) {
          throw Error(`failed to decrypt '${filePath}': ${err}`);
        }
      }),
    );
}

function makeCryptoCommand() {
  return new commander.Command('crypto')
    .description('crypto operations')
    .addCommand(makeVerifyCommand())
    .addCommand(makeSignCommand())
    .addCommand(makeEncryptCommand())
    .addCommand(makeDecryptCommand());
}

export default makeCryptoCommand;
