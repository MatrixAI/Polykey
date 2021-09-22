import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import PolykeyAgent from '../../PolykeyAgent';

import * as utils from '../../utils';
import * as binUtils from '../utils';
import * as agentUtils from '../../agent/utils';

const start = binUtils.createCommand('start', {
  description: 'Starts the polykey agent',
  nodePath: true,
  verbose: true,
  format: true,
  passwordFile: true,
});
start.option('-b, --background', 'Starts the agent as a background process');
start.action(async (options) => {
  const agentConfig = {};
  agentConfig['logger'] = new Logger('CLI Logger', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  if (options.verbose) {
    agentConfig['logger'].setLevel(LogLevel.DEBUG);
  }
  const nodePath = options.nodePath
    ? options.nodePath
    : utils.getDefaultNodePath();
  agentConfig['nodePath'] = nodePath;
  const background = options.background;

  const password = await fs.promises.readFile(options.passwordFile, {
    encoding: 'utf-8',
  });

  try {
    if (background) {
      await agentUtils.spawnBackgroundAgent(nodePath, password);
    } else {
      const agent = new PolykeyAgent(agentConfig);
      await agent.start({ password: password });

      // If started add handlers for terminating.
      const termHandler = async () => await agent.stop();
      process.on('SIGTERM', termHandler); //For kill command.
      process.on('SIGHUP', termHandler); // Edge case if remote terminal closes. like someone runs agent start in ssh.
      process.on('SIGINT', termHandler); // For ctrl+C
    }
  } catch (err) {
    process.stderr.write(
      binUtils.outputFormatter({
        type: 'error',
        description: err.description,
        message: err.message,
      }),
    );
    throw err;
  } finally {
    options.passwordFile = undefined;
    options.nodePath = undefined;
    options.verbose = undefined;
    options.format = undefined;
    options.background = undefined;
  }
});

export default start;
