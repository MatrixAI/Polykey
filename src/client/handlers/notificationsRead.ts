import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type { DB } from '@matrixai/db';
import type NotificationsManager from '../../notifications/NotificationsManager';
import type { NotificationMessage, NotificationReadMessage } from './types';
import { ServerHandler } from '../../rpc/handlers';

class NotificationsReadHandler extends ServerHandler<
  {
    db: DB;
    notificationsManager: NotificationsManager;
  },
  ClientRPCRequestParams<NotificationReadMessage>,
  ClientRPCResponseResult<NotificationMessage>
> {
  public async *handle(
    input: ClientRPCRequestParams<NotificationReadMessage>,
    _,
    ctx,
  ): AsyncGenerator<ClientRPCResponseResult<NotificationMessage>> {
    const { db, notificationsManager } = this.container;

    const notifications = await db.withTransactionF((tran) =>
      notificationsManager.readNotifications({
        unread: input.unread,
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

export { NotificationsReadHandler };
