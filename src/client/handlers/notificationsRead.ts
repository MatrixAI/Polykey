import type { RPCRequestParams, RPCResponseResult } from '../types';
import type { DB } from '@matrixai/db';
import type NotificationsManager from '../../notifications/NotificationsManager';
import type { NotificationMessage, NotificationReadMessage } from './types';
import { ServerHandler } from '../../RPC/handlers';
import { ServerCaller } from '../../RPC/callers';

const notificationsRead = new ServerCaller<
  RPCRequestParams<NotificationReadMessage>,
  RPCResponseResult<NotificationMessage>
>();

class NotificationsReadHandler extends ServerHandler<
  {
    db: DB;
    notificationsManager: NotificationsManager;
  },
  RPCRequestParams<NotificationReadMessage>,
  RPCResponseResult<NotificationMessage>
> {
  public async *handle(
    input: RPCRequestParams<NotificationReadMessage>,
  ): AsyncGenerator<RPCResponseResult<NotificationMessage>> {
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
      yield {
        notification: notification,
      };
    }
  }
}

export { notificationsRead, NotificationsReadHandler };
