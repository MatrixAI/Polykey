import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { randomString } from '../../utils';

function createUuid(): string {
  return uuid()
};

function createToken(privateKey: string, expiry: number = 3600, subject: string = ''): string {
  const token = jwt.sign({
    jti: createUuid(),
    subject,
    exp: Math.floor(Date.now() / 1000) + expiry,
  }, privateKey, {
    algorithm: 'RS256',
  });

  return token;
};

function verifyToken(token: string, publicKey: string) {
  return jwt.verify(token, publicKey);
}

export {
  createUuid,
  createToken,
  verifyToken
}
