import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { NodeManager } from '../../nodes';
import type { NotificationData } from '../../notifications/types';
import type { NotificationsManager } from '../../notifications';
import type * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
import { utils as nodesUtils } from '../../nodes';
import { utils as grpcUtils } from '../../grpc';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';

/**
 * Checks whether there is an existing Gestalt Invitation from the other node.
 * If not, send an invitation, if so, create a cryptolink claim between the
 * other node and host node.
 */
function nodesClaim({
  nodeManager,
  notificationsManager,
  authenticate,
}: {
  nodeManager: NodeManager;
  notificationsManager: NotificationsManager;
  authenticate: Authenticate;
}) {
  return async (
    call: grpc.ServerUnaryCall<nodesPB.Claim, utilsPB.StatusMessage>,
    callback: grpc.sendUnaryData<utilsPB.StatusMessage>,
  ): Promise<void> => {
    const response = new utilsPB.StatusMessage();
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const remoteNodeId = nodesUtils.decodeNodeId(call.request.getNodeId());
      const gestaltInvite = await notificationsManager.findGestaltInvite(
        remoteNodeId,
      );
      // Check first whether there is an existing gestalt invite from the remote node
      // or if we want to force an invitation rather than a claim
      if (gestaltInvite === undefined || call.request.getForceInvite()) {
        const data = {
          type: 'GestaltInvite',
        } as NotificationData;
        await notificationsManager.sendNotification(remoteNodeId, data);
        response.setSuccess(false);
      } else {
        // There is an existing invitation, and we want to claim the node
        await nodeManager.claimNode(remoteNodeId);
        response.setSuccess(true);
      }
      callback(null, response);
      return;
    } catch (err) {
      callback(grpcUtils.fromError(err), null);
      return;
    }
  };
}

export default nodesClaim;
