import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  NotificationMessage,
  NotificationReadMessage,
} from '../types';
import type NotificationsManager from '../../notifications/NotificationsManager';
import { ServerHandler } from '@matrixai/rpc';

class NotificationsRead extends ServerHandler<
  {
    db: DB;
    notificationsManager: NotificationsManager;
  },
  ClientRPCRequestParams<NotificationReadMessage>,
  ClientRPCResponseResult<NotificationMessage>
> {
  public async *handle(
    input: ClientRPCRequestParams<NotificationReadMessage>,
    _cancel,
    _meta,
    ctx,
  ): AsyncGenerator<ClientRPCResponseResult<NotificationMessage>> {
    if (ctx.signal.aborted) throw ctx.signal.reason;
    const { db, notificationsManager } = this.container;
    const notifications = await db.withTransactionF(async (tran) =>
      notificationsManager.readNotifications({
        unread: input.unread,
        number: input.number,
        order: input.order,
        tran,
      }),
    );
    for await (const notification of notifications) {
      if (ctx.signal.aborted) throw ctx.signal.reason;
      yield {
        notification: notification,
      };
    }
  }
}

export default NotificationsRead;
