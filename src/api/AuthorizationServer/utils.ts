import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';

function createUuid(): string {
  return uuid();
}

function createToken(privateKey: string, expiry = 3600, subject = ''): string {
  const token = jwt.sign(
    {
      jti: createUuid(),
      subject,
      exp: Math.floor(Date.now() / 1000) + expiry,
    },
    privateKey,
    {
      algorithm: 'RS256',
    },
  );

  return token;
}

function verifyToken(token: string, publicKey: string) {
  return jwt.verify(token, publicKey);
}

export { createUuid, createToken, verifyToken };
