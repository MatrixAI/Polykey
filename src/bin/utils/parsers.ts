import type { IdentityId, ProviderId } from '../../identities/types';
import type { Host, Hostname, Port } from '../../network/types';
import type { NodeId, NodeMapping } from '../../nodes/types';
import commander from 'commander';
import { IdInternal } from '@matrixai/id';
import * as nodesUtils from '../../nodes/utils';
import * as networkUtils from '../../network/utils';
import config from '../../config';
import { never } from '../../utils';

function parseNumber(v: string): number {
  const num = parseInt(v);
  if (isNaN(num)) {
    throw new commander.InvalidArgumentError(`${v} is not a number`);
  }
  return num;
}

function parseCoreCount(v: string): number | undefined {
  if (v === 'all') {
    return undefined;
  }
  return parseNumber(v);
}

function parseSecretPath(
  secretPath: string,
): [string, string, string | undefined] {
  // E.g. If 'vault1:a/b/c', ['vault1', 'a/b/c'] is returned
  //      If 'vault1:a/b/c=VARIABLE', ['vault1, 'a/b/c', 'VAIRABLE'] is returned
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

function parseGestaltId(gestaltId: string) {
  let providerId: string | null = null;
  let identityId: string | null = null;
  let nodeId: string | null = null;

  const identityStringRegex = /^(.+):(.+)$/;
  if (identityStringRegex.test(gestaltId)) {
    const parsed = parseIdentityString(gestaltId);
    providerId = parsed.providerId;
    identityId = parsed.identityId;
  } else if (gestaltId != null) {
    nodeId = gestaltId;
  } else {
    throw new commander.InvalidArgumentError(
      `${gestaltId} is not a valid Node ID or Identity String`,
    );
  }
  return { providerId, identityId, nodeId };
}

function parseIdentityString(identityString: string): {
  providerId: ProviderId;
  identityId: IdentityId;
} {
  const split = identityString.split(':');
  const providerId = split[0] as ProviderId;
  const identityId = split[1] as IdentityId;
  return { providerId, identityId };
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
    if (!networkUtils.isValidHostname(idHostPort[1])) {
      throw new commander.InvalidOptionArgumentError(
        `${idHostPort[1]} is not a valid hostname`,
      );
    }
    const port = parseNumber(idHostPort[2]);
    seedNodeMappings[seedNodeId] = {
      host: idHostPort[1] as Host | Hostname,
      port: port as Port,
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
  parseNumber,
  parseCoreCount,
  parseSecretPath,
  parseGestaltId,
  getDefaultSeedNodes,
  parseSeedNodes,
  parseNetwork,
};
