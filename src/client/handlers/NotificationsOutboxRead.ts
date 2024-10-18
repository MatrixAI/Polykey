import type { ContextTimed } from '@matrixai/contexts';
import type { DB } from '@matrixai/db';
import type { JSONValue } from '@matrixai/rpc';
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
    _cancel: (reason?: any) => void,
    _meta: Record<string, JSONValue>,
    ctx: ContextTimed,
  ): AsyncGenerator<ClientRPCResponseResult<NotificationOutboxMessage>> {
    const {
      db,
      notificationsManager,
    }: {
      db: DB;
      notificationsManager: NotificationsManager;
    } = this.container;
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
        ctx.signal.throwIfAborted();
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
