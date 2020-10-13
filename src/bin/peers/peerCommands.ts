import fs from 'fs';
import commander from 'commander';
import { PeerInfo } from '../../Polykey';
import * as pb from '../../../proto/compiled/Agent_pb';
import { actionRunner, pkLogger, PKMessageType, determineNodePath, getAgentClient, promisifyGrpc } from '../utils';

function makeAddPeerCommand() {
  return new commander.Command('add')
    .description('add a new peer to the store')
    .option('-b64, --base64 <base64>', 'decode the peer info from a base64 string')
    .option('-pk, --public-key <publicKey>', 'path to the file which contains the public key')
    .option('-rk, --relay-key <relayKey>', 'path to the file which contains the public key of the relay peer')
    .option('-pa, --peer-address <peerAddress>', 'address on which the node can be contacted')
    .option('-aa, --api-address <apiAddress>', 'address on which the HTTP API is served')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option('-v, --verbose', 'increase verbosity level by one')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const client = await getAgentClient(nodePath);

        const base64String = options?.base64?.replace('\r', '')?.replace('\n', '');

        const request = new pb.PeerInfoMessage();
        if (base64String != undefined) {
          // read in peer info string
          const { publicKey, peerAddress, relayPublicKey, apiAddress } = PeerInfo.parseB64(base64String);
          request.setPublicKey(publicKey);
          if (relayPublicKey) {
            request.setRelayPublicKey(relayPublicKey);
          }
          if (peerAddress) {
            request.setPeerAddress(peerAddress?.toString());
          }
          if (apiAddress) {
            request.setPeerAddress(apiAddress?.toString());
          }
        } else {
          // read in publicKey if it exists
          const publicKey = fs.readFileSync(options.publicKey).toString();
          const relayPublicKey = fs.readFileSync(options.relayKey).toString();

          request.setPublicKey(publicKey);
          request.setRelayPublicKey(relayPublicKey);
          request.setPeerAddress(options.peerAddress);
          request.setApiAddress(options.apiAddress);
        }

        const res = (await promisifyGrpc(client.addPeer.bind(client))(request)) as pb.BooleanMessage;

        if (res.getB()) {
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
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .requiredOption('-pk, --public-key <publicKey>', '(required) path to the file which contains the public key')
    .requiredOption('-t, --timeout <timeout>', '(required) timeout of the request in milliseconds')
    .option('-v, --verbose', 'increase verbosity level by one')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const client = await getAgentClient(nodePath);

        // read in publicKey if it exists
        const publicKey = fs.readFileSync(options.publicKey).toString();

        const request = new pb.ContactPeerMessage();
        request.setPublicKeyOrHandle(publicKey);
        request.setTimeout(options.timeout);
        const res = (await promisifyGrpc(client.findPeer.bind(client))(request)) as pb.BooleanMessage;

        if (res.getB()) {
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
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option('-b64, --base64', 'output peer info as a base64 string')
    .option('-cn, --current-node', 'only list the peer information for the current node, useful for sharing')
    .option('-pk, --public-key <publicKey>', 'path to the file which contains the public key')
    .option('-v, --verbose', 'increase verbosity level by one')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const client = await getAgentClient(nodePath);

        const publicKeyPath = options.publicKey;
        // read in publicKey if it exists
        let publicKey: string | undefined;
        if (publicKeyPath) {
          publicKey = fs.readFileSync(publicKeyPath).toString();
        }

        let res: pb.PeerInfoMessage;
        if (options.currentNode) {
          res = (await promisifyGrpc(client.getLocalPeerInfo.bind(client))(
            new pb.EmptyMessage(),
          )) as pb.PeerInfoMessage;
        } else {
          const request = new pb.StringMessage();
          request.setS(publicKey!);
          res = (await promisifyGrpc(client.getPeerInfo.bind(client))(request)) as pb.PeerInfoMessage;
        }
        const peerInfo = new PeerInfo(
          res.getPublicKey(),
          res.getRelayPublicKey(),
          res.getPeerAddress(),
          res.getApiAddress(),
        );

        if (<boolean>options.base64) {
          pkLogger(peerInfo.toStringB64(), PKMessageType.SUCCESS);
        } else {
          pkLogger('Peer Public Key:', PKMessageType.INFO);
          pkLogger(peerInfo.publicKey, PKMessageType.SUCCESS);

          pkLogger('Relay Public Key:', PKMessageType.INFO);
          pkLogger(peerInfo.relayPublicKey ?? '', PKMessageType.SUCCESS);

          pkLogger('Peer Address:', PKMessageType.INFO);
          pkLogger(peerInfo.peerAddress?.toString() ?? '', PKMessageType.SUCCESS);

          pkLogger('API Address:', PKMessageType.INFO);
          pkLogger(peerInfo.apiAddress?.toString() ?? '', PKMessageType.SUCCESS);
        }
      }),
    );
}

function makeListPeersCommand() {
  return new commander.Command('list')
    .description('list all connected peers')
    .alias('ls')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option('-v, --verbose', 'increase verbosity level by one')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const client = await getAgentClient(nodePath);

        const res = (await promisifyGrpc(client.listPeers.bind(client))(new pb.EmptyMessage())) as pb.StringListMessage;
        const publicKeys = res.getSList();

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
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .requiredOption('-pk, --public-key <publicKey>', '(required) path to the file which contains the public key')
    .option('-v, --verbose', 'increase verbosity level by one')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const client = await getAgentClient(nodePath);

        // read in publicKey if it exists
        const publicKey = fs.readFileSync(options.publicKey).toString();

        const request = new pb.ContactPeerMessage();
        request.setPublicKeyOrHandle(publicKey);
        const res = (await promisifyGrpc(client.pingPeer.bind(client))(request)) as pb.BooleanMessage;

        if (res.getB()) {
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
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option('-v, --verbose', 'increase verbosity level by one')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const client = await getAgentClient(nodePath);

        const request = new pb.BooleanMessage();
        request.setB(true);
        const res = (await promisifyGrpc(client.toggleStealthMode.bind(client))(request)) as pb.BooleanMessage;

        pkLogger(`stealth mode toggled to 'active'`, PKMessageType.SUCCESS);
      }),
    );

  // add inactive command
  const inactiveStealthCommand = new commander.Command('inactive')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option('-v, --verbose', 'increase verbosity level by one')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const client = await getAgentClient(nodePath);

        const request = new pb.BooleanMessage();
        request.setB(false);
        const res = (await promisifyGrpc(client.toggleStealthMode.bind(client))(request)) as pb.BooleanMessage;

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
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option('-cn, --current-node', 'only list the peer information for the current node, useful for sharing')
    .option('-b64, --base64 <base64>', 'decode the peer info from a base64 string')
    .option('-pk, --public-key <publicKey>', 'path to the file which contains the public key')
    .option('-rk, --relay-key <relayKey>', 'path to the file which contains the public key of the relay peer')
    .option('-pa, --peer-address <peerAddress>', 'update the peer address')
    .option('-aa, --api-address <apiAddress>', 'update the api address')
    .option('-v, --verbose', 'increase verbosity level by one')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const client = await getAgentClient(nodePath);

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

        const request = new pb.PeerInfoMessage();

        const base64String = options?.base64?.replace('\r', '')?.replace('\n', '');
        if (base64String != undefined) {
          // read in peer info string
          const { publicKey, relayPublicKey, peerAddress, apiAddress } = PeerInfo.parseB64(base64String);
          request.setPublicKey(publicKey);
          if (relayPublicKey) {
            request.setRelayPublicKey(relayPublicKey);
          }
          if (peerAddress) {
            request.setPeerAddress(peerAddress?.toString());
          }
          if (apiAddress) {
            request.setApiAddress(apiAddress?.toString());
          }
        } else {
          request.setPublicKey(options.publicKey!);
          if (options.relayPublicKey) {
            request.setRelayPublicKey(options.relayPublicKey);
          }
          if (options.peerAddress) {
            request.setPeerAddress(options.peerAddress);
          }
          if (options.apiAddress) {
            request.setApiAddress(options.apiAddress);
          }
        }

        let successful: boolean;
        if (options.currentNode) {
          const res = (await promisifyGrpc(client.updateLocalPeerInfo.bind(client))(request)) as pb.BooleanMessage;
          successful = res.getB();
        } else {
          const res = (await promisifyGrpc(client.updatePeerInfo.bind(client))(request)) as pb.BooleanMessage;
          successful = res.getB();
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
