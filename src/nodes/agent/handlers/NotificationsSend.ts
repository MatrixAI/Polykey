import type { DB } from '@matrixai/db';
import type {
  AgentRPCRequestParams,
  AgentRPCResponseResult,
  SignedNotificationEncoded,
} from '../types.js';
import type KeyRing from '../../../keys/KeyRing.js';
import type NotificationsManager from '../../../notifications/NotificationsManager.js';
import { UnaryHandler } from '@matrixai/rpc';
import * as notificationsUtils from '../../../notifications/utils.js';

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
    const {
      db,
      keyRing,
      notificationsManager,
    }: {
      db: DB;
      keyRing: KeyRing;
      notificationsManager: NotificationsManager;
    } = this.container;
    const notification = await notificationsUtils.verifyAndDecodeNotif(
      input.signedNotificationEncoded,
      keyRing.getNodeId(),
    );
    await db.withTransactionF((tran) =>
      notificationsManager.receiveNotification(notification, tran),
    );
    return {};
  };
}

export default NotificationsSend;
