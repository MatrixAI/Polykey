import type * as grpc from '@grpc/grpc-js';
import type { DB } from '@matrixai/db';
import type { Authenticate } from '../types';
import type NodeManager from '../../nodes/NodeManager';
import type { NodeId, NodeAddress } from '../../nodes/types';
import type { Host, Hostname, Port } from '../../network/types';
import type * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
import type Logger from '@matrixai/logger';
import * as nodeErrors from '../../nodes/errors';
import * as grpcUtils from '../../grpc/utils';
import { validateSync } from '../../validation';
import * as validationUtils from '../../validation/utils';
import { matchSync } from '../../utils';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import * as clientUtils from '../utils';

/**
 * Adds a node ID -> node address mapping into the buckets' database.
 * This is an unrestricted add: no validity checks are made for the correctness
 * of the passed ID or host/port.
 */
function nodesAdd({
  authenticate,
  nodeManager,
  db,
  logger,
}: {
  authenticate: Authenticate;
  nodeManager: NodeManager;
  db: DB;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerUnaryCall<nodesPB.NodeAdd, utilsPB.EmptyMessage>,
    callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
  ): Promise<void> => {
    try {
      const response = new utilsPB.EmptyMessage();
      const metadata = await authenticate(call.metadata);
      const request = call.request;
      call.sendMetadata(metadata);
      const {
        nodeId,
        host,
        port,
      }: {
        nodeId: NodeId;
        host: Host | Hostname;
        port: Port;
      } = validateSync(
        (keyPath, value) => {
          return matchSync(keyPath)(
            [['nodeId'], () => validationUtils.parseNodeId(value)],
            [['host'], () => validationUtils.parseHostOrHostname(value)],
            [['port'], () => validationUtils.parsePort(value)],
            () => value,
          );
        },
        {
          nodeId: request.getNodeId(),
          host: request.getAddress()?.getHost(),
          port: request.getAddress()?.getPort(),
        },
      );
      // Pinging to authenticate the node
      if (
        request.getPing() &&
        !(await nodeManager.pingNode(nodeId, { host, port }))
      ) {
        throw new nodeErrors.ErrorNodePingFailed(
          'Failed to authenticate target node',
        );
      }

      await db.withTransactionF(async (tran) =>
        nodeManager.setNode(
          nodeId,
          {
            host,
            port,
          } as NodeAddress,
          true,
          request.getForce(),
          undefined,
          tran,
        ),
      );
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientClientError(e) && logger.error(`${nodesAdd.name}:${e}`);
      return;
    }
  };
}

export default nodesAdd;
