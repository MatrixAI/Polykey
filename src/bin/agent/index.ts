import process from 'process';
import { PolykeyAgent } from '../../Polykey';
import * as agentPB from '../../../proto/js/Agent_pb';
import {
  createCommand,
  verboseToLogLevel,
  resolveKeynodeStatePath,
  promisifyGrpc,
  getAgentClient,
} from '../utils';

const commandStartAgent = createCommand('start', { verbose: true });
commandStartAgent.description('start the agent');
commandStartAgent.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandStartAgent.option(
  '-b, --background',
  'start the agent as a background process',
  false,
);
commandStartAgent.option(
  '-pp, --private-passphrase <privatePassphrase>',
  'provide the passphrase to the private key',
);
commandStartAgent.option(
  '-t, --timeout <timeout>',
  'minutes of inactivity after which keynode is locked again, defaults to 15 minutes. setting to 0 will set no timeout',
  (str) => parseInt(str),
  15,
);
commandStartAgent.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = resolveKeynodeStatePath(options.nodePath);
  try {
    const client = PolykeyAgent.connectToAgent(nodePath);
    const res = (await promisifyGrpc(client.getStatus.bind(client))(
      new agentPB.EmptyMessage(),
    )) as agentPB.AgentStatusMessage;
    if (res.getStatus() == agentPB.AgentStatusType.ONLINE) {
      process.stdout.write(`agent is already running\n`);
    } else {
      throw Error(`agent is not running`);
    }
  } catch (error) {
    const pid = await PolykeyAgent.startAgent(nodePath, options.background);
    const client = PolykeyAgent.connectToAgent(nodePath);
    const res = (await promisifyGrpc(client.getStatus.bind(client))(
      new agentPB.EmptyMessage(),
    )) as agentPB.AgentStatusMessage;
    if (res.getStatus() == agentPB.AgentStatusType.ONLINE) {
      process.stdout.write(`agent has started with a pid of ${pid}\n`);
    } else {
      throw Error('agent could not be started');
    }
    // unlock if passphrase was provided
    if (options.privatePassphrase) {
      const request = new agentPB.UnlockNodeMessage();
      request.setPassphrase(options.privatePassphrase!);
      request.setTimeout(options.timeout!);
      await promisifyGrpc(client.unlockNode.bind(client))(request);
      if (options.timeout == 0) {
        process.stdout.write(
          `polykey is unlocked indefinitely at: '${nodePath}'\n`,
        );
      } else {
        process.stdout.write(
          `polykey is unlocked for ${options.timeout} minute(s) at: '${nodePath}'\n`,
        );
      }
    }
  }
});

const commandRestartAgent = createCommand('restart', { verbose: true });
commandRestartAgent.description('restart the agent');
commandRestartAgent.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandRestartAgent.option(
  '-b, --background',
  'start the agent as a background process',
  false,
);
commandRestartAgent.option(
  '-pp, --private-passphrase <privatePassphrase>',
  'provide the passphrase to the private key',
);
commandRestartAgent.option(
  '-t, --timeout <timeout>',
  'minutes of inactivity after which keynode is locked again, defaults to 15 minutes. setting to 0 will set no timeout',
  (str) => parseInt(str),
  15,
);
commandRestartAgent.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = resolveKeynodeStatePath(options.nodePath);
  let client = await getAgentClient(
    nodePath,
    logger,
    options.background,
    false,
    false,
  );
  // Tell agent to stop
  await promisifyGrpc(client.stopAgent.bind(client))(
    new agentPB.EmptyMessage(),
  );
  const pid = await PolykeyAgent.startAgent(nodePath, options.background);
  if (typeof pid == 'boolean') {
    process.stdout.write(`agent has restarted as a foreground process\n`);
  } else {
    process.stdout.write(`agent has restarted with a pid of ${pid}\n`);
  }
  // unlock if passphrase was provided
  if (options.privatePassphrase) {
    client = await getAgentClient(nodePath, logger);
    const request = new agentPB.UnlockNodeMessage();
    request.setPassphrase(options.privatePassphrase!);
    request.setTimeout(options.timeout!);
    await promisifyGrpc(client.unlockNode.bind(client))(request);
    if (options.timeout == 0) {
      process.stdout.write(
        `polykey is unlocked indefinitely at: '${nodePath}'\n`,
      );
    } else {
      process.stdout.write(
        `polykey is unlocked for ${options.timeout} minute(s) at: '${nodePath}'\n`,
      );
    }
  }
});

const commandAgentStatus = createCommand('status', { verbose: true });
commandAgentStatus.description('retrieve the status of the agent');
commandAgentStatus.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandAgentStatus.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = resolveKeynodeStatePath(options.nodePath);
  try {
    const client = await getAgentClient(nodePath, logger, undefined, false);
    const res = (await promisifyGrpc(client.getStatus.bind(client))(
      new agentPB.EmptyMessage(),
    )) as agentPB.AgentStatusMessage;
    const status = res.getStatus();
    const statusString = Object.keys(agentPB.AgentStatusType).find(
      (k) => agentPB.AgentStatusType[k] === status,
    );
    process.stdout.write(`agent status is: '${statusString?.toLowerCase()}'\n`);
  } catch (error) {
    process.stdout.write(`agent status is: 'offline'\n`);
  }
});

const commandStopAgent = createCommand('stop', { verbose: true });
commandStopAgent.description('stop the agent');
commandStopAgent.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandStopAgent.option('-f, --force', 'forcibly stop the agent');
commandStopAgent.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = resolveKeynodeStatePath(options.nodePath);
  try {
    const client = await getAgentClient(nodePath, logger, undefined, false);

    // see if agent returns with online status
    const res = (await promisifyGrpc(client.getStatus.bind(client))(
      new agentPB.EmptyMessage(),
    )) as agentPB.AgentStatusMessage;
    if (res.getStatus() == agentPB.AgentStatusType.ONLINE) {
      // Tell agent to stop
      await promisifyGrpc(client.stopAgent.bind(client))(
        new agentPB.EmptyMessage(),
      );
      process.stdout.write('agent has successfully stopped\n');
    } else {
      throw Error('agent failed to stop');
    }
  } catch (error) {
    process.stdout.write('agent is already stopped\n');
  }
});

const commandInitNode = createCommand('bootstrap', { verbose: true });
commandInitNode.description('initialize a new polykey node');
commandInitNode.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandInitNode.option(
  '-b, --background',
  'start the agent as a background process',
  false,
);
commandInitNode.requiredOption(
  '-pp, --private-passphrase <privatePassphrase>',
  '(required) provide the passphrase to the private key',
);
commandInitNode.option(
  '-nb, --nbits <nbits>',
  '(optional) number of bits to go into the rsa keypair generation',
  (str) => parseInt(str),
  4096,
);
commandInitNode.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = resolveKeynodeStatePath(options.nodePath);
  const client = await getAgentClient(
    nodePath,
    logger,
    options.background,
    true,
    false,
  );
  const request = new agentPB.NewKeyPairMessage();
  request.setPassphrase(options.privatePassphrase);
  request.setNbits(options.nbits);
  await promisifyGrpc(client.initializeNode.bind(client))(request);
  process.stdout.write(`node was successfully initialized at: '${nodePath}'\n`);
});

const commandUnlockNode = createCommand('unlock', { verbose: true });
commandUnlockNode.description('unlock polykey');
commandUnlockNode.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandUnlockNode.requiredOption(
  '-pp, --private-passphrase <privatePassphrase>',
  '(required) provide the passphrase to the private key',
);
commandUnlockNode.option(
  '-t, --timeout <timeout>',
  'minutes of inactivity after which keynode is locked again, defaults to 15 minutes. setting to 0 will set no timeout',
  (str) => parseInt(str),
  15,
);
commandUnlockNode.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = resolveKeynodeStatePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const request = new agentPB.UnlockNodeMessage();
  request.setPassphrase(options.privatePassphrase!);
  request.setTimeout(options.timeout!);
  await promisifyGrpc(client.unlockNode.bind(client))(request);
  if (options.timeout == 0) {
    process.stdout.write(
      `polykey is unlocked indefinitely at: '${nodePath}'\n`,
    );
  } else {
    process.stdout.write(
      `polykey is unlocked for ${options.timeout} minute(s) at: '${nodePath}'\n`,
    );
  }
});

const commandLockNode = createCommand('lock', { verbose: true });
commandLockNode.description('lock polykey');
commandLockNode.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandLockNode.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = resolveKeynodeStatePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  await promisifyGrpc(client.lockNode.bind(client))(new agentPB.EmptyMessage());
  process.stdout.write(`polykey is now locked at: '${nodePath}'\n`);
});

const commandAgent = createCommand('agent');
commandAgent.description('control the polykey agent');
commandAgent.addCommand(commandAgentStatus);
commandAgent.addCommand(commandStartAgent);
commandAgent.addCommand(commandRestartAgent);
commandAgent.addCommand(commandStopAgent);
commandAgent.addCommand(commandInitNode);
commandAgent.addCommand(commandLockNode);
commandAgent.addCommand(commandUnlockNode);

export default commandAgent;
