import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  NotificationOutboxMessage,
  NotificationOutboxReadMessage,
} from '../types';
import type NotificationsManager from '../../notifications/NotificationsManager';
import { ServerHandler } from '@matrixai/rpc';
import * as notificationsUtils from '../../notifications/utils';

class NotificationsOutboxRead extends ServerHandler<
  {
    db: DB;
    notificationsManager: NotificationsManager;
  },
  ClientRPCRequestParams<NotificationOutboxReadMessage>,
  ClientRPCResponseResult<NotificationOutboxMessage>
> {
  public handle(
    input: ClientRPCRequestParams<NotificationOutboxReadMessage>,
    _cancel,
    _meta,
    ctx,
  ): AsyncGenerator<ClientRPCResponseResult<NotificationOutboxMessage>> {
    if (ctx.signal.aborted) throw ctx.signal.reason;
    const { db, notificationsManager } = this.container;
    return db.withTransactionG(async function* (tran) {
      const notifications = notificationsManager.readOutboxNotifications({
        number: input.number,
        order: input.order,
        tran,
      });
      for await (const notification of notifications) {
        if (ctx.signal.aborted) throw ctx.signal.reason;
        const taskInfo =
          await notificationsManager.getOutboxNotificationTaskInfoById(
            notificationsUtils.decodeNotificationId(
              notification.notificationIdEncoded,
            )!,
            tran,
          );
        yield {
          notification: notification,
          taskMetadata:
            taskInfo != null
              ? {
                  remainingRetries: taskInfo.parameters[0].retries,
                  created: taskInfo.created.getTime(),
                  scheduled: taskInfo.scheduled.getTime(),
                }
              : undefined,
        };
      }
    });
  }
}

export default NotificationsOutboxRead;
