import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  NotificationInboxMessage,
  NotificationReadMessage,
} from '../types';
import type NotificationsManager from '../../notifications/NotificationsManager';
import { ServerHandler } from '@matrixai/rpc';

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
    const { db, notificationsManager } = this.container;
    return db.withTransactionG(async function* (tran) {
      const notifications = notificationsManager.readInboxNotifications({
        unread: input.unread,
        order: input.order,
        limit: input.limit,
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
