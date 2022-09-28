import type * as grpc from '@grpc/grpc-js';
import type Logger from '@matrixai/logger';
import type { Authenticate } from '../types';
import type KeyManager from '../../keys/KeyManager';
import type { NodeId } from '../../ids/types';
import type * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import type NodeGraph from '../../nodes/NodeGraph';
import { IdInternal } from '@matrixai/id';
import * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
import * as nodesUtils from '../../nodes/utils';
import * as nodesErrors from '../../nodes/errors';
import * as grpcUtils from '../../grpc/utils';
import * as clientUtils from '../utils';

/**
 * Retrieves all nodes from all buckets in the NodeGraph.
 */
function nodesGetAll({
  authenticate,
  nodeGraph,
  keyManager,
  logger,
}: {
  authenticate: Authenticate;
  nodeGraph: NodeGraph;
  keyManager: KeyManager;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerUnaryCall<utilsPB.EmptyMessage, nodesPB.NodeBuckets>,
    callback: grpc.sendUnaryData<nodesPB.NodeBuckets>,
  ): Promise<void> => {
    try {
      const response = new nodesPB.NodeBuckets();
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const buckets = nodeGraph.getBuckets();
      for await (const b of buckets) {
        let index;
        for (const id of Object.keys(b)) {
          const encodedId = nodesUtils.encodeNodeId(
            IdInternal.fromString<NodeId>(id),
          );
          const address = new nodesPB.Address()
            .setHost(b[id].address.host)
            .setPort(b[id].address.port);
          // For every node in every bucket, add it to our message
          if (!index) {
            index = nodesUtils.bucketIndex(
              keyManager.getNodeId(),
              IdInternal.fromString<NodeId>(id),
            );
          }
          // Need to either add node to an existing bucket, or create a new
          // bucket (if it doesn't exist)
          const bucket = response.getBucketsMap().get(index);
          if (bucket) {
            bucket.getNodeTableMap().set(encodedId, address);
          } else {
            const newBucket = new nodesPB.NodeTable();
            newBucket.getNodeTableMap().set(encodedId, address);
            response.getBucketsMap().set(index, newBucket);
          }
        }
      }
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientClientError(e, [
        nodesErrors.ErrorNodeGraphNodeIdNotFound,
      ]) && logger.error(`${nodesGetAll.name}:${e}`);
      return;
    }
  };
}

export default nodesGetAll;
