import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { NodeManager } from '../../nodes';
import type { NodeId } from '../../nodes/types';
import type { NotificationsManager } from '../../notifications';
import type * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
import type Logger from '@matrixai/logger';
import { utils as grpcUtils } from '../../grpc';
import { validateSync, utils as validationUtils } from '../../validation';
import { matchSync } from '../../utils';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';

/**
 * Checks whether there is an existing Gestalt Invitation from the other node.
 * If not, send an invitation, if so, create a cryptolink claim between the
 * other node and host node.
 */
function nodesClaim({
  authenticate,
  nodeManager,
  notificationsManager,
  logger,
}: {
  authenticate: Authenticate;
  nodeManager: NodeManager;
  notificationsManager: NotificationsManager;
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
      const gestaltInvite = await notificationsManager.findGestaltInvite(
        nodeId,
      );
      // Check first whether there is an existing gestalt invite from the remote node
      // or if we want to force an invitation rather than a claim
      if (gestaltInvite === undefined || call.request.getForceInvite()) {
        await notificationsManager.sendNotification(nodeId, {
          type: 'GestaltInvite',
        });
        response.setSuccess(false);
      } else {
        // There is an existing invitation, and we want to claim the node
        await nodeManager.claimNode(nodeId);
        response.setSuccess(true);
      }
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      logger.error(e);
      return;
    }
  };
}

export default nodesClaim;
