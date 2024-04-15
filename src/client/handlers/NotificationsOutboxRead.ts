import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  NotificationMessage,
  NotificationOutboxReadMessage,
} from '../types';
import type NotificationsManager from '../../notifications/NotificationsManager';
import { ServerHandler } from '@matrixai/rpc';

class NotificationsOutboxRead extends ServerHandler<
  {
    db: DB;
    notificationsManager: NotificationsManager;
  },
  ClientRPCRequestParams<NotificationOutboxReadMessage>,
  ClientRPCResponseResult<NotificationMessage>
> {
  public async *handle(
    input: ClientRPCRequestParams<NotificationOutboxReadMessage>,
    _cancel,
    _meta,
    ctx,
  ): AsyncGenerator<ClientRPCResponseResult<NotificationMessage>> {
    if (ctx.signal.aborted) throw ctx.signal.reason;
    const { db, notificationsManager } = this.container;
    const notifications = await db.withTransactionF((tran) =>
      notificationsManager.readOutboxNotifications({
        number: input.number,
        order: input.order,
        tran,
      }),
    );
    for (const notification of notifications) {
      if (ctx.signal.aborted) throw ctx.signal.reason;
      yield {
        notification: notification,
      };
    }
  }
}

export default NotificationsOutboxRead;
