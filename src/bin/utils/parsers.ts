import type { NodeId, NodeMapping } from '../../nodes/types';
import type { Host, Hostname, Port } from '../../network/types';
import commander from 'commander';
import { IdInternal } from '@matrixai/id';
import * as nodesUtils from '../../nodes/utils';
import * as networkUtils from '../../network/utils';
import * as validationUtils from '../../validation/utils';
import * as validationErrors from '../../validation/errors';
import config from '../../config';
import { never } from '../../utils';

/**
 * Converts a validation parser to commander argument parser
 */
function validateParserToArgParser<T>(
  validate: (data: string) => T,
): (data: string) => T {
  return (data: string) => {
    try {
      return validate(data);
    } catch (e) {
      if (e instanceof validationErrors.ErrorParse) {
        throw new commander.InvalidArgumentError(e.message);
      } else {
        throw e;
      }
    }
  };
}

const parseInteger = validateParserToArgParser(validationUtils.parseInteger);
const parseNumber = validateParserToArgParser(validationUtils.parseNumber);
const parseNodeId = validateParserToArgParser(validationUtils.parseNodeId);
const parseGestaltId = validateParserToArgParser(
  validationUtils.parseGestaltId,
);
const parseHost = validateParserToArgParser(validationUtils.parseHost);
const parseHostname = validateParserToArgParser(validationUtils.parseHostname);
const parseHostOrHostname = validateParserToArgParser(
  validationUtils.parseHostOrHostname,
);
const parsePort = validateParserToArgParser(validationUtils.parsePort);

function parseCoreCount(v: string): number | undefined {
  if (v === 'all') {
    return undefined;
  }
  return parseInt(v);
}

function parseSecretPath(secretPath: string): [string, string, string?] {
  // E.g. If 'vault1:a/b/c', ['vault1', 'a/b/c'] is returned
  //      If 'vault1:a/b/c=VARIABLE', ['vault1, 'a/b/c', 'VARIABLE'] is returned
  const secretPathRegex =
    /^([\w-]+)(?::)([\w\-\\\/\.\$]+)(?:=)?([a-zA-Z_][\w]+)?$/;
  if (!secretPathRegex.test(secretPath)) {
    throw new commander.InvalidArgumentError(
      `${secretPath} is not of the format <vaultName>:<directoryPath>`,
    );
  }
  const [, vaultName, directoryPath] = secretPath.match(secretPathRegex)!;
  return [vaultName, directoryPath, undefined];
}

/**
 * Acquires the default seed nodes from src/config.ts.
 */
function getDefaultSeedNodes(network: string): NodeMapping {
  const seedNodes: NodeMapping = {};
  let source;
  switch (network) {
    case 'testnet':
      source = config.defaults.network.testnet;
      break;
    case 'mainnet':
      source = config.defaults.network.mainnet;
      break;
    default:
      never();
  }
  for (const id in source) {
    const seedNodeId = IdInternal.fromString<NodeId>(id);
    seedNodes[seedNodeId] = {
      host: source[seedNodeId].host as Host | Hostname,
      port: source[seedNodeId].port as Port,
    };
  }
  return seedNodes;
}

/**
 * Seed nodes expected to be of form 'nodeId1@host:port;nodeId2@host:port;...'
 * By default, any specified seed nodes (in CLI option, or environment variable)
 * will overwrite the default nodes in src/config.ts.
 * Special flag `<defaults>` indicates that the default seed
 * nodes should be added to the starting seed nodes instead of being overwritten.
 */
function parseSeedNodes(rawSeedNodes: string): [NodeMapping, boolean] {
  const seedNodeMappings: NodeMapping = {};
  let defaults = false;
  // If specifically set no seed nodes, then ensure we start with none
  if (rawSeedNodes === '') return [seedNodeMappings, defaults];
  const semicolonSeedNodes = rawSeedNodes.split(';');
  for (const rawSeedNode of semicolonSeedNodes) {
    // Empty string will occur if there's an extraneous ';' (e.g. at end of env)
    if (rawSeedNode === '') continue;
    // Append the default seed nodes if we encounter the special flag
    if (rawSeedNode === '<defaults>') {
      defaults = true;
      continue;
    }
    const idHostPort = rawSeedNode.split(/[@:]/);
    if (idHostPort.length !== 3) {
      throw new commander.InvalidOptionArgumentError(
        `${rawSeedNode} is not of format 'nodeId@host:port'`,
      );
    }
    const seedNodeId = nodesUtils.decodeNodeId(idHostPort[0]);
    if (seedNodeId == null) {
      throw new commander.InvalidOptionArgumentError(
        `${idHostPort[0]} is not a valid node ID`,
      );
    }
    if (!networkUtils.isHostname(idHostPort[1])) {
      throw new commander.InvalidOptionArgumentError(
        `${idHostPort[1]} is not a valid hostname`,
      );
    }
    const port = parsePort(idHostPort[2]);
    seedNodeMappings[seedNodeId] = {
      host: idHostPort[1] as Host | Hostname,
      port: port,
    };
  }
  return [seedNodeMappings, defaults];
}

function parseNetwork(network: string): NodeMapping {
  // Getting a list of network names from the config defaults
  const networks = config.defaults.network;
  const validNetworks = Object.keys(networks);

  // Checking if the network name is valid.
  if (validNetworks.includes(network)) return getDefaultSeedNodes(network);
  throw new commander.InvalidArgumentError(`${network} is not a valid network`);
}

export {
  parseInteger,
  parseNumber,
  parseCoreCount,
  parseSecretPath,
  parseNodeId,
  parseGestaltId,
  parseHost,
  parseHostname,
  parseHostOrHostname,
  parsePort,
  getDefaultSeedNodes,
  parseSeedNodes,
  parseNetwork,
};
