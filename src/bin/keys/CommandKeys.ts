import CommandCert from './CommandCert';
import CommandCertchain from './CommandCertchain';
import CommandDecrypt from './CommandDecrypt';
import CommandEncrypt from './CommandEncrypt';
import CommandPassword from './CommandPassword';
import CommandRenew from './CommandRenew';
import CommandReset from './CommandReset';
import CommandRoot from './CommandRoot';
import CommandSign from './CommandSign';
import CommandVerify from './CommandVerify';
import CommandPolykey from '../CommandPolykey';

class CommandKeys extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('keys');
    this.description('Keys Operations');
    this.addCommand(new CommandCert());
    this.addCommand(new CommandCertchain());
    this.addCommand(new CommandDecrypt());
    this.addCommand(new CommandEncrypt());
    this.addCommand(new CommandPassword());
    this.addCommand(new CommandRenew());
    this.addCommand(new CommandReset());
    this.addCommand(new CommandRoot());
    this.addCommand(new CommandSign());
    this.addCommand(new CommandVerify());
  }
}

export default CommandKeys;
