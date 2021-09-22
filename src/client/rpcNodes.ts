import type { NodeManager } from '../nodes';
import type { NodeAddress, NodeId } from '../nodes/types';
import type { NotificationData } from '../notifications/types';
import type { SessionManager } from '../sessions';
import type { NotificationsManager } from '../notifications';

import * as grpc from '@grpc/grpc-js';
import * as clientPB from '../proto/js/Client_pb';
import * as utils from '../client/utils';
import * as nodesUtils from '../nodes/utils';
import * as grpcUtils from '../grpc/utils';
import * as nodesErrors from '../nodes/errors';
import { makeNodeId } from '../nodes/utils';

const createNodesRPC = ({
  nodeManager,
  sessionManager,
  notificationsManager,
}: {
  nodeManager: NodeManager;
  sessionManager: SessionManager;
  notificationsManager: NotificationsManager;
}) => {
  return {
    /**
     * Adds a node ID -> node address mapping into the buckets database.
     * This is an unrestricted add: no validity checks are made for the correctness
     * of the passed ID or host/port.
     */
    nodesAdd: async (
      call: grpc.ServerUnaryCall<
        clientPB.NodeAddressMessage,
        clientPB.EmptyMessage
      >,
      callback: grpc.sendUnaryData<clientPB.EmptyMessage>,
    ): Promise<void> => {
      const response = new clientPB.EmptyMessage();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        // Validate the passed node ID and host
        const validNodeId = nodesUtils.isNodeId(call.request.getNodeId());
        if (!validNodeId) {
          throw new nodesErrors.ErrorInvalidNodeId();
        }
        const validHost = nodesUtils.isValidHost(call.request.getHost());
        if (!validHost) {
          throw new nodesErrors.ErrorInvalidHost();
        }
        await nodeManager.setNode(
          makeNodeId(call.request.getNodeId()),
          {
            ip: call.request.getHost(),
            port: call.request.getPort(),
          } as NodeAddress,
        );
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
    /**
     * Checks if a remote node is online.
     */
    nodesPing: async (
      call: grpc.ServerUnaryCall<clientPB.NodeMessage, clientPB.StatusMessage>,
      callback: grpc.sendUnaryData<clientPB.StatusMessage>,
    ): Promise<void> => {
      const response = new clientPB.StatusMessage();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        const status = await nodeManager.pingNode(
          makeNodeId(call.request.getNodeId()),
        );
        response.setSuccess(status);
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
    /**
     * Checks whether there is an existing Gestalt Invitation from the other node.
     * If not, send an invitation, if so, create a cryptolink claim between the
     * other node and host node.
     */
    nodesClaim: async (
      call: grpc.ServerUnaryCall<
        clientPB.NodeClaimMessage,
        clientPB.StatusMessage
      >,
      callback: grpc.sendUnaryData<clientPB.StatusMessage>,
    ): Promise<void> => {
      const response = new clientPB.StatusMessage();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        const remoteNodeId = makeNodeId(call.request.getNodeId());
        const gestaltInvite = await notificationsManager.findGestaltInvite(
          remoteNodeId,
        );

        // check first whether there is an existing gestalt invite from the remote node
        // or if we want to force an invitation rather than a claim
        if (gestaltInvite === undefined || call.request.getForceInvite()) {
          const data = {
            type: 'GestaltInvite',
          } as NotificationData;
          await notificationsManager.sendNotification(remoteNodeId, data);
          response.setSuccess(false);
        } else {
          // there is an existing invitation, and we want to claim the node
          await nodeManager.claimNode(remoteNodeId);
          response.setSuccess(true);
        }
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
    /**
     * Attempts to get the node address of a provided node ID (by contacting
     * keynodes in the wider Polykey network).
     * @throws ErrorNodeGraphNodeNotFound if node address cannot be found
     */
    nodesFind: async (
      call: grpc.ServerUnaryCall<
        clientPB.NodeMessage,
        clientPB.NodeAddressMessage
      >,
      callback: grpc.sendUnaryData<clientPB.NodeAddressMessage>,
    ): Promise<void> => {
      const response = new clientPB.NodeAddressMessage();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        const nodeId = makeNodeId(call.request.getNodeId());
        const address = await nodeManager.findNode(nodeId);
        response.setNodeId(nodeId);
        response.setHost(address.ip);
        response.setPort(address.port);
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
  };
};

export default createNodesRPC;
