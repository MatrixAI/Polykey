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

class NotificationsInboxRemove extends UnaryHandler<
  {
    db: DB;
    notificationsManager: NotificationsManager;
  },
  ClientRPCRequestParams,
  ClientRPCResponseResult
> {
  public handle = async (
    input: ClientRPCRequestParams<NotificationRemoveMessage>,
  ): Promise<ClientRPCResponseResult> => {
    const { db, notificationsManager } = this.container;
    const notificationId = notificationsUtils.decodeNotificationId(
      input.notificationIdEncoded,
    );
    if (notificationId == null) {
      throw new validationErrors.ErrorParse(
        '`notificationIdEncoded` property must be an encoded notification ID',
      );
    }
    await db.withTransactionF(async (tran) =>
      notificationsManager.removeInboxNotification(notificationId, tran),
    );
    return {};
  };
}

export default NotificationsInboxRemove;
