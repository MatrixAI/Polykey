import type { DB } from '@matrixai/db';
import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type NotificationsManager from '../../notifications/NotificationsManager';
import { UnaryHandler } from '@matrixai/rpc';

class NotificationsOutboxClear extends UnaryHandler<
  {
    db: DB;
    notificationsManager: NotificationsManager;
  },
  ClientRPCRequestParams,
  ClientRPCResponseResult
> {
  public handle = async (): Promise<ClientRPCResponseResult> => {
    const {
      db,
      notificationsManager,
    }: { db: DB; notificationsManager: NotificationsManager } = this.container;
    await db.withTransactionF((tran) =>
      notificationsManager.clearOutboxNotifications(tran),
    );
    return {};
  };
}

export default NotificationsOutboxClear;
