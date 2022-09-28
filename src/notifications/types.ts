import type { Opaque } from '../types';
import type { NotificationId, NodeIdEncoded } from '../ids/types';
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
  data: NotificationData;
  senderId: NodeIdEncoded;
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
