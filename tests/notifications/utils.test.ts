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

describe('utils', () => {
  test('generates notification ids', async () => {
    const id1 = notificationUtils.generateNotifId() as NotificationId;
    const id2 = notificationUtils.generateNotifId() as NotificationId;
    expect(id1 < id2).toBeTruthy();
  });
  test('signs notifications', async () => {
    const notif: Notification = {
      senderId: 'nodeId' as NodeId,
      message: 'msg',
      isRead: false,
    };
    const keyPair = await keysUtils.generateKeyPair(4096);
    const keyPairPem = keysUtils.keyPairToPem(keyPair);
    const jwkPublicKey = await fromKeyLike(
      createPublicKey(keyPairPem.publicKey),
    );

    const signedNotif = await notificationUtils.signNotification(
      notif,
      keyPairPem,
    );
    const { payload, protectedHeader } = await jwtVerify(
      signedNotif,
      EmbeddedJWK,
      {},
    );
    expect(payload.senderId).toEqual('nodeId');
    expect(payload.message).toEqual('msg');
    expect(payload.isRead).toBeFalsy();
    expect(protectedHeader.jwk).toEqual(jwkPublicKey);
  });
  test('verifies and decodes signed notifications', async () => {
    const notif: Notification = {
      senderId: 'nodeId' as NodeId,
      message: 'msg',
      isRead: false,
    };
    const keyPair = await keysUtils.generateKeyPair(4096);
    const keyPairPem = keysUtils.keyPairToPem(keyPair);

    const signedNotif = await notificationUtils.signNotification(
      notif,
      keyPairPem,
    );
    const decodedNotif = await notificationUtils.verifyAndDecodeNotif(
      signedNotif,
    );
    expect(decodedNotif.senderId).toEqual('nodeId');
    expect(decodedNotif.message).toEqual('msg');
    expect(decodedNotif.isRead).toBeFalsy();
  });
});
