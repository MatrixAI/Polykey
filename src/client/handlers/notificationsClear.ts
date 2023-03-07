import type { RPCRequestParams, RPCResponseResult } from '../types';
import type NotificationsManager from '../../notifications/NotificationsManager';
import type { DB } from '@matrixai/db';
import { UnaryHandler } from '../../RPC/handlers';
import { UnaryCaller } from '../../RPC/callers';

const notificationsClear = new UnaryCaller<
  RPCRequestParams,
  RPCResponseResult
>();

class NotificationsClearHandler extends UnaryHandler<
  {
    db: DB;
    notificationsManager: NotificationsManager;
  },
  RPCRequestParams,
  RPCResponseResult
> {
  public async handle(): Promise<RPCResponseResult> {
    const { db, notificationsManager } = this.container;
    await db.withTransactionF((tran) =>
      notificationsManager.clearNotifications(tran),
    );
    return {};
  }
}

export { notificationsClear, NotificationsClearHandler };
