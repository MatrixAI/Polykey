import type { NodeManager } from '../nodes';
import type { NodeAddress } from '../nodes/types';
import type { NotificationData } from '../notifications/types';
import type { NotificationsManager } from '../notifications';

import type * as grpc from '@grpc/grpc-js';
import type * as utils from '../client/utils';
import * as utilsPB from '../proto/js/polykey/v1/utils/utils_pb';
import * as nodesPB from '../proto/js/polykey/v1/nodes/nodes_pb';
import * as nodesUtils from '../nodes/utils';
import * as grpcUtils from '../grpc/utils';
import * as nodesErrors from '../nodes/errors';
import { makeNodeId } from '../nodes/utils';

const createNodesRPC = ({
  nodeManager,
  authenticate,
  notificationsManager,
}: {
  nodeManager: NodeManager;
  authenticate: utils.Authenticate;
  notificationsManager: NotificationsManager;
}) => {
  return {
    /**
     * Adds a node ID -> node address mapping into the buckets database.
     * This is an unrestricted add: no validity checks are made for the correctness
     * of the passed ID or host/port.
     */
    nodesAdd: async (
      call: grpc.ServerUnaryCall<nodesPB.NodeAddress, utilsPB.EmptyMessage>,
      callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
    ): Promise<void> => {
      const response = new utilsPB.EmptyMessage();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);
        // Validate the passed node ID and host
        const validNodeId = nodesUtils.isNodeId(call.request.getNodeId());
        if (!validNodeId) {
          throw new nodesErrors.ErrorInvalidNodeId();
        }
        const validHost = nodesUtils.isValidHost(
          call.request.getAddress()!.getHost(),
        );
        if (!validHost) {
          throw new nodesErrors.ErrorInvalidHost();
        }
        await nodeManager.setNode(makeNodeId(call.request.getNodeId()), {
          ip: call.request.getAddress()!.getHost(),
          port: call.request.getAddress()!.getPort(),
        } as NodeAddress);
        callback(null, response);
        return;
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
        return;
      }
    },
    /**
     * Checks if a remote node is online.
     */
    nodesPing: async (
      call: grpc.ServerUnaryCall<nodesPB.Node, utilsPB.StatusMessage>,
      callback: grpc.sendUnaryData<utilsPB.StatusMessage>,
    ): Promise<void> => {
      const response = new utilsPB.StatusMessage();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

        const status = await nodeManager.pingNode(
          makeNodeId(call.request.getNodeId()),
        );
        response.setSuccess(status);
        callback(null, response);
        return;
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
        return;
      }
    },
    /**
     * Checks whether there is an existing Gestalt Invitation from the other node.
     * If not, send an invitation, if so, create a cryptolink claim between the
     * other node and host node.
     */
    nodesClaim: async (
      call: grpc.ServerUnaryCall<nodesPB.Claim, utilsPB.StatusMessage>,
      callback: grpc.sendUnaryData<utilsPB.StatusMessage>,
    ): Promise<void> => {
      const response = new utilsPB.StatusMessage();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

        const remoteNodeId = makeNodeId(call.request.getNodeId());
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
    },
    /**
     * Attempts to get the node address of a provided node ID (by contacting
     * keynodes in the wider Polykey network).
     * @throws ErrorNodeGraphNodeNotFound if node address cannot be found
     */
    nodesFind: async (
      call: grpc.ServerUnaryCall<nodesPB.Node, nodesPB.NodeAddress>,
      callback: grpc.sendUnaryData<nodesPB.NodeAddress>,
    ): Promise<void> => {
      const response = new nodesPB.NodeAddress();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

        const nodeId = makeNodeId(call.request.getNodeId());
        const address = await nodeManager.findNode(nodeId);
        response
          .setNodeId(nodeId)
          .setAddress(
            new nodesPB.Address().setHost(address.ip).setPort(address.port),
          );
        callback(null, response);
        return;
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
        return;
      }
    },
  };
};

export default createNodesRPC;
