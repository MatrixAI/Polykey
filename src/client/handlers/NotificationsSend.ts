import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  NotificationSendMessage,
} from '../types';
import type { NodeId } from '../../ids';
import type { General } from '../../notifications/types';
import type NotificationsManager from '../../notifications/NotificationsManager';
import { UnaryHandler } from '@matrixai/rpc';
import * as ids from '../../ids';
import { validateSync } from '../../validation';
import { matchSync } from '../../utils';

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
    const { notificationsManager } = this.container;
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
