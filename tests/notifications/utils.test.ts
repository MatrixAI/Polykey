import type { Notification, NotificationData } from '@/notifications/types';
import type { VaultActions, VaultName } from '@/vaults/types';
import { createPublicKey } from 'crypto';
import { EmbeddedJWK, jwtVerify, exportJWK } from 'jose';
import * as keysUtils from '@/keys/utils';
import * as notificationsUtils from '@/notifications/utils';
import * as notificationsErrors from '@/notifications/errors';
import * as vaultsUtils from '@/vaults/utils';
import * as nodesUtils from '@/nodes/utils';
import * as testNodesUtils from '../nodes/utils';
import { globalRootKeyPems } from '../globalRootKeyPems';

describe('Notifications utils', () => {
  const nodeId = testNodesUtils.generateRandomNodeId();
  const nodeIdEncoded = nodesUtils.encodeNodeId(nodeId);
  const vaultId = vaultsUtils.generateVaultId();
  const vaultIdEncoded = vaultsUtils.encodeVaultId(vaultId);

  test('generates notification ids', async () => {
    const generator = notificationsUtils.createNotificationIdGenerator();
    let oldId = generator();
    let currentId;

    for (let i = 0; i < 100; i++) {
      currentId = generator();
      expect(Buffer.compare(oldId, currentId)).toBeTruthy();
      oldId = currentId;
    }
  });
  test('Generator maintains order between instances', async () => {
    let generator = notificationsUtils.createNotificationIdGenerator();
    let lastId = generator();
    let currentId;

    for (let i = 0; i < 100; i++) {
      generator = notificationsUtils.createNotificationIdGenerator(lastId);
      currentId = generator();
      expect(Buffer.compare(lastId, currentId)).toBeTruthy();
      lastId = currentId;
    }
  });

  test('signs notifications', async () => {
    const generalNotification: Notification = {
      data: {
        type: 'General',
        message: 'msg',
      } as NotificationData,
      senderId: nodeIdEncoded,
      isRead: false,
    };
    const gestaltInviteNotification: Notification = {
      data: {
        type: 'GestaltInvite',
      } as NotificationData,
      senderId: nodeIdEncoded,
      isRead: false,
    };
    const vaultShareNotification: Notification = {
      data: {
        type: 'VaultShare',
        vaultId: vaultIdEncoded,
        vaultName: 'vaultName' as VaultName,
        actions: {
          clone: null,
          pull: null,
        } as VaultActions,
      } as NotificationData,
      senderId: nodeIdEncoded,
      isRead: false,
    };

    const privateKey = keysUtils.privateKeyFromPem(globalRootKeyPems[0]);
    const publicKey = keysUtils.publicKeyFromPrivateKey(privateKey);
    const keyPairPem = keysUtils.keyPairToPem({ privateKey, publicKey });
    const jwkPublicKey = await exportJWK(createPublicKey(keyPairPem.publicKey));

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
    expect(result.payload.senderId).toEqual(nodeIdEncoded);
    expect(result.payload.isRead).toBeFalsy();
    expect(result.protectedHeader.jwk).toEqual(jwkPublicKey);

    result = await jwtVerify(signedGestaltInviteNotification, EmbeddedJWK, {});
    expect(result.payload.data).toEqual({
      type: 'GestaltInvite',
    });
    expect(result.payload.senderId).toEqual(nodeIdEncoded);
    expect(result.payload.isRead).toBeFalsy();
    expect(result.protectedHeader.jwk).toEqual(jwkPublicKey);

    result = await jwtVerify(signedVaultShareNotification, EmbeddedJWK, {});
    expect(result.payload.data).toEqual({
      type: 'VaultShare',
      vaultId: vaultIdEncoded,
      vaultName: 'vaultName',
      actions: {
        clone: null,
        pull: null,
      },
    });
    expect(result.payload.senderId).toEqual(nodeIdEncoded);
    expect(result.payload.isRead).toBeFalsy();
    expect(result.protectedHeader.jwk).toEqual(jwkPublicKey);
  });

  test('verifies and decodes signed notifications', async () => {
    const generalNotification: Notification = {
      data: {
        type: 'General',
        message: 'msg',
      } as NotificationData,
      senderId: nodeIdEncoded,
      isRead: false,
    };
    const gestaltInviteNotification: Notification = {
      data: {
        type: 'GestaltInvite',
      } as NotificationData,
      senderId: nodeIdEncoded,
      isRead: false,
    };
    const vaultShareNotification: Notification = {
      data: {
        type: 'VaultShare',
        vaultId: vaultIdEncoded,
        vaultName: 'vaultName' as VaultName,
        actions: {
          clone: null,
          pull: null,
        } as VaultActions,
      } as NotificationData,
      senderId: nodeIdEncoded,
      isRead: false,
    };

    const privateKey = keysUtils.privateKeyFromPem(globalRootKeyPems[1]);
    const publicKey = keysUtils.publicKeyFromPrivateKey(privateKey);
    const keyPairPem = keysUtils.keyPairToPem({ privateKey, publicKey });

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
    expect(decodedGeneralNotification.senderId).toEqual(nodeIdEncoded);
    expect(decodedGeneralNotification.isRead).toBeFalsy();

    const decodedGestaltInviteNotification =
      await notificationsUtils.verifyAndDecodeNotif(
        signedGestaltInviteNotification,
      );
    expect(decodedGestaltInviteNotification.data).toEqual({
      type: 'GestaltInvite',
    });
    expect(decodedGestaltInviteNotification.senderId).toEqual(nodeIdEncoded);
    expect(decodedGestaltInviteNotification.isRead).toBeFalsy();

    const decodedVaultShareNotification =
      await notificationsUtils.verifyAndDecodeNotif(
        signedVaultShareNotification,
      );
    expect(decodedVaultShareNotification.data).toEqual({
      type: 'VaultShare',
      vaultId: vaultIdEncoded,
      vaultName: 'vaultName',
      actions: {
        clone: null,
        pull: null,
      },
    });
    expect(decodedVaultShareNotification.senderId).toEqual(nodeIdEncoded);
    expect(decodedVaultShareNotification.isRead).toBeFalsy();
  });

  test('validates correct notifications', async () => {
    const nodeIdOther = testNodesUtils.generateRandomNodeId();
    const nodeIdOtherEncoded = nodesUtils.encodeNodeId(nodeIdOther);
    const generalNotification: Notification = {
      data: {
        type: 'General',
        message: 'msg',
      } as NotificationData,
      senderId: nodeIdOtherEncoded,
      isRead: false,
    };
    expect(
      notificationsUtils.validateNotification(generalNotification),
    ).toEqual(generalNotification);

    const gestaltInviteNotification: Notification = {
      data: {
        type: 'GestaltInvite',
      } as NotificationData,
      senderId: nodeIdEncoded,
      isRead: false,
    };
    expect(
      notificationsUtils.validateNotification(gestaltInviteNotification),
    ).toEqual(gestaltInviteNotification);

    const vaultShareNotification: Notification = {
      data: {
        type: 'VaultShare',
        vaultId: vaultIdEncoded,
        vaultName: 'vaultName' as VaultName,
        actions: {
          clone: null,
          pull: null,
        } as VaultActions,
      } as NotificationData,
      senderId: nodeIdEncoded,
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
      senderId: nodeIdEncoded,
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
      senderId: nodeIdEncoded,
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
      senderId: nodeIdEncoded,
      isRead: false,
    };
    expect(() =>
      notificationsUtils.validateNotification(notification3),
    ).toThrow(notificationsErrors.ErrorNotificationsInvalidType);

    // Incorrect field type (actions)
    const notification4 = {
      data: {
        type: 'VaultShare',
        vaultId: vaultId,
        vaultName: 'vaultName' as VaultName,
        actions: 'clone + pull',
      },
      senderId: nodeIdEncoded,
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
      sendingId: nodeIdEncoded,
      isRead: false,
    };
    expect(() =>
      notificationsUtils.validateNotification(notification5),
    ).toThrow(notificationsErrors.ErrorNotificationsValidationFailed);
  });
});
