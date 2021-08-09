import type { Opaque } from '../types';
import type { NodeId } from '../nodes/types';

type NotificationId = Opaque<'NotificationId', string>;

type Notification = {
  senderId: NodeId;
  message: string;
  isRead: boolean;
};

type SignedNotification = Opaque<'SignedNotification', string>;

export type { NotificationId, Notification, SignedNotification };
