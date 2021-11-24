import prompts from 'prompts';
import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import { bootstrapPolykeyState } from '../../bootstrap';

class CommandBootstrap extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('bootstrap');
    this.description('Bootstrap Keynode State');
    this.action(async (options) => {
      let password;
      if (options.passwordFile != null) {
        password = await this.fs.promises.readFile(options.passwordFile, {
          encoding: 'utf-8',
        });
      } else {
        let success = false;
        while (!success) {
          const response = await prompts({
            type: 'text',
            name: 'password',
            message: 'Please enter a password for your Polykey Node:',
          });
          password = response.password;
          const confirm = await prompts({
            type: 'text',
            name: 'confirm',
            message: 'Please re-enter your password:',
          });
          const passwordConfirm = confirm.confirm;
          if (password === passwordConfirm) {
            success = true;
          } else {
            this.logger.warn('Passwords did not match, please try again');
          }
        }
      }
      await bootstrapPolykeyState(options.nodePath, password);
      process.stdout.write(
        binUtils.outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: [`Polykey bootstrapped at Node Path: ${options.nodePath}`],
        }),
      );
    });
  }
}

export default CommandBootstrap;
