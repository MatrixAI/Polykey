import path from 'path';
import CommandPolykey from '../CommandPolykey';
import config from '../../config';

class CommandLock extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('lock');
    this.description('Lock the Client and Clear the Existing Token');
    this.action(async (options) => {
      const { default: Session } = await import('../../sessions/Session');
      // Just delete the session token
      const session = new Session({
        sessionTokenPath: path.join(
          options.nodePath,
          config.defaults.tokenBase,
        ),
        fs: this.fs,
        logger: this.logger.getChild(Session.name),
      });
      await session.destroy();
    });
  }
}

export default CommandLock;
