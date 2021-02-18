import fs from 'fs';
import commander from 'commander';
import * as agentPB from '../../../proto/js/Agent_pb';
import {
  actionRunner,
  getPKLogger,
  PKMessageType,
  resolveKeynodeStatePath,
  getAgentClient,
  promisifyGrpc,
} from '../utils';

const commandAddNode = new commander.Command('add');
commandAddNode.description('add a new node to the store');
commandAddNode.option('-k, --node-path <nodePath>', 'provide the polykey path');
commandAddNode.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandAddNode.requiredOption(
  '-p, --pem <pem>',
  '(required) the file that contains the decode the node info from a pem encoded string',
);
commandAddNode.option(
  '-a, --alias <alias>',
  '(optional) a custom unsigned alias for the node',
);
commandAddNode.option(
  '-pa, --node-address <nodeAddress>',
  '(optional) address that overwrites the signed node address on which the node is served',
);
commandAddNode.option(
  '-aa, --api-address <apiAddress>',
  '(optional) address that overwrites the signed api address on which the nodes HTTP API is served',
);
commandAddNode.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const pemFileData = fs.readFileSync(options.pem).toString();

    const request = new agentPB.NodeInfoReadOnlyMessage();
    request.setPem(pemFileData);
    if (options.alias) {
      request.setUnsignedAlias(options.alias);
    }
    if (options.nodeAddress) {
      request.setUnsignedNodeAddress(options.nodeAddress);
    }
    if (options.apiAddress) {
      request.setUnsignedApiAddress(options.apiAddress);
    }

    const res = (await promisifyGrpc(client.addNode.bind(client))(
      request,
    )) as agentPB.StringMessage;

    pkLogger.logV2(
      `node id of '${res.getS()}' successfully added to node store`,
      PKMessageType.SUCCESS,
    );
  }),
);

const commandAddAlias = new commander.Command('alias');
commandAddAlias.description('set/unset an alias for an existing node');
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
  '-pi, --node-id <nodeId>',
  '(required) id of the node for which an alias is to be set',
);
commandAddAlias.option('-a, --alias <alias>', 'new alias for the target node');
commandAddAlias.option('-u, --unset', 'unset the alias for the target node');
commandAddAlias.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    if (options.unset) {
      const request = new agentPB.StringMessage();
      request.setS(options.nodeId!);

      await promisifyGrpc(client.unsetAlias.bind(client))(request);

      pkLogger.logV2(
        `node alias has successfully been unset`,
        PKMessageType.SUCCESS,
      );
    } else {
      const request = new agentPB.NodeAliasMessage();
      request.setNodeId(options.nodeId!);
      request.setAlias(options.alias!);

      await promisifyGrpc(client.setAlias.bind(client))(request);

      pkLogger.logV2(
        `node alias has successfully been set`,
        PKMessageType.SUCCESS,
      );
    }
  }),
);

const commandFindNode = new commander.Command('find');
commandFindNode.description('find a node');
commandFindNode.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandFindNode.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandFindNode.requiredOption(
  '-pi, --node-id <nodeId>',
  '(required) id string of the node to be pinged',
);
commandFindNode.option(
  '-t, --timeout <timeout>',
  'timeout of the request in milliseconds',
);
commandFindNode.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const request = new agentPB.ContactNodeMessage();
    request.setPublicKeyOrHandle(options.nodeId);
    if (options.timeout) {
      request.setTimeout(options.timeout);
    }
    await promisifyGrpc(client.findNode.bind(client))(request);

    pkLogger.logV1('node successfully found', PKMessageType.SUCCESS);
  }),
);

const commandGetNodeInfo = new commander.Command('get');
commandGetNodeInfo.description('get the node info for a particular node');
commandGetNodeInfo.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandGetNodeInfo.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandGetNodeInfo.option('-p, --pem', 'output node info a pem encoded string');
commandGetNodeInfo.option(
  '-cn, --current-node',
  'only list the node information for the current node, useful for sharing',
);
commandGetNodeInfo.option(
  '-pi, --node-id <nodeId>',
  'unique hash of public key that identifies the node',
);
commandGetNodeInfo.option('-a, --alias <alias>', 'alias of target node');
commandGetNodeInfo.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    let res: agentPB.NodeInfoMessage;
    if (options.currentNode) {
      res = (await promisifyGrpc(client.getLocalNodeInfo.bind(client))(
        new agentPB.EmptyMessage(),
      )) as agentPB.NodeInfoMessage;
    } else {
      const request = new agentPB.StringMessage();
      request.setS(options.nodeId ?? options.alias);
      res = (await promisifyGrpc(client.getNodeInfo.bind(client))(
        request,
      )) as agentPB.NodeInfoMessage;
    }
    const nodeInfo = res.toObject();

    if (options.pem as boolean) {
      pkLogger.logV1(nodeInfo.pem, PKMessageType.SUCCESS);
    } else {
      pkLogger.logV1('Node Id:', PKMessageType.INFO);
      pkLogger.logV1(nodeInfo.nodeId, PKMessageType.SUCCESS);

      pkLogger.logV1('Alias:', PKMessageType.INFO);
      pkLogger.logV1(nodeInfo.alias, PKMessageType.SUCCESS);

      pkLogger.logV1('Public Key:', PKMessageType.INFO);
      pkLogger.logV1(nodeInfo.publicKey, PKMessageType.SUCCESS);

      pkLogger.logV1('Root Public Key:', PKMessageType.INFO);
      pkLogger.logV1(nodeInfo.rootPublicKey, PKMessageType.SUCCESS);

      pkLogger.logV1('Node Address:', PKMessageType.INFO);
      pkLogger.logV1(
        nodeInfo.nodeAddress?.toString() ?? '',
        PKMessageType.SUCCESS,
      );

      pkLogger.logV1('API Address:', PKMessageType.INFO);
      pkLogger.logV1(
        nodeInfo.apiAddress?.toString() ?? '',
        PKMessageType.SUCCESS,
      );

      pkLogger.logV1('Link Info List:', PKMessageType.INFO);
      nodeInfo.linkInfoList.forEach((l) => {
        pkLogger.logV1(
          `Link Info Identity: '${l.identity}'`,
          PKMessageType.INFO,
        );
        pkLogger.logV1(`Node Provider: '${l.provider}'`, PKMessageType.SUCCESS);
        pkLogger.logV1(`Key: '${l.key}'`, PKMessageType.SUCCESS);
        pkLogger.logV1(
          `Date Issued: '${new Date(l.dateissued)}'`,
          PKMessageType.SUCCESS,
        );
        pkLogger.logV1(`Node:`, PKMessageType.SUCCESS);
        pkLogger.logV1(JSON.parse(l.node), PKMessageType.SUCCESS);
        pkLogger.logV1(`Signature:`, PKMessageType.SUCCESS);
        pkLogger.logV1(l.signature, PKMessageType.SUCCESS);
      });
    }
  }),
);

const commandListNodes = new commander.Command('list');
commandListNodes.description('list all connected nodes');
commandListNodes.alias('ls');
commandListNodes.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandListNodes.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandListNodes.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const res = (await promisifyGrpc(client.listNodes.bind(client))(
      new agentPB.EmptyMessage(),
    )) as agentPB.StringListMessage;
    const nodeIds = res.getSList();

    if (nodeIds === undefined || nodeIds.length == 0) {
      pkLogger.logV2('no nodes exist', PKMessageType.INFO);
    } else {
      nodeIds.forEach((nodeId: string, index: number) => {
        pkLogger.logV1(`${index + 1}: ${nodeId}`, PKMessageType.SUCCESS);
      });
    }
  }),
);

const commandPingNode = new commander.Command('ping');
commandPingNode.description('ping a connected node');
commandPingNode.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandPingNode.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandPingNode.requiredOption(
  '-pi, --node-id <nodeId>',
  '(required) id string of the node to be pinged',
);
commandPingNode.option(
  '-t, --timeout <timeout>',
  'timeout of the request in milliseconds',
);
commandPingNode.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const request = new agentPB.ContactNodeMessage();
    request.setPublicKeyOrHandle(options.nodeId);
    if (options.timeout) {
      request.setTimeout(options.timeout);
    }
    await promisifyGrpc(client.pingNode.bind(client))(request);
    pkLogger.logV1('node successfully pinged', PKMessageType.SUCCESS);
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

const commandUpdateNodeInfo = new commander.Command('update');
commandUpdateNodeInfo.description('update the node info for a particular node');
commandUpdateNodeInfo.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandUpdateNodeInfo.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandUpdateNodeInfo.option(
  '-cn, --current-node',
  'only list the node information for the current node, useful for sharing',
);
commandUpdateNodeInfo.option(
  '-pi, --node-id <nodeId>',
  'the id of the node to be updated',
);
commandUpdateNodeInfo.option(
  '-p, --pem <pem>',
  'the file that contains the decode the node info from a pem encoded string',
);
commandUpdateNodeInfo.option('-a, --alias <alias>', 'update the node alias');
commandUpdateNodeInfo.option(
  '-pa, --node-address <nodeAddress>',
  'update the node address',
);
commandUpdateNodeInfo.option(
  '-aa, --api-address <apiAddress>',
  'update the api address',
);
commandUpdateNodeInfo.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    if (options.currentNode) {
      const nodeInfo = new agentPB.NodeInfoMessage();
      if (options.alias) {
        nodeInfo.setAlias(options.alias);
      } else if (options.nodeAddress) {
        nodeInfo.setNodeAddress(options.nodeAddress);
      } else if (options.apiAddress) {
        nodeInfo.setApiAddress(options.apiAddress);
      } else {
        throw Error('no changes were provided');
      }
      await promisifyGrpc(client.updateLocalNodeInfo.bind(client))(nodeInfo);
    } else if (options.pem) {
      const pem = fs.readFileSync(options.pem).toString();
      const nodeInfo = new agentPB.NodeInfoReadOnlyMessage();
      nodeInfo.setPem(pem);
      await promisifyGrpc(client.updateNodeInfo.bind(client))(nodeInfo);
    } else if (options.nodeId) {
      const nodeInfo = new agentPB.NodeInfoReadOnlyMessage();
      if (options.alias) {
        nodeInfo.setUnsignedAlias(options.alias);
      } else if (options.nodeAddress || options.nodeAddress == '') {
        nodeInfo.setUnsignedNodeAddress(options.nodeAddress);
      } else if (options.apiAddress || options.apiAddress == '') {
        nodeInfo.setUnsignedApiAddress(options.apiAddress);
      } else {
        throw Error('no changes were provided');
      }
      await promisifyGrpc(client.updateNodeInfo.bind(client))(nodeInfo);
    } else {
      throw Error(
        'currentNode, pem or nodeId must be provided to identify node',
      );
    }

    pkLogger.logV2('node info was successfully updated', PKMessageType.SUCCESS);
  }),
);

const commandNodes = new commander.Command('nodes');
commandNodes.description('node operations');
commandNodes.addCommand(commandGetNodeInfo);
commandNodes.addCommand(commandUpdateNodeInfo);
commandNodes.addCommand(commandAddAlias);
commandNodes.addCommand(commandAddNode);
commandNodes.addCommand(commandListNodes);
commandNodes.addCommand(commandPingNode);
commandNodes.addCommand(commandFindNode);
commandNodes.addCommand(commandStealth);

export default commandNodes;
