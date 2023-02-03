import commander from 'commander';
import * as validationUtils from '../../validation/utils';
import * as validationErrors from '../../validation/errors';

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

/**
 * Converts a validation parser to commander variadic argument parser.
 * Variadic options/arguments are always space-separated.
 */
function validateParserToArgListParser<T>(
  validate: (data: string) => T,
): (data: string) => Array<T> {
  return (data: string) => {
    try {
      return data.split(' ').map(validate);
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
const parseGestaltAction = validateParserToArgParser(
  validationUtils.parseGestaltAction,
);
const parseHost = validateParserToArgParser(validationUtils.parseHost);
const parseHostname = validateParserToArgParser(validationUtils.parseHostname);
const parseHostOrHostname = validateParserToArgParser(
  validationUtils.parseHostOrHostname,
);
const parsePort = validateParserToArgParser(validationUtils.parsePort);
const parseNetwork = validateParserToArgParser(validationUtils.parseNetwork);
const parseSeedNodes = validateParserToArgParser(
  validationUtils.parseSeedNodes,
);
const parseProviderId = validateParserToArgParser(
  validationUtils.parseProviderId,
);
const parseIdentityId = validateParserToArgParser(
  validationUtils.parseIdentityId,
);

const parseProviderIdList = validateParserToArgListParser(
  validationUtils.parseProviderId,
);

function parseCoreCount(v: string): number | undefined {
  if (v === 'all') {
    return undefined;
  }
  return parseInt(v);
}

function parseSecretPath(secretAddress: string): [string, string] {
  // E.g. If 'vault1:a/b/c', ['vault1', 'a/b/c'] is returned
  const secretAddressRegex = /^([a-zA-Z0-9-_]+):([\w\-\\\/\.\$]+)$/;
  const matches = secretAddress.match(secretAddressRegex);
  if (matches == null) {
    throw new commander.InvalidArgumentError(
      `${secretAddress} is not of the format <vaultName>:<secretPath>`,
    );
  }
  const [, vaultName, secretPath] = matches;
  return [vaultName, secretPath];
}

export {
  parseInteger,
  parseNumber,
  parseNodeId,
  parseGestaltId,
  parseGestaltAction,
  parseHost,
  parseHostname,
  parseHostOrHostname,
  parsePort,
  parseNetwork,
  parseSeedNodes,
  parseProviderId,
  parseIdentityId,
  parseProviderIdList,
  parseCoreCount,
  parseSecretPath,
};
