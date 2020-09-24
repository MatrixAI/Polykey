import commander from 'commander';
import { PolykeyAgent } from '../../Polykey';
import * as pb from '../../../proto/compiled/Agent_pb';
import { actionRunner, pkLogger, PKMessageType, determineNodePath, promisifyGrpc, getAgentClient } from '../utils';

function makeStartAgentCommand() {
  return new commander.Command('start')
    .description('start the agent')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option('-d, --daemon', 'start the agent as a daemon process')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);

        try {
          const client = PolykeyAgent.connectToAgent(nodePath);

          const res = (await promisifyGrpc(client.getStatus.bind(client))(
            new pb.EmptyMessage(),
          )) as pb.AgentStatusMessage;
          if (res.getStatus() == pb.AgentStatusType.ONLINE) {
            pkLogger(`agent is already running`, PKMessageType.INFO);
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
            pkLogger(`agent has started with a pid of ${pid}`, PKMessageType.SUCCESS);
          } else {
            pkLogger(`agent could not be started`, PKMessageType.ERROR);
          }
        }
      }),
    );
}

function makeRestartAgentCommand() {
  return new commander.Command('restart')
    .description('restart the agent')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option('-d, --daemon', 'start the agent as a daemon process')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const client = await getAgentClient(nodePath, options.daemon, false, false);
        // Tell agent to stop
        await promisifyGrpc(client.stopAgent.bind(client))(new pb.EmptyMessage());
        const pid = await PolykeyAgent.startAgent(nodePath, options.daemon);
        pkLogger(`agent has restarted with pid of ${pid}`, PKMessageType.SUCCESS);
      }),
    );
}

function makeAgentStatusCommand() {
  return new commander.Command('status')
    .description('retrieve the status of the agent')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        try {
          const client = await getAgentClient(nodePath, undefined, false);
          const res = (await promisifyGrpc(client.getStatus.bind(client))(
            new pb.EmptyMessage(),
          )) as pb.AgentStatusMessage;

          const status = res.getStatus();
          const statusString = Object.keys(pb.AgentStatusType).find((k) => pb.AgentStatusType[k] === status);
          pkLogger(`agent status is: '${statusString?.toLowerCase()}'`, PKMessageType.INFO);
        } catch (error) {
          pkLogger(`agent status is: 'offline'`, PKMessageType.INFO);
        }
      }),
    );
}

function makeStopAgentCommand() {
  return new commander.Command('stop')
    .description('stop the agent')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option('-f, --force', 'forcibly stop the agent')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        try {
          const client = await getAgentClient(nodePath, undefined, false);

          // see if agent returns with online status
          const res = (await promisifyGrpc(client.getStatus.bind(client))(
            new pb.EmptyMessage(),
          )) as pb.AgentStatusMessage;
          if (res.getStatus() == pb.AgentStatusType.ONLINE) {
            // Tell agent to stop
            await promisifyGrpc(client.stopAgent.bind(client))(new pb.EmptyMessage());
            pkLogger('agent has successfully stopped', PKMessageType.SUCCESS);
          } else {
            throw Error('agent failed to stop');
          }
        } catch (error) {
          pkLogger('agent is already stopped', PKMessageType.INFO);
        }
      }),
    );
}

function makeInitNodeCommand() {
  return new commander.Command('init')
    .description('initialize a new polykey node')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .requiredOption('-ui, --user-id <userId>', '(required) provide an identifier for the keypair to be generated')
    .requiredOption('-pp, --private-passphrase <privatePassphrase>', '(required) provide the passphrase to the private key')
    .option('-nb, --number-of-bits <numberOfBits>', 'number of bits to use for key pair generation')
    .option('-v, --verbose', 'increase verbosity by one level')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);

        const client = await getAgentClient(nodePath, undefined, true, false);

        const request = new pb.NewNodeMessage();
        request.setUserid(options.userId);
        request.setPassphrase(options.privatePassphrase);
        if (options.numberOfBits) {
          request.setNbits(options.numberOfBits);
        }
        const res = (await promisifyGrpc(client.newNode.bind(client))(request)) as pb.BooleanMessage;

        pkLogger(`node was successfully initialized at: '${nodePath}'`, PKMessageType.SUCCESS);
      }),
    );
}

function makeUnlockNodeCommand() {
  return new commander.Command('unlock')
    .description('unlock polykey')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .requiredOption('-pp, --private-passphrase <privatePassphrase>', '(required) provide the passphrase to the private key')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const client = await getAgentClient(nodePath);
        const request = new pb.StringMessage();
        request.setS(options.privatePassphrase!);
        const res = (await promisifyGrpc(client.registerNode.bind(client))(request)) as pb.BooleanMessage;

        if (res.getB()) {
          pkLogger(`node was successfully loaded at: '${nodePath}'`, PKMessageType.SUCCESS);
        } else {
          throw Error('something went wrong when loading node');
        }
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
    .addCommand(makeUnlockNodeCommand());
}

export default makeAgentCommand;
