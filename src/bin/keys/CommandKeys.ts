import CommandCert from './CommandCert';
import CommandCertchain from './CommandCertchain';
import CommandDecrypt from './CommandDecrypt';
import CommandEncrypt from './CommandEncrypt';
import CommandPassword from './CommandPassword';
import CommandRenew from './CommandRenew';
import CommandReset from './CommandReset';
import CommandPublic from './CommandPublic';
import CommandPrivate from './CommandPrivate';
import CommandKeypair from './CommandPair';
import CommandSign from './CommandSign';
import CommandVerify from './CommandVerify';
import CommandPolykey from '../CommandPolykey';

class CommandKeys extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('keys');
    this.description('Keys Operations');
    this.addCommand(new CommandCert(...args));
    this.addCommand(new CommandCertchain(...args));
    this.addCommand(new CommandDecrypt(...args));
    this.addCommand(new CommandEncrypt(...args));
    this.addCommand(new CommandPassword(...args));
    this.addCommand(new CommandRenew(...args));
    this.addCommand(new CommandReset(...args));
    this.addCommand(new CommandPublic(...args));
    this.addCommand(new CommandPrivate(...args));
    this.addCommand(new CommandKeypair(...args));
    this.addCommand(new CommandSign(...args));
    this.addCommand(new CommandVerify(...args));
  }
}

export default CommandKeys;
