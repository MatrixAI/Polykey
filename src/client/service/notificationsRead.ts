import type * as grpc from '@grpc/grpc-js';
import type { DB } from '@matrixai/db';
import type { Authenticate } from '../types';
import type NotificationsManager from '../../notifications/NotificationsManager';
import type Logger from '@matrixai/logger';
import * as grpcUtils from '../../grpc/utils';
import * as notificationsPB from '../../proto/js/polykey/v1/notifications/notifications_pb';
import * as clientUtils from '../utils';

function notificationsRead({
  authenticate,
  notificationsManager,
  db,
  logger,
}: {
  authenticate: Authenticate;
  notificationsManager: NotificationsManager;
  db: DB;
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
      const notifications = await db.withTransactionF((tran) =>
        notificationsManager.readNotifications({
          unread,
          number,
          order,
          tran,
        }),
      );
      const notifMessages: Array<notificationsPB.AgentNotification> = [];
      for (const notif of notifications) {
        const notificationsMessage = new notificationsPB.AgentNotification();
        notificationsMessage.setContent(JSON.stringify(notif));
        notifMessages.push(notificationsMessage);
      }
      response.setNotificationList(notifMessages);
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientClientError(e) &&
        logger.error(`${notificationsRead.name}:${e}`);
      return;
    }
  };
}

export default notificationsRead;
