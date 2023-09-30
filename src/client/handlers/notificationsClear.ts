import type { DB } from '@matrixai/db';
import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type NotificationsManager from '../../notifications/NotificationsManager';
import { UnaryHandler } from '@matrixai/rpc/dist/handlers';

class NotificationsClearHandler extends UnaryHandler<
  {
    db: DB;
    notificationsManager: NotificationsManager;
  },
  ClientRPCRequestParams,
  ClientRPCResponseResult
> {
  public async handle(): Promise<ClientRPCResponseResult> {
    const { db, notificationsManager } = this.container;
    await db.withTransactionF((tran) =>
      notificationsManager.clearNotifications(tran),
    );
    return {};
  }
}

export { NotificationsClearHandler };
