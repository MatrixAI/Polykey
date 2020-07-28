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
      '-k, --verifying-key <verifyingKey>',
      'path to public key that will be used to verify files, defaults to primary key',
    )
    .option('-s, --detach-sig <detachSig>', 'path to detached signature for file, defaults to [filename].sig')
    .requiredOption('-f, --signed-file <signedFile>', 'file to be signed')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status != 'online') {
          throw Error(`agent status is: ${status}`);
        }

        const nodePath = determineNodePath(options);
        const verifyingKeyPath = options.verifyingKey;
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

function makeCryptoCommand() {
  return new commander.Command('crypto')
    .description('crypto operations')
    .addCommand(makeVerifyCommand())
    .addCommand(makeSignCommand());
}

export default makeCryptoCommand;
