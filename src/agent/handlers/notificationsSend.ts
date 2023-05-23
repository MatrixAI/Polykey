import type { DB } from '@matrixai/db';
import type KeyRing from '../../keys/KeyRing';
import type NotificationsManager from '../../notifications/NotificationsManager';
import type { SignedNotification } from '../../notifications/types';
import type { SignedNotificationEncoded } from './types';
import type { AgentRPCRequestParams, AgentRPCResponseResult } from '../types';
import { UnaryHandler } from '../../rpc/handlers';
import * as notificationsUtils from '../../notifications/utils';

class NotificationsSendHandler extends UnaryHandler<
  {
    db: DB;
    keyRing: KeyRing;
    notificationsManager: NotificationsManager;
  },
  AgentRPCRequestParams<SignedNotificationEncoded>,
  AgentRPCResponseResult
> {
  public async handle(
    input: AgentRPCRequestParams<SignedNotificationEncoded>,
  ): Promise<AgentRPCResponseResult> {
    const { db, keyRing, notificationsManager } = this.container;
    const notification = await notificationsUtils.verifyAndDecodeNotif(
      input.signedNotificationEncoded as SignedNotification,
      keyRing.getNodeId(),
    );
    await db.withTransactionF((tran) =>
      notificationsManager.receiveNotification(notification, tran),
    );
    return {};
  }
}

export { NotificationsSendHandler };
