import type { Notification, NotificationData } from '@/notifications/types';
import type { VaultActions, VaultName } from '@/vaults/types';
import type { KeyPairLocked } from '@/keys/types';
import * as keysUtils from '@/keys/utils';
import * as notificationsUtils from '@/notifications/utils';
import * as vaultsUtils from '@/vaults/utils';
import * as nodesUtils from '@/nodes/utils';
import * as validationErrors from '@/validation/errors';
import * as testNodesUtils from '../nodes/utils';

describe('Notifications utils', () => {
  const keyPair = keysUtils.generateKeyPair() as KeyPairLocked;
  const nodeId = keysUtils.publicKeyToNodeId(keyPair.publicKey);
  const nodeIdEncoded = nodesUtils.encodeNodeId(nodeId);
  const targetNodeId = testNodesUtils.generateRandomNodeId();
  const targetNodeIdEncoded = nodesUtils.encodeNodeId(targetNodeId);
  const vaultIdGenerator = vaultsUtils.createVaultIdGenerator();
  const vaultId = vaultIdGenerator();
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

  test('verifies and decodes signed notifications', async () => {
    const generalNotification: Notification = {
      typ: 'notification',
      data: {
        type: 'General',
        message: 'msg',
      } as NotificationData,
      iss: nodeIdEncoded,
      sub: targetNodeIdEncoded,
      isRead: false,
    };
    const gestaltInviteNotification: Notification = {
      typ: 'notification',
      data: {
        type: 'GestaltInvite',
      } as NotificationData,
      iss: nodeIdEncoded,
      sub: targetNodeIdEncoded,
      isRead: false,
    };
    const vaultShareNotification: Notification = {
      typ: 'notification',
      data: {
        type: 'VaultShare',
        vaultId: vaultIdEncoded,
        vaultName: 'vaultName' as VaultName,
        actions: {
          clone: null,
          pull: null,
        } as VaultActions,
      } as NotificationData,
      iss: nodeIdEncoded,
      sub: targetNodeIdEncoded,
      isRead: false,
    };

    const signedGeneralNotification =
      await notificationsUtils.generateNotification(
        generalNotification,
        keyPair,
      );
    const signedGestaltInviteNotification =
      await notificationsUtils.generateNotification(
        gestaltInviteNotification,
        keyPair,
      );
    const signedVaultShareNotification =
      await notificationsUtils.generateNotification(
        vaultShareNotification,
        keyPair,
      );

    const decodedGeneralNotification =
      await notificationsUtils.verifyAndDecodeNotif(
        signedGeneralNotification,
        targetNodeId,
      );
    expect(decodedGeneralNotification.data).toEqual({
      type: 'General',
      message: 'msg',
    });
    expect(decodedGeneralNotification.iss).toEqual(nodeIdEncoded);
    expect(decodedGeneralNotification.isRead).toBeFalsy();

    const decodedGestaltInviteNotification =
      await notificationsUtils.verifyAndDecodeNotif(
        signedGestaltInviteNotification,
        targetNodeId,
      );
    expect(decodedGestaltInviteNotification.data).toEqual({
      type: 'GestaltInvite',
    });
    expect(decodedGestaltInviteNotification.iss).toEqual(nodeIdEncoded);
    expect(decodedGestaltInviteNotification.isRead).toBeFalsy();

    const decodedVaultShareNotification =
      await notificationsUtils.verifyAndDecodeNotif(
        signedVaultShareNotification,
        targetNodeId,
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
    expect(decodedVaultShareNotification.iss).toEqual(nodeIdEncoded);
    expect(decodedVaultShareNotification.isRead).toBeFalsy();
  });
  test('validates correct notifications', async () => {
    const nodeIdOther = testNodesUtils.generateRandomNodeId();
    const nodeIdOtherEncoded = nodesUtils.encodeNodeId(nodeIdOther);
    const generalNotification: Notification = {
      typ: 'notification',
      data: {
        type: 'General',
        message: 'msg',
      } as NotificationData,
      iss: nodeIdOtherEncoded,
      sub: targetNodeIdEncoded,
      isRead: false,
    };
    notificationsUtils.parseNotification(generalNotification);

    const gestaltInviteNotification = {
      typ: 'notification',
      data: {
        type: 'GestaltInvite',
      } as NotificationData,
      iss: nodeIdEncoded,
      sub: targetNodeIdEncoded,
      isRead: false,
    };
    notificationsUtils.parseNotification(gestaltInviteNotification);

    const vaultShareNotification: Notification = {
      typ: 'notification',
      data: {
        type: 'VaultShare',
        vaultId: vaultIdEncoded,
        vaultName: 'vaultName' as VaultName,
        actions: {
          clone: null,
          pull: null,
        } as VaultActions,
      } as NotificationData,
      iss: nodeIdEncoded,
      sub: targetNodeIdEncoded,
      isRead: false,
    };
    notificationsUtils.parseNotification(vaultShareNotification);
  });

  test('does not validate incorrect notifications', async () => {
    // Unknown notification type
    const notification1 = {
      data: {
        type: 'Invalid Type',
      },
      iss: nodeIdEncoded,
      isRead: false,
    };
    expect(() => notificationsUtils.parseNotification(notification1)).toThrow(
      validationErrors.ErrorParse,
    );

    // Missing field (message)
    const notification2 = {
      data: {
        type: 'General',
      },
      iss: nodeIdEncoded,
      isRead: false,
    };
    expect(() => notificationsUtils.parseNotification(notification2)).toThrow(
      validationErrors.ErrorParse,
    );

    // Extra field (message)
    const notification3 = {
      data: {
        type: 'GestaltInvite',
        message: 'msg',
      },
      iss: nodeIdEncoded,
      isRead: false,
    };
    expect(() => notificationsUtils.parseNotification(notification3)).toThrow(
      validationErrors.ErrorParse,
    );

    // Incorrect field type (actions)
    const notification4 = {
      data: {
        type: 'VaultShare',
        vaultId: vaultId,
        vaultName: 'vaultName' as VaultName,
        actions: 'clone + pull',
      },
      iss: nodeIdEncoded,
      isRead: false,
    };
    expect(() => notificationsUtils.parseNotification(notification4)).toThrow(
      validationErrors.ErrorParse,
    );

    // Incorrect field name (sendingId)
    const notification5 = {
      data: {
        type: 'General',
        message: 'message',
      },
      sendingId: nodeIdEncoded,
      isRead: false,
    };
    expect(() => notificationsUtils.parseNotification(notification5)).toThrow(
      validationErrors.ErrorParse,
    );
  });
});
