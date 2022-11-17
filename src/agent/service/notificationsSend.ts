import type * as grpc from '@grpc/grpc-js';
import type NotificationsManager from '../../notifications/NotificationsManager';
import type * as notificationsPB from '../../proto/js/polykey/v1/notifications/notifications_pb';
import type Logger from '@matrixai/logger';
import type { DB } from '@matrixai/db';
import * as grpcUtils from '../../grpc/utils';
import * as notificationsUtils from '../../notifications/utils';
import * as notificationsErrors from '../../notifications/errors';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import * as agentUtils from '../utils';
import { SignedNotification } from '../../notifications/types';
import KeyRing from '../../keys/KeyRing';

function notificationsSend({
  notificationsManager,
  db,
  keyRing,
  logger,
}: {
  notificationsManager: NotificationsManager;
  db: DB;
  keyRing: KeyRing;
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
      const signedNotification = call.request.getContent() as SignedNotification;
      const notification = await notificationsUtils.verifyAndDecodeNotif(signedNotification, keyRing.getNodeId());
      await db.withTransactionF((tran) =>
        notificationsManager.receiveNotification(notification, tran),
      );
      const response = new utilsPB.EmptyMessage();
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e, true));
      !agentUtils.isAgentClientError(e, [
        notificationsErrors.ErrorNotificationsInvalidType,
        notificationsErrors.ErrorNotificationsValidationFailed,
        notificationsErrors.ErrorNotificationsParse,
        notificationsErrors.ErrorNotificationsPermissionsNotFound,
      ]) && logger.error(`${notificationsSend.name}:${e}`);
      return;
    }
  };
}

export default notificationsSend;
