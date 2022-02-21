import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { NodeGraph } from '../../nodes';
import type { KeyManager } from '../../keys';
import type { NodeId } from '../../nodes/types';
import type * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import { IdInternal } from '@matrixai/id';
import { utils as nodesUtils } from '../../nodes';
import { utils as grpcUtils } from '../../grpc';
import * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';

/**
 * Retrieves all nodes from all buckets in the NodeGraph.
 */
function nodesGetAll({
  nodeGraph,
  keyManager,
  authenticate,
}: {
  nodeGraph: NodeGraph;
  keyManager: KeyManager;
  authenticate: Authenticate;
}) {
  return async (
    call: grpc.ServerUnaryCall<utilsPB.EmptyMessage, nodesPB.NodeBuckets>,
    callback: grpc.sendUnaryData<nodesPB.NodeBuckets>,
  ): Promise<void> => {
    try {
      const response = new nodesPB.NodeBuckets();
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      // FIXME:
      // const buckets = await nodeGraph.getAllBuckets();
      const buckets: any = [];
      for (const b of buckets) {
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
          // bucket (if doesn't exist)
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
      return;
    }
  };
}

export default nodesGetAll;
