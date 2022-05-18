import type * as grpc from '@grpc/grpc-js';
import type NotificationsManager from '../../notifications/NotificationsManager';
import type * as notificationsPB from '../../proto/js/polykey/v1/notifications/notifications_pb';
import type Logger from '@matrixai/logger';
import type { DB } from '@matrixai/db';
import * as grpcUtils from '../../grpc/utils';
import * as notificationsUtils from '../../notifications/utils';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';

function notificationsSend({
  notificationsManager,
  db,
  logger,
}: {
  notificationsManager: NotificationsManager;
  db: DB;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerUnaryCall<
      notificationsPB.AgentNotification,
      utilsPB.EmptyMessage
    >,
    callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
  ): Promise<void> => {
    try {
      const jwt = call.request.getContent();
      const notification = await notificationsUtils.verifyAndDecodeNotif(jwt);
      await db.withTransactionF(async (tran) => {
        await notificationsManager.receiveNotification(notification, tran);
      });
      const response = new utilsPB.EmptyMessage();
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e, true));
      logger.error(e);
      return;
    }
  };
}

export default notificationsSend;
