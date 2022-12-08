import type * as grpc from '@grpc/grpc-js';
import type { DB } from '@matrixai/db';
import type NodeManager from '../../nodes/NodeManager';
import type NodeConnectionManager from '../../nodes/NodeConnectionManager';
import type KeyRing from '../../keys/KeyRing';
import type { NodeId } from '../../ids/types';
import type Logger from '@matrixai/logger';
import type { ConnectionInfoGet } from 'agent/types';
import type * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
import * as networkUtils from '../../network/utils';
import * as grpcUtils from '../../grpc/utils';
import { validateSync } from '../../validation';
import * as validationUtils from '../../validation/utils';
import * as nodesUtils from '../../nodes/utils';
import { matchSync } from '../../utils';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import * as agentUtils from '../utils';

function nodesHolePunchMessageSend({
  keyRing,
  nodeManager,
  nodeConnectionManager,
  db,
  connectionInfoGet,
  logger,
}: {
  keyRing: KeyRing;
  nodeManager: NodeManager;
  nodeConnectionManager: NodeConnectionManager;
  db: DB;
  connectionInfoGet: ConnectionInfoGet;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerUnaryCall<nodesPB.Relay, utilsPB.EmptyMessage>,
    callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
  ): Promise<void> => {
    try {
      const response = new utilsPB.EmptyMessage();
      const {
        targetId,
        sourceId,
      }: {
        targetId: NodeId;
        sourceId: NodeId;
      } = validateSync(
        (keyPath, value) => {
          return matchSync(keyPath)(
            [
              ['targetId'],
              ['sourceId'],
              () => validationUtils.parseNodeId(value),
            ],
            () => value,
          );
        },
        {
          targetId: call.request.getTargetId(),
          sourceId: call.request.getSrcId(),
        },
      );
      const connectionInfo = connectionInfoGet(call);
      const srcNodeId = nodesUtils.encodeNodeId(connectionInfo!.remoteNodeId);
      // Firstly, check if this node is the desired node
      // If so, then we want to make this node start sending hole punching packets
      // back to the source node.
      await db.withTransactionF(async (tran) => {
        if (keyRing.getNodeId().equals(targetId)) {
          if (call.request.getProxyAddress() !== '') {
            const [host, port] = networkUtils.parseAddress(
              call.request.getProxyAddress(),
            );
            logger.debug(
              `Received signaling message to target ${call.request.getSrcId()}@${host}:${port}`,
            );
            // Ignore failure
            try {
              await nodeConnectionManager.holePunchReverse(host, port);
            } catch {
              // Do nothing
            }
          } else {
            logger.error(
              'Received signaling message, target information was missing, skipping reverse hole punch',
            );
          }
        } else if (await nodeManager.knowsNode(sourceId, tran)) {
          // Otherwise, find if node in table
          // If so, ask the nodeManager to relay to the node
          const targetNodeId = call.request.getTargetId();
          const proxyAddress = networkUtils.buildAddress(
            connectionInfo!.remoteHost,
            connectionInfo!.remotePort,
          );
          // Checking if the source and destination are the same
          if (sourceId?.equals(targetId)) {
            // Logging and silently dropping operation
            logger.warn('Signaling relay message requested signal to itself');
            callback(null, response);
            return;
          }
          call.request.setProxyAddress(proxyAddress);
          logger.debug(
            `Relaying signaling message from ${srcNodeId}@${
              connectionInfo!.remoteHost
            }:${
              connectionInfo!.remotePort
            } to ${targetNodeId} with information ${proxyAddress}`,
          );
          await nodeConnectionManager.relaySignalingMessage(call.request, {
            host: connectionInfo!.remoteHost,
            port: connectionInfo!.remotePort,
          });
        }
      });
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e, true));
      !agentUtils.isAgentClientError(e) &&
        logger.error(`${nodesHolePunchMessageSend.name}:${e}`);
      return;
    }
  };
}

export default nodesHolePunchMessageSend;
