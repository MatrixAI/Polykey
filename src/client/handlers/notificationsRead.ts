import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type { DB } from '@matrixai/db';
import type NotificationsManager from '../../notifications/NotificationsManager';
import type { NotificationMessage, NotificationReadMessage } from './types';
import { ServerHandler } from '../../RPC/handlers';
import { ServerCaller } from '../../RPC/callers';

const notificationsRead = new ServerCaller<
  ClientRPCRequestParams<NotificationReadMessage>,
  ClientRPCResponseResult<NotificationMessage>
>();

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
      yield {
        notification: notification,
      };
    }
  }
}

export { notificationsRead, NotificationsReadHandler };
