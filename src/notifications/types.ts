import type { Opaque } from '../types';
import type { NodeId } from '../nodes/types';
import type { VaultName, VaultActions } from '../vaults/types';
import type { Id, IdString } from '../GenericIdTypes';

type NotificationId = Opaque<'NotificationId', Id>;

type NotificationIdGenerator = () => NotificationId;

type GestaltInvite = {
  type: 'GestaltInvite';
};
type VaultShare = {
  type: 'VaultShare';
  vaultId: IdString;
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
  NotificationIdGenerator,
  NotificationData,
  Notification,
  SignedNotification,
  General,
  GestaltInvite,
  VaultShare,
};
