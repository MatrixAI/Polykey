import type * as grpc from '@grpc/grpc-js';
import type { DB } from '@matrixai/db';
import type NodeManager from '../../nodes/NodeManager';
import type NodeConnectionManager from '../../nodes/NodeConnectionManager';
import type KeyManager from '../../keys/KeyManager';
import type { NodeId } from '../../nodes/types';
import type * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
import type Logger from '@matrixai/logger';
import * as networkUtils from '../../network/utils';
import * as grpcUtils from '../../grpc/utils';
import { validateSync } from '../../validation';
import * as validationUtils from '../../validation/utils';
import { matchSync } from '../../utils';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import * as agentUtils from '../utils';

function nodesHolePunchMessageSend({
  keyManager,
  nodeManager,
  nodeConnectionManager,
  db,
  logger,
}: {
  keyManager: KeyManager;
  nodeManager: NodeManager;
  nodeConnectionManager: NodeConnectionManager;
  db: DB;
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
      // Firstly, check if this node is the desired node
      // If so, then we want to make this node start sending hole punching packets
      // back to the source node.
      await db.withTransactionF(async (tran) => {
        if (keyManager.getNodeId().equals(targetId)) {
          const [host, port] = networkUtils.parseAddress(
            call.request.getProxyAddress(),
          );
          await nodeConnectionManager.holePunchReverse(host, port);
          // Otherwise, find if node in table
          // If so, ask the nodeManager to relay to the node
        } else if (await nodeManager.knowsNode(sourceId, tran)) {
          await nodeConnectionManager.relayHolePunchMessage(call.request);
        }
      });
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e, true));
      !agentUtils.isAgentClientError(e) && logger.error(`${nodesHolePunchMessageSend.name}:${e}`);
      return;
    }
  };
}

export default nodesHolePunchMessageSend;
