import type { Opaque } from '../types';
import type { NotificationId, NotificationIdEncoded } from '../ids/types';
import type { VaultName, VaultActions, VaultIdEncoded } from '../vaults/types';

type GestaltInvite = {
  type: 'GestaltInvite';
};
type VaultShare = {
  type: 'VaultShare';
  vaultId: VaultIdEncoded;
  vaultName: VaultName;
  actions: VaultActions;
};
type General = {
  type: 'General';
  message: string;
};

type NotificationData = GestaltInvite | VaultShare | General;

type NotificationBase = {
  typ: 'notification';
  data: NotificationData;
  iss: string; // Issuer, sender NodeIdEncoded
  sub: string; // Subject, target NodeIdEncoded
  isRead: boolean;
};

type NotificationDB = NotificationBase & {
  peerNotificationIdEncoded?: NotificationIdEncoded;
};

type Notification = NotificationDB & {
  notificationIdEncoded: NotificationIdEncoded;
};

type SignedNotification = Opaque<'SignedNotification', string>;

export type {
  NotificationId,
  NotificationData,
  NotificationBase,
  NotificationDB,
  Notification,
  SignedNotification,
  General,
  GestaltInvite,
  VaultShare,
};
