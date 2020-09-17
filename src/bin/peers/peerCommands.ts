import fs from 'fs';
import commander from 'commander';
import { PolykeyAgent, PeerInfo } from '../../Polykey';
import { actionRunner, pkLogger, PKMessageType, determineNodePath } from '../utils';
import { agentInterface } from '../../../proto/js/Agent';

function makeAddPeerCommand() {
  return new commander.Command('add')
    .description('add a new peer to the store')
    .option('-b64, --base64 <base64>', 'decode the peer info from a base64 string')
    .option('-pk, --public-key <publicKey>', 'path to the file which contains the public key')
    .option('-pa, --peer-address <peerAddress>', 'public address on which the node can be contacted')
    .option('-rk, --relay-key <relayKey>', 'path to the file which contains the public key of the relay peer')
    .option('--node-path <nodePath>', 'node path')
    .option('-v, --verbose', 'increase verbosity level by one')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status != agentInterface.AgentStatusType.ONLINE) {
          throw Error(`agent status is: '${agentInterface.AgentStatusType[status].toLowerCase()}'`);
        }

        const nodePath = determineNodePath(options.nodePath);
        const base64String = options?.base64?.replace('\r', '')?.replace('\n', '');

        let successful: boolean;
        if (base64String != undefined) {
          // read in peer info string
          const { publicKey, peerAddress, relayPublicKey } = PeerInfo.parseB64(base64String);
          successful = await client.addPeer(nodePath, publicKey, peerAddress?.toString() ?? '', relayPublicKey);
        } else {
          // read in publicKey if it exists
          const publicKey = fs.readFileSync(options.publicKey).toString();

          const relayPublicKey = fs.readFileSync(options.relayKey).toString();

          successful = await client.addPeer(nodePath, publicKey, options.peerAddress, relayPublicKey);
        }

        if (successful) {
          pkLogger('peer successfully added to peer store', PKMessageType.SUCCESS);
        } else {
          pkLogger('something went wrong, peer was not added to peer store', PKMessageType.WARNING);
        }
      }),
    );
}

function makeFindPeerCommand() {
  return new commander.Command('find')
    .description('find a peer based on a public key')
    .option('--node-path <nodePath>', 'node path')
    .requiredOption('-pk, --public-key <publicKey>', 'path to the file which contains the public key')
    .option('-v, --verbose', 'increase verbosity level by one')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status != agentInterface.AgentStatusType.ONLINE) {
          throw Error(`agent status is: '${agentInterface.AgentStatusType[status].toLowerCase()}'`);
        }

        const nodePath = determineNodePath(options.nodePath);
        // read in publicKey if it exists
        const publicKey = fs.readFileSync(options.publicKey).toString();

        const successful = await client.findPeer(nodePath, publicKey);

        if (successful) {
          pkLogger('peer successfully pinged', PKMessageType.SUCCESS);
        } else {
          pkLogger('ping timed out', PKMessageType.WARNING);
        }
      }),
    );
}

function makeGetPeerInfoCommand() {
  return new commander.Command('get')
    .description('get the peer info for a particular public key')
    .option('--node-path <nodePath>', 'node path')
    .option('-b64, --base64', 'output peer info as a base64 string')
    .option('-cn, --current-node', 'only list the peer information for the current node, useful for sharing')
    .option('-pk, --public-key <publicKey>', 'path to the file which contains the public key')
    .option('-v, --verbose', 'increase verbosity level by one')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status != agentInterface.AgentStatusType.ONLINE) {
          throw Error(`agent status is: '${agentInterface.AgentStatusType[status].toLowerCase()}'`);
        }

        const nodePath = determineNodePath(options.nodePath);
        const publicKeyPath = options.publicKey;
        // read in publicKey if it exists
        let publicKey: string | undefined;
        if (publicKeyPath) {
          publicKey = fs.readFileSync(publicKeyPath).toString();
        }

        const peerInfo: PeerInfo = await client.getPeerInfo(nodePath, <boolean>options.currentNode, publicKey);

        if (<boolean>options.base64) {
          pkLogger(peerInfo.toStringB64(), PKMessageType.SUCCESS);
        } else {
          pkLogger('Peer Public Key:', PKMessageType.INFO);
          pkLogger(peerInfo.publicKey, PKMessageType.SUCCESS);

          pkLogger('Peer Address:', PKMessageType.INFO);
          pkLogger(peerInfo.peerAddress?.toString() ?? '', PKMessageType.SUCCESS);

          pkLogger('Relay Public Key:', PKMessageType.INFO);
          pkLogger(peerInfo.relayPublicKey ?? '', PKMessageType.SUCCESS);
        }
      }),
    );
}

function makeListPeersCommand() {
  return new commander.Command('list')
    .description('list all connected peers')
    .alias('ls')
    .option('--node-path <nodePath>', 'node path')
    .option('-v, --verbose', 'increase verbosity level by one')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status != agentInterface.AgentStatusType.ONLINE) {
          throw Error(`agent status is: '${agentInterface.AgentStatusType[status].toLowerCase()}'`);
        }

        const nodePath = determineNodePath(options.nodePath);

        const publicKeys = await client.listPeers(nodePath);
        if (publicKeys === undefined || publicKeys.length == 0) {
          pkLogger('no peers exist', PKMessageType.INFO);
        } else {
          publicKeys.forEach((publicKey: string, index: number) => {
            pkLogger(`${index + 1}: ${publicKey}`, PKMessageType.INFO);
          });
        }
      }),
    );
}

function makePingPeerCommand() {
  return new commander.Command('ping')
    .description('ping a connected peer')
    .option('--node-path <nodePath>', 'node path')
    .requiredOption('-pk, --public-key <publicKey>', 'path to the file which contains the public key')
    .option('-v, --verbose', 'increase verbosity level by one')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status != agentInterface.AgentStatusType.ONLINE) {
          throw Error(`agent status is: '${agentInterface.AgentStatusType[status].toLowerCase()}'`);
        }

        const nodePath = determineNodePath(options.nodePath);
        // read in publicKey if it exists
        const publicKey = fs.readFileSync(options.publicKey).toString();

        const successful = await client.pingPeer(nodePath, publicKey);

        if (successful) {
          pkLogger('peer successfully pinged', PKMessageType.SUCCESS);
        } else {
          pkLogger('ping timed out', PKMessageType.WARNING);
        }
      }),
    );
}

function makeStealthCommand() {
  // create active command
  const activeStealthCommand = new commander.Command('active')
    .command('active')
    .option('--node-path <nodePath>', 'node path')
    .option('-v, --verbose', 'increase verbosity level by one')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status != agentInterface.AgentStatusType.ONLINE) {
          throw Error(`agent status is: '${agentInterface.AgentStatusType[status].toLowerCase()}'`);
        }

        const nodePath = determineNodePath(options.nodePath);

        await client.toggleStealth(nodePath, true);

        pkLogger(`stealth mode toggled to 'active'`, PKMessageType.SUCCESS);
      }),
    );

  // add inactive command
  const inactiveStealthCommand = new commander.Command('inactive')
    .option('--node-path <nodePath>', 'node path')
    .option('-v, --verbose', 'increase verbosity level by one')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status != agentInterface.AgentStatusType.ONLINE) {
          throw Error(`agent status is: '${agentInterface.AgentStatusType[status].toLowerCase()}'`);
        }

        const nodePath = determineNodePath(options.nodePath);

        await client.toggleStealth(nodePath, false);

        pkLogger(`stealth mode toggled to 'inactive'`, PKMessageType.SUCCESS);
      }),
    );

  const stealthCommand = new commander.Command('stealth')
    .description('toggle stealth mode on or off')
    .addCommand(activeStealthCommand)
    .addCommand(inactiveStealthCommand);

  return stealthCommand;
}

function makeUpdatePeerInfoCommand() {
  return new commander.Command('update')
    .description('update the peer info for a particular public key')
    .option('--node-path <nodePath>', 'node path')
    .option('-cn, --current-node', 'only list the peer information for the current node, useful for sharing')
    .option('-pk, --public-key <publicKey>', 'path to the file which contains the public key')
    .option('-b64, --base64 <base64>', 'decode the peer info from a base64 string')
    .option('-ch, --peer-host <peerHost>', 'update the peer addresss host')
    .option('-cp, --peer-port <peerPort>', 'update the peer addresss port')
    .option('-rk, --relay-key <relayKey>', 'path to the file which contains the public key of the relay peer')
    .option('-v, --verbose', 'increase verbosity level by one')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status != agentInterface.AgentStatusType.ONLINE) {
          throw Error(`agent status is: '${agentInterface.AgentStatusType[status].toLowerCase()}'`);
        }

        const nodePath = determineNodePath(options.nodePath);
        const currentNode: boolean = options.currentNode;

        const publicKeyPath = options.publicKey;
        // read in publicKey if it exists
        let publicKey: string | undefined = undefined;
        if (publicKeyPath) {
          publicKey = fs.readFileSync(publicKeyPath).toString();
        }

        const relayPublicKeyPath = options.relayKey;
        // read in relay publicKey if it exists
        let relayPublicKey: string | undefined = undefined;
        if (relayPublicKeyPath) {
          relayPublicKey = fs.readFileSync(relayPublicKeyPath).toString();
        }

        const base64String = options?.base64?.replace('\r', '')?.replace('\n', '');
        let successful: boolean;
        if (base64String != undefined) {
          // read in peer info string
          const { publicKey, peerAddress, relayPublicKey } = PeerInfo.parseB64(base64String);
          successful = await client.updatePeer(
            nodePath,
            currentNode ? undefined : publicKey,
            currentNode,
            peerAddress?.host,
            peerAddress?.port,
            relayPublicKey,
          );
        } else {
          successful = await client.updatePeer(
            nodePath,
            publicKey,
            currentNode,
            options.peerHost,
            options.peerPort,
            relayPublicKey,
          );
        }

        if (successful) {
          pkLogger('peer info was successfully updated', PKMessageType.SUCCESS);
        } else {
          pkLogger('something went wrong, peer info could not be updated', PKMessageType.WARNING);
        }
      }),
    );
}

export {
  makeAddPeerCommand,
  makeFindPeerCommand,
  makeGetPeerInfoCommand,
  makeListPeersCommand,
  makePingPeerCommand,
  makeStealthCommand,
  makeUpdatePeerInfoCommand,
};
