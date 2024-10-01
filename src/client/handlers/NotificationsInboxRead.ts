import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  NotificationInboxMessage,
  NotificationReadMessage,
} from '../types';
import type { NotificationId } from '../../ids/types';
import type NotificationsManager from '../../notifications/NotificationsManager';
import { ServerHandler } from '@matrixai/rpc';
import * as notificationsUtils from '../../notifications/utils';

class NotificationsInboxRead extends ServerHandler<
  {
    db: DB;
    notificationsManager: NotificationsManager;
  },
  ClientRPCRequestParams<NotificationReadMessage>,
  ClientRPCResponseResult<NotificationInboxMessage>
> {
  public handle(
    input: ClientRPCRequestParams<NotificationReadMessage>,
    _cancel,
    _meta,
    ctx,
  ): AsyncGenerator<ClientRPCResponseResult<NotificationInboxMessage>> {
    if (ctx.signal.aborted) throw ctx.signal.reason;
    const {
      db,
      notificationsManager,
    }: { db: DB; notificationsManager: NotificationsManager } = this.container;
    const { seek, seekEnd, unread, order, limit } = input;

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
      const notifications = notificationsManager.readInboxNotifications({
        seek: seek_,
        seekEnd: seekEnd_,
        unread,
        order,
        limit,
        tran,
      });
      for await (const notification of notifications) {
        if (ctx.signal.aborted) throw ctx.signal.reason;
        yield {
          notification: notification,
        };
      }
    });
  }
}

export default NotificationsInboxRead;
