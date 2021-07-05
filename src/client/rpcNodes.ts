import type { NodeManager } from '../nodes';
import type { NodeAddress, NodeId } from '../nodes/types';
import type { SessionManager } from '../session';

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
     * Gets the details of the local keynode.
     */
    nodesGetLocalDetails: async (
      call: grpc.ServerUnaryCall<
        clientPB.EmptyMessage,
        clientPB.NodeDetailsMessage
      >,
      callback: grpc.sendUnaryData<clientPB.NodeDetailsMessage>,
    ): Promise<void> => {
      const response = new clientPB.NodeDetailsMessage();
      try {
        await utils.verifyToken(call.metadata, sessionManager);
        const details = nodeManager.getNodeDetails();
        response.setNodeId(details.id);
        response.setPublicKey(details.publicKey);
        response.setNodeAddress(details.address);
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
    /**
     * Gets the details of a remote node.
     */
    nodesGetDetails: async (
      call: grpc.ServerUnaryCall<
        clientPB.NodeMessage,
        clientPB.NodeDetailsMessage
      >,
      callback: grpc.sendUnaryData<clientPB.NodeDetailsMessage>,
    ): Promise<void> => {
      const response = new clientPB.NodeDetailsMessage();
      try {
        await utils.verifyToken(call.metadata, sessionManager);
        const details = await nodeManager.requestNodeDetails(
          call.request.getName() as NodeId,
        );
        response.setNodeId(details.id);
        response.setPublicKey(details.publicKey);
        response.setNodeAddress(details.address);
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
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
        await utils.verifyToken(call.metadata, sessionManager);
        // Validate the passed node ID and host
        const validNodeId = nodesUtils.isNodeId(call.request.getId());
        if (!validNodeId) {
          throw new nodesErrors.ErrorInvalidNodeId();
        }
        const validHost = nodesUtils.isValidHost(call.request.getHost());
        if (!validHost) {
          throw new nodesErrors.ErrorInvalidHost();
        }
        await nodeManager.setNode(
          call.request.getId() as NodeId,
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
        await utils.verifyToken(call.metadata, sessionManager);
        const status = await nodeManager.pingNode(
          call.request.getName() as NodeId,
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
      call: grpc.ServerUnaryCall<clientPB.NodeMessage, clientPB.StatusMessage>,
      callback: grpc.sendUnaryData<clientPB.StatusMessage>,
    ): Promise<void> => {
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
        await utils.verifyToken(call.metadata, sessionManager);
        const nodeId = call.request.getName() as NodeId;
        const address = await nodeManager.findNode(nodeId);
        response.setId(nodeId);
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
