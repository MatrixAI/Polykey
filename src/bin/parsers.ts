import type { FileSystem } from '../types';
import type { IdentityId, ProviderId } from '../identities/types';
import type { SessionToken } from '../sessions/types';

import { env } from 'process';
import * as grpc from '@grpc/grpc-js';
import commander from 'commander';

import * as binUtils from './utils';
import * as nodesUtils from '../nodes/utils';
import * as clientUtils from '../client/utils';

function parseNumber(v: string): number {
  const num = parseInt(v);
  if (isNaN(num)) {
    throw new commander.InvalidArgumentError(`${v} is not a number`);
  }
  return num;
}

async function parseAuth({
  passwordFile,
  fs = require('fs'),
}: {
  passwordFile?: string;
  fs?: FileSystem;
}): Promise<grpc.Metadata> {
  let meta = new grpc.Metadata();
  if (passwordFile !== undefined) {
    const password = await fs.promises.readFile(passwordFile, {
      encoding: 'utf-8',
    });
    meta = clientUtils.encodeAuthFromPassword(password);
  } else if (env.PK_PASSWORD !== undefined) {
    meta = clientUtils.encodeAuthFromPassword(env.PK_PASSWORD);
  } else if (env.PK_TOKEN !== undefined) {
    meta = clientUtils.encodeAuthFromSession(env.PK_TOKEN as SessionToken);
  }
  return meta;
}

async function parsePassword({
  passwordFile,
  fs = require('fs'),
}: {
  passwordFile?: string;
  fs?: FileSystem;
}): Promise<string> {
  let password: string | undefined = undefined;
  if (passwordFile !== undefined) {
    password = await fs.promises.readFile(passwordFile, {
      encoding: 'utf-8',
    });
  } else if (env['PK_PASSWORD'] !== undefined) {
    password = env['PK_PASSWORD'];
  }
  while (password === undefined) {
    password = await binUtils.requestPassword();
  }
  return password;
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

async function parseFilePath({
  filePath,
  fs = require('fs'),
}: {
  filePath: string;
  fs?: FileSystem;
}): Promise<string> {
  const cipherText = await fs.promises.readFile(filePath, {
    encoding: 'binary',
  });
  return cipherText;
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

export {
  parseNumber,
  parseAuth,
  parsePassword,
  parseSecretPath,
  parseGestaltId,
  parseFilePath,
  formatIdentityString,
};
