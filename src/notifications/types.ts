import type { Opaque } from '../types';
import type { NodeId } from '../nodes/types';
import type { VaultId, VaultName, VaultActions } from '../vaults/types';

type NotificationId = Opaque<'NotificationId', string>;

type GestaltInvite = {
  type: 'GestaltInvite';
};
type VaultShare = {
  type: 'VaultShare';
  vaultId: VaultId;
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
  senderId: NodeId;
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
