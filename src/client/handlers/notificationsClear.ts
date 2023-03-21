import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type NotificationsManager from '../../notifications/NotificationsManager';
import type { DB } from '@matrixai/db';
import { UnaryHandler } from '../../rpc/handlers';
import { UnaryCaller } from '../../rpc/callers';

const notificationsClear = new UnaryCaller<
  ClientRPCRequestParams,
  ClientRPCResponseResult
>();

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

export { notificationsClear, NotificationsClearHandler };
