import type * as grpc from '@grpc/grpc-js';
import type { DB } from '@matrixai/db';
import type { Authenticate } from '../types';
import type NodeManager from '../../nodes/NodeManager';
import type { NodeId } from '../../ids/types';
import type NotificationsManager from '../../notifications/NotificationsManager';
import type * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
import type Logger from '@matrixai/logger';
import * as grpcUtils from '../../grpc/utils';
import { validateSync } from '../../validation';
import * as validationUtils from '../../validation/utils';
import * as nodesErrors from '../../nodes/errors';
import { matchSync } from '../../utils';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import * as clientUtils from '../utils';

/**
 * Checks whether there is an existing Gestalt Invitation from the other node.
 * If not, send an invitation, if so, create a cryptolink claim between the
 * other node and host node.
 */
function nodesClaim({
  authenticate,
  nodeManager,
  notificationsManager,
  db,
  logger,
}: {
  authenticate: Authenticate;
  nodeManager: NodeManager;
  notificationsManager: NotificationsManager;
  db: DB;
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
      await db.withTransactionF(async (tran) => {
        const gestaltInvite = await notificationsManager.findGestaltInvite(
          nodeId,
          tran,
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
          await nodeManager.claimNode(nodeId, tran);
          response.setSuccess(true);
        }
      });
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientClientError(e, [
        nodesErrors.ErrorNodeGraphNodeIdNotFound,
      ]) && logger.error(`${nodesClaim.name}:${e}`);
      return;
    }
  };
}

export default nodesClaim;
