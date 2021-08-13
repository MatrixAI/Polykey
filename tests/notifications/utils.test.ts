import type { NodeId } from '../../src/nodes/types';
import type {
  NotificationId,
  Notification,
} from '../../src/notifications/types';

import jwtVerify from 'jose/jwt/verify';
import { createPublicKey } from 'crypto';
import EmbeddedJWK from 'jose/jwk/embedded';
import fromKeyLike from 'jose/jwk/from_key_like';

import * as keysUtils from '../../src/keys/utils';
import * as notificationUtils from '../../src/notifications/utils';

describe('Notifications utils', () => {
  test('generates notification ids', async () => {
    const id1 = notificationUtils.generateNotifId() as NotificationId;
    const id2 = notificationUtils.generateNotifId() as NotificationId;
    expect(id1 < id2).toBeTruthy();
  });
  test('signs notifications', async () => {
    const notification: Notification = {
      senderId: 'nodeId' as NodeId,
      message: 'msg',
      isRead: false,
    };
    const keyPair = await keysUtils.generateKeyPair(4096);
    const keyPairPem = keysUtils.keyPairToPem(keyPair);
    const jwkPublicKey = await fromKeyLike(
      createPublicKey(keyPairPem.publicKey),
    );

    const signedNotification = await notificationUtils.signNotification(
      notification,
      keyPairPem,
    );
    const { payload, protectedHeader } = await jwtVerify(
      signedNotification,
      EmbeddedJWK,
      {},
    );
    expect(payload.senderId).toEqual('nodeId');
    expect(payload.message).toEqual('msg');
    expect(payload.isRead).toBeFalsy();
    expect(protectedHeader.jwk).toEqual(jwkPublicKey);
  });
  test('verifies and decodes signed notifications', async () => {
    const notification: Notification = {
      senderId: 'nodeId' as NodeId,
      message: 'msg',
      isRead: false,
    };
    const keyPair = await keysUtils.generateKeyPair(4096);
    const keyPairPem = keysUtils.keyPairToPem(keyPair);

    const signedNotification = await notificationUtils.signNotification(
      notification,
      keyPairPem,
    );
    const decodedNotification = await notificationUtils.verifyAndDecodeNotif(
      signedNotification,
    );
    expect(decodedNotification.senderId).toEqual('nodeId');
    expect(decodedNotification.message).toEqual('msg');
    expect(decodedNotification.isRead).toBeFalsy();
  });
});
