import commander from 'commander';
import { PolykeyAgent } from '../lib/Polykey';
import { actionRunner, pkLogger, PKMessageType, determineNodePath } from '.';

function makeSignCommand() {
  return new commander.Command('sign')
    .description('signing operations [files]')
    .option('--node-path <nodePath>', 'node path')
    .option('-k, --signing-key <signingKey>', 'path to private key that will be used to sign files')
    .option('-p, --key-passphrase <keyPassphrase>', 'passphrase to unlock the provided signing key')
    .arguments('file(s) to be signed')
    .action(async (options) => {
      const client = PolykeyAgent.connectToAgent();
      const status = await client.getAgentStatus();
      if (status != 'online') {
        throw Error(`agent status is: ${status}`);
      }

      const nodePath = determineNodePath(options);
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
          const signaturePath = await client.signFile(nodePath, filePath, signingKeyPath, keyPassphrase);
          pkLogger(`file '${filePath}' successfully signed at '${signaturePath}'`, PKMessageType.SUCCESS);
        } catch (err) {
          throw Error(`failed to sign '${filePath}': ${err}`);
        }
      }
    });
}

function makeVerifyCommand() {
  return new commander.Command('verify')
    .description('verification operations')
    .option('--node-path <nodePath>', 'node path')
    .option(
      '-k, --public-key <publicKey>',
      'path to public key that will be used to verify files, defaults to primary key',
    )
    .option('-s, --detach-sig <detachSig>', 'path to detached signature for file, defaults to [filename].sig')
    .requiredOption('-f, --verified-file <verifiedFile>', 'file to be verified')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status != 'online') {
          throw Error(`agent status is: ${status}`);
        }

        const nodePath = determineNodePath(options);
        const publicKey = options.publicKey;
        const filePath = options.signedFile;
        const signaturePath = options.detachSig ?? filePath + '.sig';

        const verified = await client.verifyFile(nodePath, filePath, signaturePath);
        if (verified) {
          pkLogger(`file '${filePath}' was successfully verified`, PKMessageType.SUCCESS);
        } else {
          pkLogger(`file '${filePath}' was not verified`, PKMessageType.WARNING);
        }
      }),
    );
}

function makeEncryptCommand() {
  return new commander.Command('encrypt')
    .description('encryption operations')
    .option('--node-path <nodePath>', 'node path')
    .option(
      '-k, --public-key <publicKey>',
      'path to public key that will be used to encrypt files, defaults to primary key',
    )
    .requiredOption('-f, --file-path <filePath>', 'file to be encrypted')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status != 'online') {
          throw Error(`agent status is: ${status}`);
        }
        const nodePath = determineNodePath(options);

        const publicKey = options.publicKey;
        const filePath = options.filePath

        try {
          const encryptedPath = await client.encryptFile(nodePath, filePath, publicKey);
          pkLogger(`file successfully encrypted: '${encryptedPath}'`, PKMessageType.SUCCESS);
        } catch (err) {
          throw Error(`failed to encrypt '${filePath}': ${err}`);
        }
      }),
    );
}

function makeDecryptCommand() {
  return new commander.Command('decrypt')
    .description('decryption operations')
    .option('--node-path <nodePath>', 'node path')
    .option(
      '-k, --private-key <privateKey>',
      'path to private key that will be used to decrypt files, defaults to primary key',
    )
    .option('-p, --key-passphrase <keyPassphrase>', 'passphrase to unlock the provided private key')
    .requiredOption('-f, --file-path <filePath>', 'file to be decrypted')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status != 'online') {
          throw Error(`agent status is: ${status}`);
        }
        const nodePath = determineNodePath(options);

        const privateKey = options.privateKey;
        const keyPassphrase = options.keyPassphrase;
        const filePath = options.filePath

        try {
          const decryptedPath = await client.decryptFile(nodePath, filePath, privateKey, keyPassphrase);
          pkLogger(`file successfully decrypted: '${decryptedPath}'`, PKMessageType.SUCCESS);
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
    .addCommand(makeDecryptCommand())
}

export default makeCryptoCommand;
