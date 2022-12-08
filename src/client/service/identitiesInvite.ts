import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { NodeId } from '../../ids/types';
import type NotificationsManager from '../../notifications/NotificationsManager';
import type * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
import type Logger from '@matrixai/logger';
import type ACL from '../../acl/ACL';
import * as grpcUtils from '../../grpc/utils';
import { validateSync } from '../../validation';
import * as validationUtils from '../../validation/utils';
import * as nodesErrors from '../../nodes/errors';
import { matchSync } from '../../utils';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import * as clientUtils from '../utils';

/**
 * Adds permission for a node to claim us using nodes claim.
 * Also sends a notification alerting the node of the new permission.
 */
function identitiesInvite({
  authenticate,
  notificationsManager,
  acl,
  logger,
}: {
  authenticate: Authenticate;
  notificationsManager: NotificationsManager;
  acl: ACL;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerUnaryCall<nodesPB.Claim, utilsPB.StatusMessage>,
    callback: grpc.sendUnaryData<utilsPB.StatusMessage>,
  ): Promise<void> => {
    try {
      const response = new utilsPB.StatusMessage();
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
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
          nodeId: call.request.getNodeId(),
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
      response.setSuccess(true);
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientClientError(e, [
        nodesErrors.ErrorNodeGraphNodeIdNotFound,
      ]) && logger.error(`${identitiesInvite.name}:${e}`);
      return;
    }
  };
}

export default identitiesInvite;
