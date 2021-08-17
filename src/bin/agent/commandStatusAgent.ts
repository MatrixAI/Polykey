import * as utils from '../../utils';
import * as binUtils from '../utils';
import { checkAgentRunning } from '../../agent/utils';

const commandStatusAgent = binUtils.createCommand('status', {
  description: 'Gets the status of the polykey agent',
  nodePath: true,
  verbose: true,
  format: true,
});
commandStatusAgent.action(async (options) => {
  const message = (await checkAgentRunning(options.nodePath))
    ? 'online'
    : 'offline';

  try {
    process.stdout.write(
      binUtils.outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [`Agent is ${message}`],
      }),
    );
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
    options.nodePath = undefined;
    options.verbose = undefined;
    options.format = undefined;
  }
});

export default commandStatusAgent;
