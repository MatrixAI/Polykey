import commander from 'commander';
import { PolykeyAgent } from '../../Polykey';
import * as pb from '../../../proto/compiled/Agent_pb';
import { actionRunner, getPKLogger, PKMessageType, determineNodePath, promisifyGrpc, getAgentClient } from '../utils';

function makeStartAgentCommand() {
  return new commander.Command('start')
    .description('start the agent')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option('-v, --verbosity, <verbosity>', 'set the verbosity level, can choose from levels 1, 2 or 3', str => parseInt(str), 1)
    .option('-d, --daemon', 'start the agent as a daemon process')
    .option('-pp, --private-passphrase <privatePassphrase>', 'provide the passphrase to the private key')
    .option('-t, --timeout <timeout>', 'minutes of inactivity after which keynode is locked again, defaults to 15 minutes. setting to 0 will set no timeout', '15')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity)
        try {
          const client = PolykeyAgent.connectToAgent(nodePath);

          const res = (await promisifyGrpc(client.getStatus.bind(client))(
            new pb.EmptyMessage(),
          )) as pb.AgentStatusMessage;
          if (res.getStatus() == pb.AgentStatusType.ONLINE) {
            pkLogger.logV2(`agent is already running`, PKMessageType.INFO);
          } else {
            throw Error(`agent is not running`);
          }
        } catch (error) {
          const pid = await PolykeyAgent.startAgent(nodePath, options.daemon);
          const client = PolykeyAgent.connectToAgent(nodePath);
          const res = (await promisifyGrpc(client.getStatus.bind(client))(
            new pb.EmptyMessage(),
          )) as pb.AgentStatusMessage;
          if (res.getStatus() == pb.AgentStatusType.ONLINE) {
            pkLogger.logV2(`agent has started with a pid of ${pid}`, PKMessageType.SUCCESS);
          } else {
            throw Error('agent could not be started')
          }
          // unlock if passphrase was provided
          if (options.privatePassphrase) {
            const request = new pb.UnlockNodeMessage();
            request.setPassphrase(options.privatePassphrase!);
            request.setTimeout(options.timeout!);
            await promisifyGrpc(client.unlockNode.bind(client))(request)
            if (options.timeout == 0) {
              pkLogger.logV2(`polykey is unlocked indefinitely at: '${nodePath}'`, PKMessageType.SUCCESS);
            } else {
              pkLogger.logV2(`polykey is unlocked for ${options.timeout} minute(s) at: '${nodePath}'`, PKMessageType.SUCCESS);
            }
          }
        }
      }),
    );
}

function makeRestartAgentCommand() {
  return new commander.Command('restart')
    .description('restart the agent')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option('-v, --verbosity, <verbosity>', 'set the verbosity level, can choose from levels 1, 2 or 3', str => parseInt(str), 1)
    .option('-d, --daemon', 'start the agent as a daemon process')
    .option('-pp, --private-passphrase <privatePassphrase>', 'provide the passphrase to the private key')
    .option('-t, --timeout <timeout>', 'minutes of inactivity after which keynode is locked again, defaults to 15 minutes. setting to 0 will set no timeout', '15')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity)
        let client = await getAgentClient(nodePath, options.daemon, false, false, pkLogger);
        // Tell agent to stop
        await promisifyGrpc(client.stopAgent.bind(client))(new pb.EmptyMessage());
        const pid = await PolykeyAgent.startAgent(nodePath, options.daemon);
        pkLogger.logV2(`agent has restarted with pid of ${pid}`, PKMessageType.SUCCESS);
        // unlock if passphrase was provided
        if (options.privatePassphrase) {
          client = await getAgentClient(nodePath, undefined, undefined, undefined, pkLogger);
          const request = new pb.UnlockNodeMessage();
          request.setPassphrase(options.privatePassphrase!);
          request.setTimeout(options.timeout!);
          await promisifyGrpc(client.unlockNode.bind(client))(request)
          if (options.timeout == 0) {
            pkLogger.logV2(`polykey is unlocked indefinitely at: '${nodePath}'`, PKMessageType.SUCCESS);
          } else {
            pkLogger.logV2(`polykey is unlocked for ${options.timeout} minute(s) at: '${nodePath}'`, PKMessageType.SUCCESS);
          }
        }
      }),
    );
}

function makeAgentStatusCommand() {
  return new commander.Command('status')
    .description('retrieve the status of the agent')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option('-v, --verbosity, <verbosity>', 'set the verbosity level, can choose from levels 1, 2 or 3', str => parseInt(str), 1)
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity)
        try {
          const client = await getAgentClient(nodePath, undefined, false, undefined, pkLogger);
          const res = (await promisifyGrpc(client.getStatus.bind(client))(
            new pb.EmptyMessage(),
          )) as pb.AgentStatusMessage;

          const status = res.getStatus();
          const statusString = Object.keys(pb.AgentStatusType).find((k) => pb.AgentStatusType[k] === status);
          pkLogger.logV1(`agent status is: '${statusString?.toLowerCase()}'`, PKMessageType.INFO);
        } catch (error) {
          pkLogger.logV1(`agent status is: 'offline'`, PKMessageType.INFO);
        }
      }),
    );
}

function makeStopAgentCommand() {
  return new commander.Command('stop')
    .description('stop the agent')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option('-v, --verbosity, <verbosity>', 'set the verbosity level, can choose from levels 1, 2 or 3', str => parseInt(str), 1)
    .option('-f, --force', 'forcibly stop the agent')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity)
        try {
          const client = await getAgentClient(nodePath, undefined, false, undefined, pkLogger);

          // see if agent returns with online status
          const res = (await promisifyGrpc(client.getStatus.bind(client))(
            new pb.EmptyMessage(),
          )) as pb.AgentStatusMessage;
          if (res.getStatus() == pb.AgentStatusType.ONLINE) {
            // Tell agent to stop
            await promisifyGrpc(client.stopAgent.bind(client))(new pb.EmptyMessage());
            pkLogger.logV2('agent has successfully stopped', PKMessageType.SUCCESS);
          } else {
            throw Error('agent failed to stop');
          }
        } catch (error) {
          pkLogger.logV2('agent is already stopped', PKMessageType.INFO);
        }
      }),
    );
}

function makeInitNodeCommand() {
  return new commander.Command('init')
    .description('initialize a new polykey node')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option('-v, --verbosity, <verbosity>', 'set the verbosity level, can choose from levels 1, 2 or 3', str => parseInt(str), 1)
    .requiredOption('-ui, --user-id <userId>', '(required) provide an identifier for the keypair to be generated')
    .requiredOption('-pp, --private-passphrase <privatePassphrase>', '(required) provide the passphrase to the private key')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity)
        const client = await getAgentClient(nodePath, undefined, true, false, pkLogger);

        const request = new pb.NewKeyPairMessage();
        request.setUserid(options.userId);
        request.setPassphrase(options.privatePassphrase);
        await promisifyGrpc(client.initializeNode.bind(client))(request)

        pkLogger.logV2(`node was successfully initialized at: '${nodePath}'`, PKMessageType.SUCCESS);
      }),
    );
}

function makeUnlockNodeCommand() {
  return new commander.Command('unlock')
    .description('unlock polykey')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option('-v, --verbosity, <verbosity>', 'set the verbosity level, can choose from levels 1, 2 or 3', str => parseInt(str), 1)
    .requiredOption('-pp, --private-passphrase <privatePassphrase>', '(required) provide the passphrase to the private key')
    .option('-t, --timeout <timeout>', 'minutes of inactivity after which keynode is locked again, defaults to 15 minutes. setting to 0 will set no timeout', '15')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity)
        const client = await getAgentClient(nodePath, undefined, undefined, undefined, pkLogger);
        const request = new pb.UnlockNodeMessage();
        request.setPassphrase(options.privatePassphrase!);
        request.setTimeout(options.timeout!);
        await promisifyGrpc(client.unlockNode.bind(client))(request)
        if (options.timeout == 0) {
          pkLogger.logV2(`polykey is unlocked indefinitely at: '${nodePath}'`, PKMessageType.SUCCESS);
        } else {
          pkLogger.logV2(`polykey is unlocked for ${options.timeout} minute(s) at: '${nodePath}'`, PKMessageType.SUCCESS);
        }
      }),
    );
}

function makeLockNodeCommand() {
  return new commander.Command('lock')
    .description('lock polykey')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option('-v, --verbosity, <verbosity>', 'set the verbosity level, can choose from levels 1, 2 or 3', str => parseInt(str), 1)
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity)
        const client = await getAgentClient(nodePath, undefined, undefined, undefined, pkLogger);
        await promisifyGrpc(client.lockNode.bind(client))(new pb.EmptyMessage)
        pkLogger.logV2(`polykey is now locked at: '${nodePath}'`, PKMessageType.SUCCESS);
      }),
    );
}

function makeAgentCommand() {
  return new commander.Command('agent')
    .description('control the polykey agent')
    .addCommand(makeStartAgentCommand())
    .addCommand(makeRestartAgentCommand())
    .addCommand(makeAgentStatusCommand())
    .addCommand(makeStopAgentCommand())
    .addCommand(makeInitNodeCommand())
    .addCommand(makeLockNodeCommand())
    .addCommand(makeUnlockNodeCommand());
}

export default makeAgentCommand;
