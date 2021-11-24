import CommandPolykey from '../CommandPolykey';
import * as binOptions from '../options';

class CommandLock extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('lock');
    this.description('Lock the Client and Clear the Existing Token');
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const client = await PolykeyClient.createPolykeyClient({
        logger: this.logger.getChild(PolykeyClient.name),
        nodePath: options.nodePath,
      });

      try {
        // Clear token from memory
        await client.session.stop();
        // Remove token from fs
        await client.session.destroy();
        process.stdout.write('Client session stopped');
      } finally {
        await client.stop();
      }
    });
  }
}

export default CommandLock;
