import CommandPolykey from '../CommandPolykey';

class CommandStart extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('start');
    this.description('Start the Polykey Agent');
    this.option('-b, --background', 'Starts the agent as a background process');
    this.action(async (options) => {
      const agentUtils = await import('../../agent/utils');
      const { default: PolykeyAgent } = await import('../../PolykeyAgent');
      const background = options.background;
      const password = await this.fs.promises.readFile(options.passwordFile, {
        encoding: 'utf-8',
      });

      if (background) {
        await agentUtils.spawnBackgroundAgent(options.nodePath, password);
      } else {
        const agent = await PolykeyAgent.createPolykeyAgent({
          password,
          logger: this.logger.getChild(PolykeyAgent.name),
          nodePath: options.nodePath,
        });

        // If started add handlers for terminating.
        const termHandler = async () => {
          await agent.stop();
        };
        process.on('SIGTERM', termHandler); // For kill command.
        process.on('SIGHUP', termHandler); // Edge case if remote terminal closes. like someone runs agent start in ssh.
        process.on('SIGINT', termHandler); // For ctrl+C
      }
    });
  }
}

export default CommandStart;
