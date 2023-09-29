import type { DB } from '@matrixai/db';
import type {
  AgentRPCRequestParams,
  AgentRPCResponseResult,
  SignedNotificationEncoded,
} from '../types';
import type KeyRing from '../../../keys/KeyRing';
import type NotificationsManager from '../../../notifications/NotificationsManager';
import type { SignedNotification } from '../../../notifications/types';
import * as notificationsUtils from '../../../notifications/utils';
import { UnaryHandler } from '../../../rpc/handlers';

/**
 * Sends a notification to a node
 */
class NotificationsSend extends UnaryHandler<
  {
    db: DB;
    keyRing: KeyRing;
    notificationsManager: NotificationsManager;
  },
  AgentRPCRequestParams<SignedNotificationEncoded>,
  AgentRPCResponseResult
> {
  public handle = async (
    input: AgentRPCRequestParams<SignedNotificationEncoded>,
  ): Promise<AgentRPCResponseResult> => {
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

export default NotificationsSend;
