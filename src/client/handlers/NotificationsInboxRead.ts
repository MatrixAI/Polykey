import type { ContextTimed } from '@matrixai/contexts';
import type { DB } from '@matrixai/db';
import type { JSONValue } from '@matrixai/rpc';
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
    _cancel: (reason?: any) => void,
    _meta: Record<string, JSONValue>,
    ctx: ContextTimed,
  ): AsyncGenerator<ClientRPCResponseResult<NotificationInboxMessage>> {
    const {
      db,
      notificationsManager,
    }: {
      db: DB;
      notificationsManager: NotificationsManager;
    } = this.container;
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
        ctx.signal.throwIfAborted();
        yield {
          notification: notification,
        };
      }
    });
  }
}

export default NotificationsInboxRead;
