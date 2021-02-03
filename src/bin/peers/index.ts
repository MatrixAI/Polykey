import fs from 'fs';
import commander from 'commander';
import { PeerInfo } from '../../Polykey';
import * as agentPB from '../../../proto/js/Agent_pb';
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
commandAddPeer.requiredOption(
  '-p, --pem <pem>',
  '(required) the file that contains the decode the peer info from a pem encoded string',
);
commandAddPeer.option(
  '-a, --alias <alias>',
  '(optional) a custom unsigned alias for the peer',
);
commandAddPeer.option(
  '-pa, --peer-address <peerAddress>',
  '(optional) address that overwrites the signed peer address on which the peer is served',
);
commandAddPeer.option(
  '-aa, --api-address <apiAddress>',
  '(optional) address that overwrites the signed api address on which the peers HTTP API is served',
);
commandAddPeer.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const pemFileData = fs.readFileSync(options.pem).toString()

    const request = new agentPB.PeerInfoReadOnlyMessage();
    request.setPem(pemFileData)
    if (options.alias) {
      request.setUnsignedAlias(options.alias)
    }
    if (options.peerAddress) {
      request.setUnsignedPeerAddress(options.peerAddress)
    }
    if (options.apiAddress) {
      request.setUnsignedApiAddress(options.apiAddress)
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
commandAddAlias.option('-u, --unset', 'unset the alias for the target peer');
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
  '-p, --pem',
  'output peer info a pem encoded string',
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
    const peerInfo = res.toObject()

    if (options.pem as boolean) {
      pkLogger.logV1(peerInfo.pem, PKMessageType.SUCCESS);
    } else {
      pkLogger.logV1('Peer Id:', PKMessageType.INFO);
      pkLogger.logV1(peerInfo.peerId, PKMessageType.SUCCESS);

      pkLogger.logV1('Alias:', PKMessageType.INFO);
      pkLogger.logV1(peerInfo.alias, PKMessageType.SUCCESS);

      pkLogger.logV1('Public Key:', PKMessageType.INFO);
      pkLogger.logV1(peerInfo.publicKey, PKMessageType.SUCCESS);

      pkLogger.logV1('Root Public Key:', PKMessageType.INFO);
      pkLogger.logV1(peerInfo.rootPublicKey, PKMessageType.SUCCESS);

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

      pkLogger.logV1('Digitial Identity Proofs:', PKMessageType.INFO);
      peerInfo.proofListList.forEach(p => {
        pkLogger.logV1(
          `Identity Link: '${p.digitalIdentityLink}'`,
          PKMessageType.SUCCESS,
        );
        pkLogger.logV1(
          `Proof Link: '${p.proofLink}'`,
          PKMessageType.SUCCESS,
        );
      })
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
  '-pi, --peer-id <peerId>',
  'the id of the peer to be updated',
);
commandUpdatePeerInfo.option(
  '-p, --pem <pem>',
  'the file that contains the decode the peer info from a pem encoded string',
);
commandUpdatePeerInfo.option(
  '-a, --alias <alias>',
  'update the peer alias',
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

    if (options.currentNode) {
      const peerInfo = new agentPB.PeerInfoMessage
      if (options.alias) {
        peerInfo.setAlias(options.alias)
      } else if (options.peerAddress) {
        peerInfo.setPeerAddress(options.peerAddress)
      } else if (options.apiAddress) {
        peerInfo.setApiAddress(options.apiAddress)
      } else {
        throw Error('no changes were provided')
      }
      await promisifyGrpc(client.updateLocalPeerInfo.bind(client))(peerInfo);
    } else if (options.pem) {
      const pem = fs.readFileSync(options.pem).toString()
      const peerInfo = new agentPB.PeerInfoReadOnlyMessage
      peerInfo.setPem(pem)
      await promisifyGrpc(client.updatePeerInfo.bind(client))(peerInfo);
    } else if (options.peerId) {
      const peerInfo = new agentPB.PeerInfoReadOnlyMessage
      if (options.alias) {
        peerInfo.setUnsignedAlias(options.alias)
      } else if (options.peerAddress || options.peerAddress == '') {
        peerInfo.setUnsignedPeerAddress(options.peerAddress)
      } else if (options.apiAddress || options.apiAddress == '') {
        peerInfo.setUnsignedApiAddress(options.apiAddress)
      } else {
        throw Error('no changes were provided')
      }
      await promisifyGrpc(client.updatePeerInfo.bind(client))(peerInfo);
    } else {
      throw Error('currentNode, pem or peerId must be provided to identify peer')
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
