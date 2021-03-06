import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type Discovery from '../../discovery/Discovery';
import type { NodeId } from '../../nodes/types';
import type * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
import type Logger from '@matrixai/logger';
import { validateSync } from '../../validation';
import { matchSync } from '../../utils';
import * as grpcUtils from '../../grpc/utils';
import * as validationUtils from '../../validation/utils';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import * as clientUtils from '../utils';

function gestaltsDiscoveryByNode({
  authenticate,
  discovery,
  logger,
}: {
  authenticate: Authenticate;
  discovery: Discovery;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerUnaryCall<nodesPB.Node, utilsPB.EmptyMessage>,
    callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
  ): Promise<void> => {
    try {
      const response = new utilsPB.EmptyMessage();
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
      await discovery.queueDiscoveryByNode(nodeId);
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientClientError(e) &&
        logger.error(`${gestaltsDiscoveryByNode.name}:${e}`);
      return;
    }
  };
}

export default gestaltsDiscoveryByNode;
