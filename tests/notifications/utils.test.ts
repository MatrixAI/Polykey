import type { NodeId } from '@/nodes/types';
import type {
  NotificationId,
  Notification,
  NotificationData,
} from '@/notifications/types';
import type { VaultActions, VaultId, VaultName } from '@/vaults/types';

import jwtVerify from 'jose/jwt/verify';
import { createPublicKey } from 'crypto';
import EmbeddedJWK from 'jose/jwk/embedded';
import fromKeyLike from 'jose/jwk/from_key_like';

import * as keysUtils from '@/keys/utils';
import * as notificationsUtils from '@/notifications/utils';
import * as notificationsErrors from '@/notifications/errors';

describe('Notifications utils', () => {
  test('generates notification ids', async () => {
    const id1 = notificationsUtils.generateNotifId() as NotificationId;
    const id2 = notificationsUtils.generateNotifId() as NotificationId;
    expect(id1 < id2).toBeTruthy();
  });

  test('signs notifications', async () => {
    const generalNotification: Notification = {
      data: {
        type: 'General',
        message: 'msg',
      } as NotificationData,
      senderId: 'nodeId' as NodeId,
      isRead: false,
    };
    const gestaltInviteNotification: Notification = {
      data: {
        type: 'GestaltInvite',
      } as NotificationData,
      senderId: 'nodeId' as NodeId,
      isRead: false,
    };
    const vaultShareNotification: Notification = {
      data: {
        type: 'VaultShare',
        vaultId: 'vaultId' as VaultId,
        vaultName: 'vaultName' as VaultName,
        actions: {
          clone: null,
          pull: null,
        } as VaultActions,
      } as NotificationData,
      senderId: 'nodeId' as NodeId,
      isRead: false,
    };

    const keyPair = await keysUtils.generateKeyPair(4096);
    const keyPairPem = keysUtils.keyPairToPem(keyPair);
    const jwkPublicKey = await fromKeyLike(
      createPublicKey(keyPairPem.publicKey),
    );

    const signedGeneralNotification = await notificationsUtils.signNotification(
      generalNotification,
      keyPairPem,
    );
    const signedGestaltInviteNotification =
      await notificationsUtils.signNotification(
        gestaltInviteNotification,
        keyPairPem,
      );
    const signedVaultShareNotification =
      await notificationsUtils.signNotification(
        vaultShareNotification,
        keyPairPem,
      );

    let result = await jwtVerify(signedGeneralNotification, EmbeddedJWK, {});
    expect(result.payload.data).toEqual({
      type: 'General',
      message: 'msg',
    });
    expect(result.payload.senderId).toEqual('nodeId');
    expect(result.payload.isRead).toBeFalsy();
    expect(result.protectedHeader.jwk).toEqual(jwkPublicKey);

    result = await jwtVerify(signedGestaltInviteNotification, EmbeddedJWK, {});
    expect(result.payload.data).toEqual({
      type: 'GestaltInvite',
    });
    expect(result.payload.senderId).toEqual('nodeId');
    expect(result.payload.isRead).toBeFalsy();
    expect(result.protectedHeader.jwk).toEqual(jwkPublicKey);

    result = await jwtVerify(signedVaultShareNotification, EmbeddedJWK, {});
    expect(result.payload.data).toEqual({
      type: 'VaultShare',
      vaultId: 'vaultId',
      vaultName: 'vaultName',
      actions: {
        clone: null,
        pull: null,
      },
    });
    expect(result.payload.senderId).toEqual('nodeId');
    expect(result.payload.isRead).toBeFalsy();
    expect(result.protectedHeader.jwk).toEqual(jwkPublicKey);
  });

  test('verifies and decodes signed notifications', async () => {
    const generalNotification: Notification = {
      data: {
        type: 'General',
        message: 'msg',
      } as NotificationData,
      senderId: 'nodeId' as NodeId,
      isRead: false,
    };
    const gestaltInviteNotification: Notification = {
      data: {
        type: 'GestaltInvite',
      } as NotificationData,
      senderId: 'nodeId' as NodeId,
      isRead: false,
    };
    const vaultShareNotification: Notification = {
      data: {
        type: 'VaultShare',
        vaultId: 'vaultId' as VaultId,
        vaultName: 'vaultName' as VaultName,
        actions: {
          clone: null,
          pull: null,
        } as VaultActions,
      } as NotificationData,
      senderId: 'nodeId' as NodeId,
      isRead: false,
    };

    const keyPair = await keysUtils.generateKeyPair(4096);
    const keyPairPem = keysUtils.keyPairToPem(keyPair);

    const signedGeneralNotification = await notificationsUtils.signNotification(
      generalNotification,
      keyPairPem,
    );
    const signedGestaltInviteNotification =
      await notificationsUtils.signNotification(
        gestaltInviteNotification,
        keyPairPem,
      );
    const signedVaultShareNotification =
      await notificationsUtils.signNotification(
        vaultShareNotification,
        keyPairPem,
      );

    const decodedGeneralNotification =
      await notificationsUtils.verifyAndDecodeNotif(signedGeneralNotification);
    expect(decodedGeneralNotification.data).toEqual({
      type: 'General',
      message: 'msg',
    });
    expect(decodedGeneralNotification.senderId).toEqual('nodeId');
    expect(decodedGeneralNotification.isRead).toBeFalsy();

    const decodedGestaltInviteNotification =
      await notificationsUtils.verifyAndDecodeNotif(
        signedGestaltInviteNotification,
      );
    expect(decodedGestaltInviteNotification.data).toEqual({
      type: 'GestaltInvite',
    });
    expect(decodedGestaltInviteNotification.senderId).toEqual('nodeId');
    expect(decodedGestaltInviteNotification.isRead).toBeFalsy();

    const decodedVaultShareNotification =
      await notificationsUtils.verifyAndDecodeNotif(
        signedVaultShareNotification,
      );
    expect(decodedVaultShareNotification.data).toEqual({
      type: 'VaultShare',
      vaultId: 'vaultId',
      vaultName: 'vaultName',
      actions: {
        clone: null,
        pull: null,
      },
    });
    expect(decodedVaultShareNotification.senderId).toEqual('nodeId');
    expect(decodedVaultShareNotification.isRead).toBeFalsy();
  });

  test('validates correct notifications', async () => {
    const generalNotification: Notification = {
      data: {
        type: 'General',
        message: 'msg',
      } as NotificationData,
      senderId: 'nodeId' as NodeId,
      isRead: false,
    };
    expect(
      notificationsUtils.validateNotification(generalNotification),
    ).toEqual(generalNotification);

    const gestaltInviteNotification: Notification = {
      data: {
        type: 'GestaltInvite',
      } as NotificationData,
      senderId: 'nodeId' as NodeId,
      isRead: false,
    };
    expect(
      notificationsUtils.validateNotification(gestaltInviteNotification),
    ).toEqual(gestaltInviteNotification);

    const vaultShareNotification: Notification = {
      data: {
        type: 'VaultShare',
        vaultId: 'vaultId' as VaultId,
        vaultName: 'vaultName' as VaultName,
        actions: {
          clone: null,
          pull: null,
        } as VaultActions,
      } as NotificationData,
      senderId: 'nodeId' as NodeId,
      isRead: false,
    };
    expect(
      notificationsUtils.validateNotification(vaultShareNotification),
    ).toEqual(vaultShareNotification);
  });

  test('does not validate incorrect notifications', async () => {
    // Unknown notification type
    const notification1 = {
      data: {
        type: 'Invalid Type',
      },
      senderId: 'nodeId' as NodeId,
      isRead: false,
    };
    expect(() =>
      notificationsUtils.validateNotification(notification1),
    ).toThrow(notificationsErrors.ErrorNotificationsInvalidType);

    // Missing field (message)
    const notification2 = {
      data: {
        type: 'General',
      },
      senderId: 'nodeId' as NodeId,
      isRead: false,
    };
    expect(() =>
      notificationsUtils.validateNotification(notification2),
    ).toThrow(notificationsErrors.ErrorNotificationsInvalidType);

    // Extra field (message)
    const notification3 = {
      data: {
        type: 'GestaltInvite',
        message: 'msg',
      },
      senderId: 'nodeId' as NodeId,
      isRead: false,
    };
    expect(() =>
      notificationsUtils.validateNotification(notification3),
    ).toThrow(notificationsErrors.ErrorNotificationsInvalidType);

    // Incorrect field type (actions)
    const notification4 = {
      data: {
        type: 'VaultShare',
        vaultId: 'vaultId' as VaultId,
        vaultName: 'vaultName' as VaultName,
        actions: 'clone + pull',
      },
      senderId: 'nodeId' as NodeId,
      isRead: false,
    };
    expect(() =>
      notificationsUtils.validateNotification(notification4),
    ).toThrow(notificationsErrors.ErrorNotificationsInvalidType);

    // Incorrect field name (sendingId)
    const notification5 = {
      data: {
        type: 'General',
        message: 'message',
      },
      sendingId: 'nodeId' as NodeId,
      isRead: false,
    };
    expect(() =>
      notificationsUtils.validateNotification(notification5),
    ).toThrow(notificationsErrors.ErrorNotificationsValidationFailed);
  });
});
