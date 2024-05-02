import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  NotificationOutboxMessage,
  NotificationOutboxReadMessage,
} from '../types';
import type { NotificationId } from '../../ids/types';
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
    const { seek, seekEnd, order, limit } = input;

    let seek_: NotificationId | number | undefined;
    if (seek != null) {
      seek_ =
        typeof seek === 'string'
          ? notificationsUtils.decodeNotificationId(seek)
          : seek;
    }
    let seekEnd_: NotificationId | number | undefined;
    if (seekEnd != null) {
      seekEnd_ =
        typeof seekEnd === 'string'
          ? notificationsUtils.decodeNotificationId(seekEnd)
          : seekEnd;
    }
    return db.withTransactionG(async function* (tran) {
      const notifications = notificationsManager.readOutboxNotifications({
        seek: seek_,
        seekEnd: seekEnd_,
        order,
        limit,
        tran,
      });
      for await (const notification of notifications) {
        if (ctx.signal.aborted) throw ctx.signal.reason;
        const taskInfo =
          await notificationsManager.getOutboxNotificationTaskInfoById(
            notificationsUtils.decodeNotificationId(
              notification.notificationIdEncoded,
            )!,
          );
        yield {
          notification: notification,
          taskMetadata:
            taskInfo != null
              ? {
                  created: taskInfo.created.getTime(),
                  scheduled: taskInfo.scheduled.getTime(),
                  remainingRetries: taskInfo.parameters[0].retries,
                }
              : undefined,
        };
      }
    });
  }
}

export default NotificationsOutboxRead;
