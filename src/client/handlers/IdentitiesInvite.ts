import type Logger from '@matrixai/logger';
import type {
  ClaimNodeMessage,
  ClientRPCRequestParams,
  ClientRPCResponseResult,
} from '../types';
import type { NodeId } from '../../ids';
import type NotificationsManager from '../../notifications/NotificationsManager';
import type ACL from '../../acl/ACL';
import { UnaryHandler } from '@matrixai/rpc';
import * as ids from '../../ids';
import { validateSync } from '../../validation';
import { matchSync } from '../../utils';

class IdentitiesInvite extends UnaryHandler<
  {
    acl: ACL;
    notificationsManager: NotificationsManager;
    logger: Logger;
  },
  ClientRPCRequestParams<ClaimNodeMessage>,
  ClientRPCResponseResult
> {
  public handle = async (
    input: ClientRPCRequestParams<ClaimNodeMessage>,
  ): Promise<ClientRPCResponseResult> => {
    const {
      acl,
      notificationsManager,
      logger,
    }: {
      acl: ACL;
      notificationsManager: NotificationsManager;
      logger: Logger;
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
    // Sending the notification, we don't care if it fails
    try {
      await notificationsManager.sendNotification({
        nodeId,
        data: {
          type: 'GestaltInvite',
        },
      });
    } catch {
      logger.warn('Failed to send gestalt invitation to target node');
    }
    // Allowing claims from that gestalt
    await acl.setNodeAction(nodeId, 'claim');
    return {};
  };
}

export default IdentitiesInvite;
