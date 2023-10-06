import type Logger from '@matrixai/logger';
import type { ClaimNodeMessage } from './types';
import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type { NodeId } from '../../ids/index';
import type NotificationsManager from '../../notifications/NotificationsManager';
import type ACL from '../../acl/ACL';
import { UnaryHandler } from '../../rpc/handlers';
import { validateSync } from '../../validation/index';
import * as validationUtils from '../../validation/utils';
import { matchSync } from '../../utils/index';

class IdentitiesInviteHandler extends UnaryHandler<
  {
    acl: ACL;
    notificationsManager: NotificationsManager;
    logger: Logger;
  },
  ClientRPCRequestParams<ClaimNodeMessage>,
  ClientRPCResponseResult
> {
  public handle = async(
    input: ClientRPCRequestParams<ClaimNodeMessage>,
  ): Promise<ClientRPCResponseResult> => {
    const { acl, notificationsManager, logger } = this.container;
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
    // Sending the notification, we don't care if it fails
    try {
      await notificationsManager.sendNotification(nodeId, {
        type: 'GestaltInvite',
      });
    } catch {
      logger.warn('Failed to send gestalt invitation to target node');
    }
    // Allowing claims from that gestalt
    await acl.setNodeAction(nodeId, 'claim');
    return {};
  }
}

export { IdentitiesInviteHandler };
