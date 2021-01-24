import fs from 'fs';
import commander from 'commander';
import { PeerInfo } from '../../Polykey';
import * as agentPB from '../../proto/js/Agent_pb';
import {
  actionRunner,
  getPKLogger,
  PKMessageType,
  resolveKeynodeStatePath,
  getAgentClient,
  promisifyGrpc,
} from '../utils';

const commandAddPeer = new commander.Command('add');
commandAddPeer.description('add a new peer to the store');
commandAddPeer.option('-k, --node-path <nodePath>', 'provide the polykey path');
commandAddPeer.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandAddPeer.option(
  '-b64, --base64 <base64>',
  'decode the peer info from a base64 string',
);
commandAddPeer.option(
  '-pk, --public-key <publicKey>',
  'path to the file which contains the public key',
);
commandAddPeer.option(
  '-rc, --root-certificate <rootCertificate>',
  'path to the file which contains the peer root certificate',
);
commandAddPeer.option(
  '-pa, --peer-address <peerAddress>',
  'address on which the node can be contacted',
);
commandAddPeer.option(
  '-aa, --api-address <apiAddress>',
  'address on which the HTTP API is served',
);
commandAddPeer.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const base64String = options?.base64?.replace('\r', '')?.replace('\n', '');

    const request = new agentPB.PeerInfoMessage();
    if (base64String != undefined) {
      // read in peer info string
      const {
        publicKey,
        rootCertificate,
        peerAddress,
        apiAddress,
      } = PeerInfo.parseB64(base64String);
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
      const rootCertificate = fs
        .readFileSync(options.rootCertificate)
        .toString();

      request.setPublicKey(publicKey);
      request.setRootCertificate(rootCertificate);
      request.setPeerAddress(options.peerAddress);
      request.setApiAddress(options.apiAddress);
    }

    const res = (await promisifyGrpc(client.addPeer.bind(client))(
      request,
    )) as agentPB.StringMessage;

    pkLogger.logV2(
      `peer id of '${res.getS()}' successfully added to peer store`,
      PKMessageType.SUCCESS,
    );
  }),
);

const commandAddAlias = new commander.Command('alias');
commandAddAlias.description('set/unset an alias for an existing peer');
commandAddAlias.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandAddAlias.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandAddAlias.requiredOption(
  '-pi, --peer-id <peerId>',
  '(required) id of the peer for which an alias is to be set',
);
commandAddAlias.option('-a, --alias <alias>', 'new alias for the target peer');
commandAddAlias.option('-u, --unset', 'new alias for the target peer');
commandAddAlias.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    if (options.unset) {
      const request = new agentPB.StringMessage();
      request.setS(options.peerId!);

      await promisifyGrpc(client.unsetAlias.bind(client))(request);

      pkLogger.logV2(
        `peer alias has successfully been unset`,
        PKMessageType.SUCCESS,
      );
    } else {
      const request = new agentPB.PeerAliasMessage();
      request.setPeerId(options.peerId!);
      request.setAlias(options.alias!);

      await promisifyGrpc(client.setAlias.bind(client))(request);

      pkLogger.logV2(
        `peer alias has successfully been set`,
        PKMessageType.SUCCESS,
      );
    }
  }),
);

const commandFindPeer = new commander.Command('find');
commandFindPeer.description('find a peer');
commandFindPeer.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandFindPeer.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandFindPeer.requiredOption(
  '-pi, --peer-id <peerId>',
  '(required) id string of the peer to be pinged',
);
commandFindPeer.option(
  '-t, --timeout <timeout>',
  'timeout of the request in milliseconds',
);
commandFindPeer.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const request = new agentPB.ContactPeerMessage();
    request.setPublicKeyOrHandle(options.peerId);
    if (options.timeout) {
      request.setTimeout(options.timeout);
    }
    await promisifyGrpc(client.findPeer.bind(client))(request);

    pkLogger.logV1('peer successfully found', PKMessageType.SUCCESS);
  }),
);

const commandGetPeerInfo = new commander.Command('get');
commandGetPeerInfo.description('get the peer info for a particular peer');
commandGetPeerInfo.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandGetPeerInfo.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandGetPeerInfo.option(
  '-b64, --base64',
  'output peer info as a base64 string',
);
commandGetPeerInfo.option(
  '-cn, --current-node',
  'only list the peer information for the current node, useful for sharing',
);
commandGetPeerInfo.option(
  '-pi, --peer-id <peerId>',
  'unique hash of public key that identifies the peer',
);
commandGetPeerInfo.option('-a, --alias <alias>', 'alias of target peer');
commandGetPeerInfo.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    let res: agentPB.PeerInfoMessage;
    if (options.currentNode) {
      res = (await promisifyGrpc(client.getLocalPeerInfo.bind(client))(
        new agentPB.EmptyMessage(),
      )) as agentPB.PeerInfoMessage;
    } else {
      const request = new agentPB.StringMessage();
      request.setS(options.peerId ?? options.alias);
      res = (await promisifyGrpc(client.getPeerInfo.bind(client))(
        request,
      )) as agentPB.PeerInfoMessage;
    }
    const peerInfo = new PeerInfo(
      res.getPublicKey(),
      res.getRootCertificate(),
      res.getPeerAddress(),
      res.getApiAddress(),
    );

    if (options.base64 as boolean) {
      pkLogger.logV1(peerInfo.toStringB64(), PKMessageType.SUCCESS);
    } else {
      pkLogger.logV1('Peer Id:', PKMessageType.INFO);
      pkLogger.logV1(peerInfo.id, PKMessageType.SUCCESS);

      pkLogger.logV1('Peer Public Key:', PKMessageType.INFO);
      pkLogger.logV1(peerInfo.publicKey, PKMessageType.SUCCESS);

      pkLogger.logV1('Peer Root Certificate:', PKMessageType.INFO);
      pkLogger.logV1(peerInfo.rootCertificate, PKMessageType.SUCCESS);

      pkLogger.logV1('Peer Address:', PKMessageType.INFO);
      pkLogger.logV1(
        peerInfo.peerAddress?.toString() ?? '',
        PKMessageType.SUCCESS,
      );

      pkLogger.logV1('API Address:', PKMessageType.INFO);
      pkLogger.logV1(
        peerInfo.apiAddress?.toString() ?? '',
        PKMessageType.SUCCESS,
      );
    }
  }),
);

const commandListPeers = new commander.Command('list');
commandListPeers.description('list all connected peers');
commandListPeers.alias('ls');
commandListPeers.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandListPeers.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandListPeers.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const res = (await promisifyGrpc(client.listPeers.bind(client))(
      new agentPB.EmptyMessage(),
    )) as agentPB.StringListMessage;
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

const commandPingPeer = new commander.Command('ping');
commandPingPeer.description('ping a connected peer');
commandPingPeer.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandPingPeer.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandPingPeer.requiredOption(
  '-pi, --peer-id <peerId>',
  '(required) id string of the peer to be pinged',
);
commandPingPeer.option(
  '-t, --timeout <timeout>',
  'timeout of the request in milliseconds',
);
commandPingPeer.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const request = new agentPB.ContactPeerMessage();
    request.setPublicKeyOrHandle(options.peerId);
    if (options.timeout) {
      request.setTimeout(options.timeout);
    }
    await promisifyGrpc(client.pingPeer.bind(client))(request);
    pkLogger.logV1('peer successfully pinged', PKMessageType.SUCCESS);
  }),
);

const commandStealth = new commander.Command('stealth');
commandStealth.description('toggle stealth mode on or off');
commandStealth.addCommand(
  new commander.Command('active')
    .command('active')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option(
      '-v, --verbosity, <verbosity>',
      'set the verbosity level, can choose from levels 1, 2 or 3',
      (str) => parseInt(str),
      1,
    )
    .action(
      actionRunner(async (options) => {
        const nodePath = resolveKeynodeStatePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity);
        const client = await getAgentClient(nodePath, pkLogger);

        const request = new agentPB.BooleanMessage();
        request.setB(true);
        await promisifyGrpc(client.toggleStealthMode.bind(client))(request);

        pkLogger.logV2(
          `stealth mode toggled to 'active'`,
          PKMessageType.SUCCESS,
        );
      }),
    ),
);
commandStealth.addCommand(
  new commander.Command('inactive')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option(
      '-v, --verbosity, <verbosity>',
      'set the verbosity level, can choose from levels 1, 2 or 3',
      (str) => parseInt(str),
      1,
    )
    .action(
      actionRunner(async (options) => {
        const nodePath = resolveKeynodeStatePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity);
        const client = await getAgentClient(nodePath, pkLogger);

        const request = new agentPB.BooleanMessage();
        request.setB(false);
        await promisifyGrpc(client.toggleStealthMode.bind(client))(request);

        pkLogger.logV2(
          `stealth mode toggled to 'inactive'`,
          PKMessageType.SUCCESS,
        );
      }),
    ),
);

const commandUpdatePeerInfo = new commander.Command('update');
commandUpdatePeerInfo.description('update the peer info for a particular peer');
commandUpdatePeerInfo.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandUpdatePeerInfo.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandUpdatePeerInfo.option(
  '-cn, --current-node',
  'only list the peer information for the current node, useful for sharing',
);
commandUpdatePeerInfo.option(
  '-b64, --base64 <base64>',
  'decode the peer info from a base64 string',
);
commandUpdatePeerInfo.option(
  '-pi, --peer-id <peerId>',
  'the id of the peer to be updated',
);
commandUpdatePeerInfo.option(
  '-rc, --root-certificate <rootCertificate>',
  'path to the file which contains the peer root certificate',
);
commandUpdatePeerInfo.option(
  '-pa, --peer-address <peerAddress>',
  'update the peer address',
);
commandUpdatePeerInfo.option(
  '-aa, --api-address <apiAddress>',
  'update the api address',
);
commandUpdatePeerInfo.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const request = new agentPB.PeerInfoMessage();

    const base64String = options?.base64?.replace('\r', '')?.replace('\n', '');
    if (base64String != undefined) {
      // read in peer info string
      const {
        publicKey,
        rootCertificate,
        peerAddress,
        apiAddress,
      } = PeerInfo.parseB64(base64String);
      request.setPublicKey(PeerInfo.publicKeyToId(publicKey));
      request.setRootCertificate(rootCertificate);
      if (peerAddress) {
        request.setPeerAddress(peerAddress?.toString());
      }
      if (apiAddress) {
        request.setApiAddress(apiAddress?.toString());
      }
    } else {
      if (!options.currentNode && !options.peerId) {
        throw Error('must specify peer id');
      }
      if (!options.currentNode) {
        request.setPublicKey(options.peerId);
      }
      if (options.rootCertificate) {
        request.setRootCertificate(options.rootCertificate);
      }
      if (options.peerAddress || options.peerAddress == '') {
        request.setPeerAddress(options.peerAddress);
      }
      if (options.apiAddress || options.apiAddress == '') {
        request.setApiAddress(options.apiAddress);
      }
    }

    if (options.currentNode) {
      await promisifyGrpc(client.updateLocalPeerInfo.bind(client))(request);
    } else {
      await promisifyGrpc(client.updatePeerInfo.bind(client))(request);
    }

    pkLogger.logV2('peer info was successfully updated', PKMessageType.SUCCESS);
  }),
);

const commandPeers = new commander.Command('peers');
commandPeers.description('peer operations');
commandPeers.addCommand(commandGetPeerInfo);
commandPeers.addCommand(commandUpdatePeerInfo);
commandPeers.addCommand(commandAddAlias);
commandPeers.addCommand(commandAddPeer);
commandPeers.addCommand(commandListPeers);
commandPeers.addCommand(commandPingPeer);
commandPeers.addCommand(commandFindPeer);
commandPeers.addCommand(commandStealth);

export default commandPeers;
