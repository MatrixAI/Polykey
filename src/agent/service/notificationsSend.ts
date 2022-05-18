import type * as grpc from '@grpc/grpc-js';
import type NotificationsManager from '../../notifications/NotificationsManager';
import type * as notificationsPB from '../../proto/js/polykey/v1/notifications/notifications_pb';
import type Logger from '@matrixai/logger';
import * as grpcUtils from '../../grpc/utils';
import * as notificationsUtils from '../../notifications/utils';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';

function notificationsSend({
  notificationsManager,
  logger,
}: {
  notificationsManager: NotificationsManager;
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
      const response = new utilsPB.EmptyMessage();
      const jwt = call.request.getContent();
      const notification = await notificationsUtils.verifyAndDecodeNotif(jwt);
      await notificationsManager.receiveNotification(notification);
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
