import fs from 'fs';
import commander from 'commander';
import { PolykeyAgent } from '../../Polykey';
import { actionRunner, pkLogger, PKMessageType, determineNodePath } from '../utils';
import { agentInterface } from '../../../proto/js/Agent';

function makeStartAgentCommand() {
  return new commander.Command('start')
    .description('start the agent')
    .option('-d, --daemon', 'start the agent as a daemon process')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        // Tell agent to stop
        const status = await client.getAgentStatus();
        if (status == agentInterface.AgentStatusType.ONLINE) {
          pkLogger('agent is already running', PKMessageType.INFO);
        } else {
          const pid = await PolykeyAgent.startAgent(options.daemon);
          pkLogger(`agent has started with pid of ${pid}`, PKMessageType.SUCCESS);
        }
      }),
    );
}

function makeRestartAgentCommand() {
  return new commander.Command('restart')
    .description('restart the agent')
    .option('-d, --daemon', 'start the agent as a daemon process')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        // Tell agent to stop
        client.stopAgent();
        const pid = await PolykeyAgent.startAgent(options.daemon);
        pkLogger(`agent has restarted with pid of ${pid}`, PKMessageType.SUCCESS);
      }),
    );
}

function makeAgentStatusCommand() {
  return new commander.Command('status').description('retrieve the status of the agent').action(
    actionRunner(async (options) => {
      const client = PolykeyAgent.connectToAgent();
      const status = await client.getAgentStatus();
      pkLogger(`agent status is: '${agentInterface.AgentStatusType[status].toLowerCase()}'`, PKMessageType.INFO);
    }),
  );
}

function makeStopAgentCommand() {
  return new commander.Command('stop')
    .description('stop the agent')
    .option('-f, --force', 'forcibly stop the agent')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status == agentInterface.AgentStatusType.OFFLINE) {
          pkLogger('agent is already stopped', PKMessageType.INFO);
        } else {
          // Tell agent to stop
          await client.stopAgent();
          if (options.force ? true : false) {
            fs.unlinkSync(PolykeyAgent.SocketPath);
          }
          const status = await client.getAgentStatus();
          if (status != agentInterface.AgentStatusType.ONLINE) {
            pkLogger('agent has successfully stopped', PKMessageType.SUCCESS);
          } else {
            throw Error('agent failed to stop');
          }
        }
      }),
    );
}

function makeListNodesCommand() {
  return new commander.Command('list')
    .alias('ls')
    .description('list all the nodes controlled by the node')
    .option('-u, --unlocked-only, only list the nodes that are unlocked')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        const nodes = await client.listNodes(options.unlockedOnly ? true : false);
        if (nodes.length == 0) {
          pkLogger('no nodes were listed', PKMessageType.INFO);
        } else {
          for (const node of nodes) {
            pkLogger(node, PKMessageType.INFO);
          }
        }
      }),
    );
}

function makeNewNodeCommand() {
  return new commander.Command('create')
    .description('create a new polykey node')
    .option('-k, --node-path <nodePath>', 'provide the polykey path. defaults to ~/.polykey')
    .requiredOption('-ui, --user-id <userId>', 'provide an identifier for the keypair to be generated')
    .requiredOption('-pp, --private-passphrase <privatePassphrase>', 'provide the passphrase to the private key')
    .option('-nb, --number-of-bits <numberOfBits>', 'number of bits to use for key pair generation')
    .option('-v, --verbose', 'increase verbosity by one level')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        const nodePath = determineNodePath(options.nodePath);
        const successful = await client.newNode(
          determineNodePath(options.nodePath),
          options.userId,
          options.privatePassphrase,
          parseInt(options.numberOfBits),
        );

        if (successful) {
          pkLogger(`node was successfully generated at: '${nodePath}'`, PKMessageType.SUCCESS);
        } else {
          throw Error('something went wrong with node creation');
        }
      }),
    );
}

function makeLoadNodeCommand() {
  return new commander.Command('load')
    .description('load an existing polykey node')
    .option('-k, --node-path <nodePath>', 'provide the polykey path. defaults to ~/.polykey')
    .requiredOption('-pp, --private-passphrase <privatePassphrase>', 'provide the passphrase to the private key')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        const nodePath = determineNodePath(options.nodePath);
        const successful = await client.registerNode(nodePath, options.privatePassphrase);

        if (successful) {
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
    .addCommand(makeListNodesCommand())
    .addCommand(makeNewNodeCommand())
    .addCommand(makeLoadNodeCommand());
}

export default makeAgentCommand;
