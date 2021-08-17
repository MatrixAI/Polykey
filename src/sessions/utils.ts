import type { POJO } from '../types';
import type { KeyObject } from 'crypto';
import type { SessionToken } from '../sessions/types';

import fs from 'fs';
import base58 from 'bs58';

import { SignJWT } from 'jose/jwt/sign';
import { jwtVerify } from 'jose/jwt/verify';
import { KeyManager, utils as keyUtils, errors as keyErrors } from '../keys';

import * as grpc from '@grpc/grpc-js';
import * as keysUtils from '../keys/utils';
import * as clientErrors from '../client/errors';

async function generateRandomPayload() {
  const bytes = await keysUtils.getRandomBytes(32);
  return base58.encode(bytes);
}

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

async function createSessionToken(
  payload: POJO,
  expiry: string | number,
  privateKey: KeyObject,
): Promise<SessionToken> {
  return (await new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setExpirationTime(expiry)
    .sign(privateKey)) as SessionToken;
}

async function verifySessionToken(
  token: SessionToken,
  jwtPublicKey: KeyObject,
) {
  return await jwtVerify(token, jwtPublicKey);
}

export {
  generateRandomPayload,
  checkPassword,
  passwordFromMetadata,
  createSessionToken,
  verifySessionToken,
};
