import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type NotificationsManager from '../../notifications/NotificationsManager';
import type Logger from '@matrixai/logger';
import * as grpcUtils from '../../grpc/utils';
import * as notificationsPB from '../../proto/js/polykey/v1/notifications/notifications_pb';

function notificationsRead({
  authenticate,
  notificationsManager,
  logger,
}: {
  authenticate: Authenticate;
  notificationsManager: NotificationsManager;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerUnaryCall<notificationsPB.Read, notificationsPB.List>,
    callback: grpc.sendUnaryData<notificationsPB.List>,
  ): Promise<void> => {
    try {
      const response = new notificationsPB.List();
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const unread = call.request.getUnread();
      const order = call.request.getOrder() as 'newest' | 'oldest';
      const numberField = call.request.getNumber();
      let number: number | 'all';
      if (numberField === 'all') {
        number = numberField;
      } else {
        number = parseInt(numberField);
      }
      const notifications = await notificationsManager.readNotifications({
        unread,
        number,
        order,
      });
      const notifMessages: Array<notificationsPB.Notification> = [];
      for (const notif of notifications) {
        const notificationsMessage = new notificationsPB.Notification();
        switch (notif.data.type) {
          case 'General': {
            const generalMessage = new notificationsPB.General();
            generalMessage.setMessage(notif.data.message);
            notificationsMessage.setGeneral(generalMessage);
            break;
          }
          case 'GestaltInvite': {
            notificationsMessage.setGestaltInvite('GestaltInvite');
            break;
          }
          case 'VaultShare': {
            const vaultShareMessage = new notificationsPB.Share();
            vaultShareMessage.setVaultId(notif.data.vaultId);
            vaultShareMessage.setVaultName(notif.data.vaultName);
            vaultShareMessage.setActionsList(Object.keys(notif.data.actions));
            notificationsMessage.setVaultShare(vaultShareMessage);
            break;
          }
        }
        notificationsMessage.setSenderId(notif.senderId);
        notificationsMessage.setIsRead(notif.isRead);
        notifMessages.push(notificationsMessage);
      }
      response.setNotificationList(notifMessages);
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      logger.error(e);
      return;
    }
  };
}

export default notificationsRead;
