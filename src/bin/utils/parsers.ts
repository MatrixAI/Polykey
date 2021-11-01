import type { IdentityId, ProviderId } from '../../identities/types';
import commander from 'commander';
import * as nodesUtils from '../../nodes/utils';

function parseNumber(v: string): number {
  const num = parseInt(v);
  if (isNaN(num)) {
    throw new commander.InvalidArgumentError(`${v} is not a number`);
  }
  return num;
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
  } else if (nodesUtils.isNodeId(gestaltId)) {
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

function formatIdentityString(
  providerId: ProviderId,
  identityId: IdentityId,
): string {
  return `${providerId}:${identityId}`;
}
export { parseNumber, parseSecretPath, parseGestaltId, formatIdentityString };
