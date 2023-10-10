import type { NotificationSendMessage } from './types';
import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type { NodeId } from '../../ids';
import type { General } from '../../notifications/types';
import type NotificationsManager from '../../notifications/NotificationsManager';
import { UnaryHandler } from '@matrixai/rpc';
import { validateSync } from '../../validation';
import * as validationUtils from '../../validation/utils';
import { matchSync } from '../../utils';

class NotificationsSendHandler extends UnaryHandler<
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
          [['nodeId'], () => validationUtils.parseNodeId(value)],
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
    await notificationsManager.sendNotification(nodeId, data);

    return {};
  };
}

export { NotificationsSendHandler };
