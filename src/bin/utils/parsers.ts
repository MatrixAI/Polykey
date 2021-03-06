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
