import type { Opaque } from '../types';
import type { NotificationId } from '../ids/types';
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

type Notification = {
  typ: 'notification';
  data: NotificationData;
  iss: string; // Issuer, sender NodeIdEncoded
  sub: string; // Subject, target NodeIdEncoded
  isRead: boolean;
};

type SignedNotification = Opaque<'SignedNotification', string>;

export type {
  NotificationId,
  NotificationData,
  Notification,
  SignedNotification,
  General,
  GestaltInvite,
  VaultShare,
};
