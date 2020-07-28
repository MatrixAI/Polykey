import fs from 'fs';
import commander from 'commander';
import { PolykeyAgent } from '../lib/Polykey';
import { actionRunner, pkLogger, PKMessageType, determineNodePath } from '.';

function makeStartAgentCommand() {
  return new commander.Command('start')
    .description('start the agent')
    .option('-d, --daemon', 'start the agent as a daemon process')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        // Tell agent to stop
        const status = await client.getAgentStatus();
        if (status == 'online') {
          pkLogger('agent is already running', PKMessageType.INFO);
        } else {
          const daemon: boolean = options.daemon;
          const pid = await PolykeyAgent.startAgent(daemon);
          pkLogger(`agent has started with pid of ${pid}`, PKMessageType.SUCCESS);
        }
        process.exit();
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
        const daemon: boolean = options.daemon;
        const pid = await PolykeyAgent.startAgent(daemon);
        pkLogger(`agent has restarted with pid of ${pid}`, PKMessageType.SUCCESS);
        process.exit();
      }),
    );
}

function makeAgentStatusCommand() {
  return new commander.Command('status').description('retrieve the status of the agent').action(
    actionRunner(async (options) => {
      const client = PolykeyAgent.connectToAgent();
      const status = await client.getAgentStatus();
      pkLogger(`agent status is: '${status}'`, PKMessageType.INFO);
      process.exit();
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
        if (status == 'stopped') {
          pkLogger('agent is already stopped', PKMessageType.INFO);
        } else {
          const force = options.force ? true : false;
          // Tell agent to stop
          client.stopAgent();
          if (force) {
            fs.unlinkSync(PolykeyAgent.SocketPath);
          }
          const status = await client.getAgentStatus();
          if (status != 'online') {
            pkLogger('agent has successfully stopped', PKMessageType.SUCCESS);
          } else {
            throw Error('agent failed to stop');
          }
        }
        process.exit();
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
        const unlockedOnly = options.unlockedOnly ? true : false;
        const nodes = await client.listNodes(unlockedOnly);
        if (nodes.length == 0) {
          pkLogger('no nodes were listed', PKMessageType.INFO);
        } else {
          for (const node of nodes) {
            pkLogger(node, PKMessageType.INFO);
          }
        }
        process.exit();
      }),
    );
}

function makeNewNodeCommand() {
  return new commander.Command('create')
    .description('create a new polykey node')
    .option('-k, --node-path <nodePath>', 'provide the polykey path. defaults to ~/.polykey')
    .requiredOption('-n, --full-name <fullName>', 'provide your full name for key pair generation')
    .requiredOption('-e, --email <email>', 'provide a valid email address for key pair generation')
    .requiredOption('-p, --private-passphrase <privatePassphrase>', 'provide the passphrase to the private key')
    .option('-b, --number-of-bits <numberOfBits>', 'number of bits to use for key pair generation')
    .option('-v, --verbose', 'increase verbosity by one level')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        const nodePath = determineNodePath(options);
        const fullName = options.fullName;
        const email = options.email;
        const privatePassphrase = options.privatePassphrase;
        const numberOfBits = parseInt(options.numberOfBits);
        const successful = await client.newNode(nodePath, fullName, email, privatePassphrase, numberOfBits);

        if (successful) {
          pkLogger(`node was successfully generated at: '${nodePath}'`, PKMessageType.SUCCESS);
        } else {
          throw Error('something went wrong with node creation');
        }

        process.exit();
      }),
    );
}

function makeLoadNodeCommand() {
  return new commander.Command('load')
    .description('load an existing polykey node')
    .option('-k, --node-path <nodePath>', 'provide the polykey path. defaults to ~/.polykey')
    .requiredOption('-p, --private-passphrase <privatePassphrase>', 'provide the passphrase to the private key')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        const nodePath = determineNodePath(options);
        const privatePassphrase = options.privatePassphrase;
        const successful = await client.registerNode(nodePath, privatePassphrase);

        if (successful) {
          pkLogger(`node was successfully loaded at: '${nodePath}'`, PKMessageType.SUCCESS);
        } else {
          throw Error('something went wrong when loading node');
        }

        process.exit();
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
