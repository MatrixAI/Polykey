import type { NodeManager } from '../nodes';
import type { NodeAddress, NodeId } from '../nodes/types';
import type { SessionManager } from '../sessions';

import * as grpc from '@grpc/grpc-js';
import * as clientPB from '../proto/js/Client_pb';
import * as utils from '../client/utils';
import * as nodesUtils from '../nodes/utils';
import * as grpcUtils from '../grpc/utils';
import * as nodesErrors from '../nodes/errors';

const createNodesRPC = ({
  nodeManager,
  sessionManager,
}: {
  nodeManager: NodeManager;
  sessionManager: SessionManager;
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
          call.request.getNodeId() as NodeId,
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
          call.request.getNodeId() as NodeId,
        );
        response.setSuccess(status);
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
    /**
     * Requests a node -> node cryptolink claim to be created between the local
     * node and a remote node.
     */
    nodesClaim: async (
      _call: grpc.ServerUnaryCall<clientPB.NodeMessage, clientPB.StatusMessage>,
      _callback: grpc.sendUnaryData<clientPB.StatusMessage>,
    ): Promise<void> => {
      // change _call to call when implemented, same for callback.
      throw Error('Not implemented, placeholder');
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
        const nodeId = call.request.getNodeId() as NodeId;
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
