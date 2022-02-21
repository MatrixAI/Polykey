import type { Id } from '@matrixai/id';
import type { Opaque } from '../types';
import type { NodeIdEncoded } from '../nodes/types';
import type { VaultName, VaultActions, VaultIdEncoded } from '../vaults/types';

type NotificationId = Opaque<'NotificationId', Id>;

type NotificationIdGenerator = () => NotificationId;

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
  NotificationIdGenerator,
  NotificationData,
  Notification,
  SignedNotification,
  General,
  GestaltInvite,
  VaultShare,
};
