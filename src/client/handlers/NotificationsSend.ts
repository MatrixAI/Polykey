import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  NotificationSendMessage,
} from '../types.js';
import type { NodeId } from '../../ids/index.js';
import type { General } from '../../notifications/types.js';
import type NotificationsManager from '../../notifications/NotificationsManager.js';
import { UnaryHandler } from '@matrixai/rpc';
import * as ids from '../../ids/index.js';
import { validateSync } from '../../validation/index.js';
import { matchSync } from '../../utils/index.js';

class NotificationsSend extends UnaryHandler<
  {
    notificationsManager: NotificationsManager;
  },
  ClientRPCRequestParams<NotificationSendMessage>,
  ClientRPCResponseResult
> {
  public handle = async (
    input: ClientRPCRequestParams<NotificationSendMessage>,
  ): Promise<ClientRPCResponseResult> => {
    const {
      notificationsManager,
    }: {
      notificationsManager: NotificationsManager;
    } = this.container;
    const {
      nodeId,
    }: {
      nodeId: NodeId;
    } = validateSync(
      (keyPath, value) => {
        return matchSync(keyPath)(
          [['nodeId'], () => ids.parseNodeId(value)],
          () => value,
        );
      },
      {
        nodeId: input.nodeIdEncoded,
      },
    );
    const data: General = {
      type: 'General',
      message: input.message,
    };

    const result = await notificationsManager.sendNotification({
      nodeId,
      data,
      retries: input.retries,
    });
    if (input.blocking) {
      await result.sendP;
    }
    return {};
  };
}

export default NotificationsSend;
