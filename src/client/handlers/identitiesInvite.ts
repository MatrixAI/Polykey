import type { RPCRequestParams, RPCResponseResult } from '../types';
import type { NodeId } from 'ids/index';
import type NotificationsManager from 'notifications/NotificationsManager';
import type Logger from '@matrixai/logger';
import type ACL from 'acl/ACL';
import type { ClaimNodeMessage } from './types';
import { UnaryCaller } from '../../RPC/callers';
import { UnaryHandler } from '../../RPC/handlers';
import { validateSync } from '../../validation/index';
import { matchSync } from '../../utils/index';
import * as validationUtils from '../../validation/utils';

const identitiesInvite = new UnaryCaller<
  RPCRequestParams<ClaimNodeMessage>,
  RPCResponseResult
>();

class IdentitiesInviteHandler extends UnaryHandler<
  {
    acl: ACL;
    notificationsManager: NotificationsManager;
    logger: Logger;
  },
  RPCRequestParams<ClaimNodeMessage>,
  RPCResponseResult
> {
  public async handle(
    input: RPCRequestParams<ClaimNodeMessage>,
  ): Promise<RPCResponseResult> {
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

export { identitiesInvite, IdentitiesInviteHandler };
