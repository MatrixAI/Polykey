import fs from 'fs';
import process from 'process';
import * as agentPB from '../../../proto/js/Agent_pb';
import {
  createCommand,
  verboseToLogLevel,
  getAgentClient,
  promisifyGrpc,
} from '../utils';
import { getNodePath } from '../../utils';

const commandAddNode = createCommand('add', { verbose: true });
commandAddNode.description('add a new node to the store');
commandAddNode.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
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
  '-na, --node-address <nodeAddress>',
  '(optional) address that overwrites the signed node address on which the node is served',
);
commandAddNode.option(
  '-aa, --api-address <apiAddress>',
  '(optional) address that overwrites the signed api address on which the nodes HTTP API is served',
);
commandAddNode.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = getNodePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
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
  process.stdout.write(
    `node id of '${res.getS()}' successfully added to node store\n`,
  );
});

const commandAddAlias = createCommand('alias', { verbose: true });
commandAddAlias.description('set/unset an alias for an existing node');
commandAddAlias.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandAddAlias.requiredOption(
  '-ni, --node-id <nodeId>',
  '(required) id of the node for which an alias is to be set',
);
commandAddAlias.option('-a, --alias <alias>', 'new alias for the target node');
commandAddAlias.option('-u, --unset', 'unset the alias for the target node');
commandAddAlias.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = getNodePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  if (options.unset) {
    const request = new agentPB.StringMessage();
    request.setS(options.nodeId!);
    await promisifyGrpc(client.unsetAlias.bind(client))(request);
    process.stdout.write(`node alias has successfully been unset\n`);
  } else {
    const request = new agentPB.NodeAliasMessage();
    request.setNodeId(options.nodeId!);
    request.setAlias(options.alias!);
    await promisifyGrpc(client.setAlias.bind(client))(request);
    process.stdout.write(`node alias has successfully been set\n`);
  }
});

const commandFindNode = createCommand('find', { verbose: true });
commandFindNode.description('find a node');
commandFindNode.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandFindNode.requiredOption(
  '-ni, --node-id <nodeId>',
  '(required) id string of the node to be pinged',
);
commandFindNode.option(
  '-t, --timeout <timeout>',
  'timeout of the request in milliseconds',
  (str) => parseInt(str),
  15,
);
commandFindNode.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = getNodePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const request = new agentPB.ContactNodeMessage();
  request.setPublicKeyOrHandle(options.nodeId);
  if (options.timeout) {
    request.setTimeout(options.timeout);
  }
  await promisifyGrpc(client.findNode.bind(client))(request);
  process.stdout.write('node successfully found\n');
});

const commandGetNodeInfo = createCommand('get', { verbose: true });
commandGetNodeInfo.description('get the node info for a particular node');
commandGetNodeInfo.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandGetNodeInfo.option('-p, --pem', 'output node info a pem encoded string');
commandGetNodeInfo.option(
  '-cn, --current-node',
  'only list the node information for the current node, useful for sharing',
);
commandGetNodeInfo.option(
  '-ni, --node-id <nodeId>',
  'unique hash of public key that identifies the node',
);
commandGetNodeInfo.option('-a, --alias <alias>', 'alias of target node');
commandGetNodeInfo.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = getNodePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
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
    process.stdout.write(nodeInfo.pem + '\n');
  } else {
    process.stdout.write('Node Id:\n');
    process.stdout.write(nodeInfo.nodeId + '\n');

    process.stdout.write('Alias:\n');
    process.stdout.write(nodeInfo.alias + '\n');

    process.stdout.write('Public Key:\n');
    process.stdout.write(nodeInfo.publicKey + '\n');

    process.stdout.write('Root Public Key:\n');
    process.stdout.write(nodeInfo.rootPublicKey + '\n');

    process.stdout.write('Node Address:\n');
    process.stdout.write(nodeInfo.nodeAddress?.toString() + '\n' ?? '\n');

    process.stdout.write('API Address:\n');
    process.stdout.write(nodeInfo.apiAddress?.toString() + '\n' ?? '');

    process.stdout.write('Link Info List:\n');
    nodeInfo.linkInfoList.forEach((l) => {
      process.stdout.write(`Link Info Identity: '${l.identity}'\n`);
      process.stdout.write(`Node Provider: '${l.provider}'\n`);
      process.stdout.write(`Key: '${l.key}'\n`);
      process.stdout.write(`Date Issued: '${new Date(l.dateissued)}'\n`);
      process.stdout.write(`Node:\n`);
      process.stdout.write(JSON.parse(l.node) + '\n');
      process.stdout.write(`Signature:\n`);
      process.stdout.write(l.signature + '\n');
    });
  }
});

const commandListNodes = createCommand('list', { verbose: true });
commandListNodes.description('list all connected nodes');
commandListNodes.alias('ls');
commandListNodes.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandListNodes.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = getNodePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const res = (await promisifyGrpc(client.listNodes.bind(client))(
    new agentPB.EmptyMessage(),
  )) as agentPB.StringListMessage;
  const nodeIds = res.getSList();

  if (nodeIds === undefined || nodeIds.length == 0) {
    process.stdout.write('no nodes exist\n');
  } else {
    nodeIds.forEach((nodeId: string, index: number) => {
      process.stdout.write(`${index + 1}: ${nodeId}\n`);
    });
  }
});

const commandPingNode = createCommand('ping', { verbose: true });
commandPingNode.description('ping a connected node');
commandPingNode.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandPingNode.requiredOption(
  '-ni, --node-id <nodeId>',
  '(required) id string of the node to be pinged',
);
commandPingNode.option(
  '-t, --timeout <timeout>',
  'timeout of the request in milliseconds',
  (str) => parseInt(str),
  15,
);
commandPingNode.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = getNodePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const request = new agentPB.ContactNodeMessage();
  request.setPublicKeyOrHandle(options.nodeId);
  if (options.timeout) {
    request.setTimeout(options.timeout);
  }
  await promisifyGrpc(client.pingNode.bind(client))(request);
  process.stdout.write('node successfully pinged\n');
});

const commandStealth = createCommand('stealth', { verbose: true });
commandStealth.description('toggle stealth mode on or off');

const commandStealthActive = commandStealth.command('active');
commandStealthActive.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandStealthActive.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = getNodePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const request = new agentPB.BooleanMessage();
  request.setB(true);
  await promisifyGrpc(client.toggleStealthMode.bind(client))(request);
  process.stdout.write(`stealth mode toggled to 'active'\n`);
});

const commandStealthInactive = commandStealth.command('inactive');
commandStealthInactive.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandStealthInactive.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = getNodePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const request = new agentPB.BooleanMessage();
  request.setB(false);
  await promisifyGrpc(client.toggleStealthMode.bind(client))(request);
  process.stdout.write(`stealth mode toggled to 'inactive'\n`);
});

const commandUpdateNodeInfo = createCommand('update', { verbose: true });
commandUpdateNodeInfo.description('update the node info for a particular node');
commandUpdateNodeInfo.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandUpdateNodeInfo.option(
  '-cn, --current-node',
  'only list the node information for the current node, useful for sharing',
);
commandUpdateNodeInfo.option(
  '-ni, --node-id <nodeId>',
  'the id of the node to be updated',
);
commandUpdateNodeInfo.option(
  '-p, --pem <pem>',
  'the file that contains the decode the node info from a pem encoded string',
);
commandUpdateNodeInfo.option('-a, --alias <alias>', 'update the node alias');
commandUpdateNodeInfo.option(
  '-na, --node-address <nodeAddress>',
  'update the node address',
);
commandUpdateNodeInfo.option(
  '-aa, --api-address <apiAddress>',
  'update the api address',
);
commandUpdateNodeInfo.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = getNodePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
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
    throw Error('currentNode, pem or nodeId must be provided to identify node');
  }
  process.stdout.write('node info was successfully updated\n');
});

const commandNodes = createCommand('nodes');
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
