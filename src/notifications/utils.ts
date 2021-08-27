import type { Notification, SignedNotification } from './types';
import type { KeyPairPem } from '../keys/types';

import mlts from 'monotonic-lexicographic-timestamp';
import EmbeddedJWK from 'jose/jwk/embedded';
import jwtVerify from 'jose/jwt/verify';
import { createPublicKey, createPrivateKey } from 'crypto';
import { SignJWT } from 'jose/jwt/sign';
import { fromKeyLike } from 'jose/jwk/from_key_like';

const timestamp = mlts();
function generateNotifId(): string {
  return timestamp();
}

async function signNotification(
  notification: Notification,
  keyPair: KeyPairPem,
): Promise<SignedNotification> {
  const publicKey = createPublicKey(keyPair.publicKey);
  const privateKey = createPrivateKey(keyPair.privateKey);
  const jwkPublicKey = await fromKeyLike(publicKey);
  const jwt = await new SignJWT(notification)
    .setProtectedHeader({ alg: 'RS256', b64: true, jwk: jwkPublicKey })
    .setIssuedAt()
    .sign(privateKey);
  return jwt as SignedNotification;
}

async function verifyAndDecodeNotif(notifJWT: string): Promise<Notification> {
  const { payload } = await jwtVerify(notifJWT, EmbeddedJWK, {});
  return payload as Notification;
}

export { generateNotifId, signNotification, verifyAndDecodeNotif };
