import process from 'process';
import CommandPolykey from '../CommandPolykey';
import * as binOptions from '../utils/options';
import * as binProcessors from '../utils/processors';

class CommandBootstrap extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('bootstrap');
    this.description('Bootstrap Keynode State');
    this.addOption(binOptions.recoveryCodeFile);
    this.addOption(binOptions.rootKeyPairBits);
    this.addOption(binOptions.fresh);
    this.addOption(binOptions.rootKeyFile);
    this.action(async (options) => {
      const bootstrapUtils = await import('../../bootstrap/utils');
      const password = await binProcessors.processNewPassword(
        options.passwordFile,
        this.fs,
      );
      const recoveryCodeIn = await binProcessors.processRecoveryCode(
        options.recoveryCodeFile,
        this.fs,
      );
      const privateKeyPem = await binProcessors.processRootKey(
        options.rootKeyFile,
      );
      const recoveryCodeOut = await bootstrapUtils.bootstrapState({
        password,
        nodePath: options.nodePath,
        keysConfig: {
          rootKeyPairBits: options.rootKeyPairBits,
          recoveryCode: recoveryCodeIn,
          privateKeyPemOverride: privateKeyPem,
        },
        fresh: options.fresh,
        fs: this.fs,
        logger: this.logger,
      });
      this.logger.info(`Bootstrapped ${options.nodePath}`);
      if (recoveryCodeOut != null) process.stdout.write(recoveryCodeOut + '\n');
    });
  }
}

export default CommandBootstrap;
