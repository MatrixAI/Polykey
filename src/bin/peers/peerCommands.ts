import fs from 'fs';
import commander, { action } from 'commander';
import { PeerInfo } from '../../Polykey';
import * as pb from '../../../proto/compiled/Agent_pb';
import { actionRunner, getPKLogger, PKMessageType, determineNodePath, getAgentClient, promisifyGrpc } from '../utils';

function makeAddPeerCommand() {
  return new commander.Command('add')
    .description('add a new peer to the store')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option('-v, --verbosity, <verbosity>', 'set the verbosity level, can choose from levels 1, 2 or 3', str => parseInt(str), 1)
    .option('-b64, --base64 <base64>', 'decode the peer info from a base64 string')
    .option('-pk, --public-key <publicKey>', 'path to the file which contains the public key')
    .option('-rc, --root-certificate <rootCertificate>', 'path to the file which contains the peer root certificate')
    .option('-pa, --peer-address <peerAddress>', 'address on which the node can be contacted')
    .option('-aa, --api-address <apiAddress>', 'address on which the HTTP API is served')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity)
        const client = await getAgentClient(nodePath, undefined, undefined, undefined, pkLogger);

        const base64String = options?.base64?.replace('\r', '')?.replace('\n', '');

        const request = new pb.PeerInfoMessage();
        if (base64String != undefined) {
          // read in peer info string
          const { publicKey, rootCertificate, peerAddress, apiAddress } = PeerInfo.parseB64(base64String);
          request.setPublicKey(publicKey);
          request.setRootCertificate(rootCertificate);
          if (peerAddress) {
            request.setPeerAddress(peerAddress?.toString());
          }
          if (apiAddress) {
            request.setApiAddress(apiAddress?.toString());
          }
        } else {
          // read in publicKey if it exists
          const publicKey = fs.readFileSync(options.publicKey).toString();
          const rootCertificate = fs.readFileSync(options.rootCertificate).toString();

          request.setPublicKey(publicKey);
          request.setRootCertificate(rootCertificate);
          request.setPeerAddress(options.peerAddress);
          request.setApiAddress(options.apiAddress);
        }

        const res = (await promisifyGrpc(client.addPeer.bind(client))(request)) as pb.StringMessage;

        pkLogger.logV2(`peer id of '${res.getS()}' successfully added to peer store`, PKMessageType.SUCCESS);
      }),
    );
}

function makeAddAliasCommand() {
  return new commander.Command('alias')
    .description('set/unset an alias for an existing peer')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option('-v, --verbosity, <verbosity>', 'set the verbosity level, can choose from levels 1, 2 or 3', str => parseInt(str), 1)
    .requiredOption('-pi, --peer-id <peerId>', '(required) id of the peer for which an alias is to be set')
    .option('-a, --alias <alias>', 'new alias for the target peer')
    .option('-u, --unset', 'new alias for the target peer')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity)
        const client = await getAgentClient(nodePath, undefined, undefined, undefined, pkLogger);

        if (options.unset) {
          const request = new pb.StringMessage();
          request.setS(options.peerId!)

          await promisifyGrpc(client.unsetAlias.bind(client))(request)

          pkLogger.logV2(`peer alias has successfully been unset`, PKMessageType.SUCCESS);
        } else {
          const request = new pb.PeerAliasMessage();
          request.setPeerId(options.peerId!)
          request.setAlias(options.alias!)

          await promisifyGrpc(client.setAlias.bind(client))(request)

          pkLogger.logV2(`peer alias has successfully been set`, PKMessageType.SUCCESS);
        }
      }),
    );
}

function makeFindPeerCommand() {
  return new commander.Command('find')
    .description('find a peer')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option('-v, --verbosity, <verbosity>', 'set the verbosity level, can choose from levels 1, 2 or 3', str => parseInt(str), 1)
    .requiredOption('-pi, --peer-id <peerId>', '(required) id string of the peer to be pinged')
    .option('-t, --timeout <timeout>', 'timeout of the request in milliseconds')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity)
        const client = await getAgentClient(nodePath, undefined, undefined, undefined, pkLogger);

        const request = new pb.ContactPeerMessage();
        request.setPublicKeyOrHandle(options.peerId);
        if (options.timeout) {
          request.setTimeout(options.timeout);
        }
        await promisifyGrpc(client.findPeer.bind(client))(request)

        pkLogger.logV1('peer successfully found', PKMessageType.SUCCESS);
      }),
    );
}

function makeGetPeerInfoCommand() {
  return new commander.Command('get')
    .description('get the peer info for a particular peer')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option('-v, --verbosity, <verbosity>', 'set the verbosity level, can choose from levels 1, 2 or 3', str => parseInt(str), 1)
    .option('-b64, --base64', 'output peer info as a base64 string')
    .option('-cn, --current-node', 'only list the peer information for the current node, useful for sharing')
    .option('-pi, --peer-id <peerId>', 'unique hash of public key that identifies the peer')
    .option('-a, --alias <alias>', 'alias of target peer')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity)
        const client = await getAgentClient(nodePath, undefined, undefined, undefined, pkLogger);

        let res: pb.PeerInfoMessage;
        if (options.currentNode) {
          res = (await promisifyGrpc(client.getLocalPeerInfo.bind(client))(
            new pb.EmptyMessage(),
          )) as pb.PeerInfoMessage;
        } else if (options.alias) {
          // TODO: add in alias
        } else {
          const request = new pb.StringMessage();
          request.setS(options.peerId ?? options.alias);
          res = (await promisifyGrpc(client.getPeerInfo.bind(client))(request)) as pb.PeerInfoMessage;
        }
        const peerInfo = new PeerInfo(
          res.getPublicKey(),
          res.getRootCertificate(),
          res.getPeerAddress(),
          res.getApiAddress(),
        );

        if (<boolean>options.base64) {
          pkLogger.logV1(peerInfo.toStringB64(), PKMessageType.SUCCESS);
        } else {
          pkLogger.logV1('Peer Id:', PKMessageType.INFO);
          pkLogger.logV1(peerInfo.id, PKMessageType.SUCCESS);

          pkLogger.logV1('Peer Public Key:', PKMessageType.INFO);
          pkLogger.logV1(peerInfo.publicKey, PKMessageType.SUCCESS);

          pkLogger.logV1('Peer Root Certificate:', PKMessageType.INFO);
          pkLogger.logV1(peerInfo.rootCertificate, PKMessageType.SUCCESS);

          pkLogger.logV1('Peer Address:', PKMessageType.INFO);
          pkLogger.logV1(peerInfo.peerAddress?.toString() ?? '', PKMessageType.SUCCESS);

          pkLogger.logV1('API Address:', PKMessageType.INFO);
          pkLogger.logV1(peerInfo.apiAddress?.toString() ?? '', PKMessageType.SUCCESS);
        }
      }),
    );
}

function makeListPeersCommand() {
  return new commander.Command('list')
    .description('list all connected peers')
    .alias('ls')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option('-v, --verbosity, <verbosity>', 'set the verbosity level, can choose from levels 1, 2 or 3', str => parseInt(str), 1)
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity)
        const client = await getAgentClient(nodePath, undefined, undefined, undefined, pkLogger);

        const res = (await promisifyGrpc(client.listPeers.bind(client))(new pb.EmptyMessage())) as pb.StringListMessage;
        const peerIds = res.getSList();

        if (peerIds === undefined || peerIds.length == 0) {
          pkLogger.logV2('no peers exist', PKMessageType.INFO);
        } else {
          peerIds.forEach((peerId: string, index: number) => {
            pkLogger.logV1(`${index + 1}: ${peerId}`, PKMessageType.SUCCESS);
          });
        }
      }),
    );
}

function makePingPeerCommand() {
  return new commander.Command('ping')
    .description('ping a connected peer')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option('-v, --verbosity, <verbosity>', 'set the verbosity level, can choose from levels 1, 2 or 3', str => parseInt(str), 1)
    .requiredOption('-pi, --peer-id <peerId>', '(required) id string of the peer to be pinged')
    .option('-t, --timeout <timeout>', 'timeout of the request in milliseconds')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity)
        const client = await getAgentClient(nodePath, undefined, undefined, undefined, pkLogger);

        const request = new pb.ContactPeerMessage();
        request.setPublicKeyOrHandle(options.peerId);
        if (options.timeout) {
          request.setTimeout(options.timeout)
        }
        await promisifyGrpc(client.pingPeer.bind(client))(request)
        pkLogger.logV1('peer successfully pinged', PKMessageType.SUCCESS);
      }),
    );
}

function makeStealthCommand() {
  // create active command
  const activeStealthCommand = new commander.Command('active')
    .command('active')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option('-v, --verbosity, <verbosity>', 'set the verbosity level, can choose from levels 1, 2 or 3', str => parseInt(str), 1)
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity)
        const client = await getAgentClient(nodePath, undefined, undefined, undefined, pkLogger);

        const request = new pb.BooleanMessage();
        request.setB(true);
        await promisifyGrpc(client.toggleStealthMode.bind(client))(request)

        pkLogger.logV2(`stealth mode toggled to 'active'`, PKMessageType.SUCCESS);
      }),
    );

  // add inactive command
  const inactiveStealthCommand = new commander.Command('inactive')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option('-v, --verbosity, <verbosity>', 'set the verbosity level, can choose from levels 1, 2 or 3', str => parseInt(str), 1)
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity)
        const client = await getAgentClient(nodePath, undefined, undefined, undefined, pkLogger);

        const request = new pb.BooleanMessage();
        request.setB(false);
        await promisifyGrpc(client.toggleStealthMode.bind(client))(request)

        pkLogger.logV2(`stealth mode toggled to 'inactive'`, PKMessageType.SUCCESS);
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
    .description('update the peer info for a particular peer')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option('-v, --verbosity, <verbosity>', 'set the verbosity level, can choose from levels 1, 2 or 3', str => parseInt(str), 1)
    .option('-cn, --current-node', 'only list the peer information for the current node, useful for sharing')
    .option('-b64, --base64 <base64>', 'decode the peer info from a base64 string')
    .option('-pi, --peer-id <peerId>', 'the id of the peer to be updated')
    .option('-rc, --root-certificate <rootCertificate>', 'path to the file which contains the peer root certificate')
    .option('-pa, --peer-address <peerAddress>', 'update the peer address')
    .option('-aa, --api-address <apiAddress>', 'update the api address')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity)
        const client = await getAgentClient(nodePath, undefined, undefined, undefined, pkLogger);

        const request = new pb.PeerInfoMessage();

        const base64String = options?.base64?.replace('\r', '')?.replace('\n', '');
        if (base64String != undefined) {
          // read in peer info string
          const { publicKey, rootCertificate, peerAddress, apiAddress } = PeerInfo.parseB64(base64String);
          request.setPublicKey(PeerInfo.publicKeyToId(publicKey));
          request.setRootCertificate(rootCertificate);
          if (peerAddress) {
            request.setPeerAddress(peerAddress?.toString());
          }
          if (apiAddress) {
            request.setApiAddress(apiAddress?.toString());
          }
        } else {
          if (!options.peerId) {
            throw Error('must specify peer id')
          }
          request.setPublicKey(options.peerId);
          request.setRootCertificate(options.rootCertificate);
          if (options.peerAddress) {
            request.setPeerAddress(options.peerAddress);
          }
          if (options.apiAddress) {
            request.setApiAddress(options.apiAddress);
          }
        }

        if (options.currentNode) {
          await promisifyGrpc(client.updateLocalPeerInfo.bind(client))(request)
        } else {
          await promisifyGrpc(client.updatePeerInfo.bind(client))(request)
        }

        pkLogger.logV2('peer info was successfully updated', PKMessageType.SUCCESS);
      }),
    );
}

export {
  makeAddPeerCommand,
  makeAddAliasCommand,
  makeFindPeerCommand,
  makeGetPeerInfoCommand,
  makeListPeersCommand,
  makePingPeerCommand,
  makeStealthCommand,
  makeUpdatePeerInfoCommand,
};
