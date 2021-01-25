import commander from 'commander';
import { PolykeyAgent } from '../../Polykey';
import * as agentPB from '../../../proto/js/Agent_pb';
import {
  actionRunner,
  getPKLogger,
  PKMessageType,
  resolveKeynodeStatePath,
  promisifyGrpc,
  getAgentClient,
} from '../utils';

const commandStartAgent = new commander.Command('start');
commandStartAgent.description('start the agent');
commandStartAgent.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandStartAgent.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandStartAgent.option('-b, --background', 'start the agent as a background process', false);
commandStartAgent.option(
  '-pp, --private-passphrase <privatePassphrase>',
  'provide the passphrase to the private key',
);
commandStartAgent.option(
  '-t, --timeout <timeout>',
  'minutes of inactivity after which keynode is locked again, defaults to 15 minutes. setting to 0 will set no timeout',
  '15',
);
commandStartAgent.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    try {
      const client = PolykeyAgent.connectToAgent(nodePath);

      const res = (await promisifyGrpc(client.getStatus.bind(client))(
        new agentPB.EmptyMessage(),
      )) as agentPB.AgentStatusMessage;
      if (res.getStatus() == agentPB.AgentStatusType.ONLINE) {
        pkLogger.logV2(`agent is already running`, PKMessageType.INFO);
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
        pkLogger.logV2(
          `agent has started with a pid of ${pid}`,
          PKMessageType.SUCCESS,
        );
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
          pkLogger.logV2(
            `polykey is unlocked indefinitely at: '${nodePath}'`,
            PKMessageType.SUCCESS,
          );
        } else {
          pkLogger.logV2(
            `polykey is unlocked for ${options.timeout} minute(s) at: '${nodePath}'`,
            PKMessageType.SUCCESS,
          );
        }
      }
    }
  }, false),
);

const commandRestartAgent = new commander.Command('restart');
commandRestartAgent.description('restart the agent');
commandRestartAgent.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandRestartAgent.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandRestartAgent.option('-b, --background', 'start the agent as a background process', false);
commandRestartAgent.option(
  '-pp, --private-passphrase <privatePassphrase>',
  'provide the passphrase to the private key',
);
commandRestartAgent.option(
  '-t, --timeout <timeout>',
  'minutes of inactivity after which keynode is locked again, defaults to 15 minutes. setting to 0 will set no timeout',
  '15',
);
commandRestartAgent.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    let client = await getAgentClient(
      nodePath,
      pkLogger,
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
      pkLogger.logV2(
        `agent has restarted as a foreground process`,
        PKMessageType.SUCCESS,
      );
    } else {
      pkLogger.logV2(
        `agent has restarted with a pid of ${pid}`,
        PKMessageType.SUCCESS,
      );
    }
    // unlock if passphrase was provided
    if (options.privatePassphrase) {
      client = await getAgentClient(nodePath, pkLogger);
      const request = new agentPB.UnlockNodeMessage();
      request.setPassphrase(options.privatePassphrase!);
      request.setTimeout(options.timeout!);
      await promisifyGrpc(client.unlockNode.bind(client))(request);
      if (options.timeout == 0) {
        pkLogger.logV2(
          `polykey is unlocked indefinitely at: '${nodePath}'`,
          PKMessageType.SUCCESS,
        );
      } else {
        pkLogger.logV2(
          `polykey is unlocked for ${options.timeout} minute(s) at: '${nodePath}'`,
          PKMessageType.SUCCESS,
        );
      }
    }
  }, false),
);

const commandAgentStatus = new commander.Command('status');
commandAgentStatus.description('retrieve the status of the agent');
commandAgentStatus.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandAgentStatus.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandAgentStatus.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    try {
      const client = await getAgentClient(nodePath, pkLogger, undefined, false);
      const res = (await promisifyGrpc(client.getStatus.bind(client))(
        new agentPB.EmptyMessage(),
      )) as agentPB.AgentStatusMessage;

      const status = res.getStatus();
      const statusString = Object.keys(agentPB.AgentStatusType).find(
        (k) => agentPB.AgentStatusType[k] === status,
      );
      pkLogger.logV1(
        `agent status is: '${statusString?.toLowerCase()}'`,
        PKMessageType.INFO,
      );
    } catch (error) {
      pkLogger.logV1(`agent status is: 'offline'`, PKMessageType.INFO);
    }
  }),
);

const commandStopAgent = new commander.Command('stop');
commandStopAgent.description('stop the agent');
commandStopAgent.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandStopAgent.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandStopAgent.option('-f, --force', 'forcibly stop the agent');
commandStopAgent.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    try {
      const client = await getAgentClient(nodePath, pkLogger, undefined, false);

      // see if agent returns with online status
      const res = (await promisifyGrpc(client.getStatus.bind(client))(
        new agentPB.EmptyMessage(),
      )) as agentPB.AgentStatusMessage;
      if (res.getStatus() == agentPB.AgentStatusType.ONLINE) {
        // Tell agent to stop
        await promisifyGrpc(client.stopAgent.bind(client))(
          new agentPB.EmptyMessage(),
        );
        pkLogger.logV2('agent has successfully stopped', PKMessageType.SUCCESS);
      } else {
        throw Error('agent failed to stop');
      }
    } catch (error) {
      pkLogger.logV2('agent is already stopped', PKMessageType.INFO);
    }
  }),
);

const commandInitNode = new commander.Command('init');
commandInitNode.description('initialize a new polykey node');
commandInitNode.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandInitNode.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandInitNode.option('-b, --background', 'start the agent as a background process', false);
commandInitNode.requiredOption(
  '-ui, --user-id <userId>',
  '(required) provide an identifier for the keypair to be generated',
);
commandInitNode.requiredOption(
  '-pp, --private-passphrase <privatePassphrase>',
  '(required) provide the passphrase to the private key',
);
commandInitNode.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(
      nodePath,
      pkLogger,
      options.background,
      true,
      false,
    );

    const request = new agentPB.NewKeyPairMessage();
    request.setUserid(options.userId);
    request.setPassphrase(options.privatePassphrase);
    await promisifyGrpc(client.initializeNode.bind(client))(request);

    pkLogger.logV2(
      `node was successfully initialized at: '${nodePath}'`,
      PKMessageType.SUCCESS,
    );
  }, false),
);

const commandUnlockNode = new commander.Command('unlock');
commandUnlockNode.description('unlock polykey');
commandUnlockNode.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandUnlockNode.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandUnlockNode.requiredOption(
  '-pp, --private-passphrase <privatePassphrase>',
  '(required) provide the passphrase to the private key',
);
commandUnlockNode.option(
  '-t, --timeout <timeout>',
  'minutes of inactivity after which keynode is locked again, defaults to 15 minutes. setting to 0 will set no timeout',
  '15',
);
commandUnlockNode.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);
    const request = new agentPB.UnlockNodeMessage();
    request.setPassphrase(options.privatePassphrase!);
    request.setTimeout(options.timeout!);


    await promisifyGrpc(client.unlockNode.bind(client))(request);
    if (options.timeout == 0) {
      pkLogger.logV2(
        `polykey is unlocked indefinitely at: '${nodePath}'`,
        PKMessageType.SUCCESS,
      );
    } else {
      pkLogger.logV2(
        `polykey is unlocked for ${options.timeout} minute(s) at: '${nodePath}'`,
        PKMessageType.SUCCESS,
      );
    }
  }),
);

const commandLockNode = new commander.Command('lock');
commandLockNode.description('lock polykey');
commandLockNode.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandLockNode.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandLockNode.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);
    await promisifyGrpc(client.lockNode.bind(client))(
      new agentPB.EmptyMessage(),
    );
    pkLogger.logV2(
      `polykey is now locked at: '${nodePath}'`,
      PKMessageType.SUCCESS,
    );
  }),
);

const commandAgent = new commander.Command('agent');
commandAgent.description('control the polykey agent');
commandAgent.addCommand(commandAgentStatus);
commandAgent.addCommand(commandStartAgent);
commandAgent.addCommand(commandRestartAgent);
commandAgent.addCommand(commandStopAgent);
commandAgent.addCommand(commandInitNode);
commandAgent.addCommand(commandLockNode);
commandAgent.addCommand(commandUnlockNode);

export default commandAgent;
