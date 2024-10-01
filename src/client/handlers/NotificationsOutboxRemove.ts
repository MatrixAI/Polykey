import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  NotificationRemoveMessage,
} from '../types';
import type NotificationsManager from '../../notifications/NotificationsManager';
import { UnaryHandler } from '@matrixai/rpc';
import * as notificationsUtils from '../../notifications/utils';
import * as validationErrors from '../../validation/errors';

class NotificationsOutboxRemove extends UnaryHandler<
  {
    db: DB;
    notificationsManager: NotificationsManager;
  },
  ClientRPCRequestParams<NotificationRemoveMessage>,
  ClientRPCResponseResult
> {
  public handle = async (
    input: ClientRPCRequestParams<NotificationRemoveMessage>,
  ): Promise<ClientRPCResponseResult> => {
    const {
      db,
      notificationsManager,
    }: { db: DB; notificationsManager: NotificationsManager } = this.container;
    const notificationId = notificationsUtils.decodeNotificationId(
      input.notificationIdEncoded,
    );
    if (notificationId == null) {
      throw new validationErrors.ErrorParse(
        'notificationIdEncoded property must be an encoded notification ID',
      );
    }
    await db.withTransactionF(async (tran) =>
      notificationsManager.removeOutboxNotification(notificationId, tran),
    );
    return {};
  };
}

export default NotificationsOutboxRemove;
