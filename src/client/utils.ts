import type { SessionToken } from '../session/types';

import fs from 'fs';
import * as grpc from '@grpc/grpc-js';

import * as clientErrors from './errors';

import { VaultManager } from '../vaults';
import { SessionManager } from '../session';
import { KeyManager, utils as keyUtils, errors as keyErrors } from '../keys';

async function checkPassword(
  password: string,
  keyManager: KeyManager,
): Promise<void> {
  let privateKeyPem;
  try {
    privateKeyPem = await fs.promises.readFile(keyManager.rootKeyPath, {
      encoding: 'utf8',
    });
  } catch (e) {
    throw new keyErrors.ErrorRootKeysRead(e.message, {
      errno: e.errno,
      syscall: e.syscall,
      code: e.code,
      path: e.path,
    });
  }
  try {
    keyUtils.decryptPrivateKey(privateKeyPem, password);
  } catch (e) {
    throw new clientErrors.ErrorPassword('Incorrect Password');
  }
}

async function passwordFromMetadata(
  meta: grpc.Metadata,
): Promise<string | undefined> {
  let password: string | undefined;

  // Read password file to get password
  const passwordFile = meta.get('passwordFile').pop();
  if (passwordFile) {
    password = await fs.promises.readFile(passwordFile, { encoding: 'utf-8' });
    password = password.trim();
  }

  // If password is set explicitly use it
  const metaPassword = meta.get('password').pop();
  if (metaPassword) {
    password = metaPassword.toString().trim();
  }
  return password;
}

async function parseVaultInput(
  input: string,
  vaultManager: VaultManager,
): Promise<string> {
  const id = await vaultManager.getVaultId(input);
  if (id) {
    return id;
  } else {
    return input;
  }
}

async function verifyToken(
  meta: grpc.Metadata,
  sessionManager: SessionManager,
) {
  const auth = meta.get('Authorization').pop();
  if (!auth) {
    throw new clientErrors.ErrorClientJWTTokenNotProvided();
  }
  const token = auth.toString().split(' ')[1];
  await sessionManager.verifyJWTToken(token as SessionToken);
}

function createMetadata(): grpc.Metadata {
  return new grpc.Metadata();
}

export {
  checkPassword,
  parseVaultInput,
  passwordFromMetadata,
  verifyToken,
  createMetadata,
};
