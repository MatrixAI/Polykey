import type * as grpc from '@grpc/grpc-js';
import type { NotificationsManager } from '../../notifications';
import type * as notificationsPB from '../../proto/js/polykey/v1/notifications/notifications_pb';
import { utils as grpcUtils } from '../../grpc';
import {
  utils as notificationsUtils,
  errors as notificationsErrors,
} from '../../notifications';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';

function notificationsSend({
  notificationsManager,
}: {
  notificationsManager: NotificationsManager;
}) {
  return async (
    call: grpc.ServerUnaryCall<
      notificationsPB.AgentNotification,
      utilsPB.EmptyMessage
    >,
    callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
  ): Promise<void> => {
    const response = new utilsPB.EmptyMessage();
    try {
      const jwt = call.request.getContent();
      const notification = await notificationsUtils.verifyAndDecodeNotif(jwt);
      await notificationsManager.receiveNotification(notification);
    } catch (err) {
      if (err instanceof notificationsErrors.ErrorNotifications) {
        callback(grpcUtils.fromError(err), response);
      } else {
        throw err;
      }
    }
    callback(null, response);
  };
}

export default notificationsSend;
