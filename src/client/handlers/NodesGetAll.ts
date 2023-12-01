import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  NodesGetMessage,
} from '../types';
import type KeyRing from '../../keys/KeyRing';
import type NodeGraph from '../../nodes/NodeGraph';
import { ServerHandler } from '@matrixai/rpc';
import * as nodesUtils from '../../nodes/utils';

class NodesGetAll extends ServerHandler<
  {
    nodeGraph: NodeGraph;
    keyRing: KeyRing;
  },
  ClientRPCRequestParams,
  ClientRPCResponseResult<NodesGetMessage>
> {
  public async *handle(
    _input,
    _cancel,
    _meta,
    ctx,
  ): AsyncGenerator<ClientRPCResponseResult<NodesGetMessage>> {
    if (ctx.signal.aborted) throw ctx.signal.reason;
    const { nodeGraph } = this.container;
    for await (const [index, bucket] of nodeGraph.getBuckets()) {
      for (const [id, nodeContact] of bucket) {
        const encodedId = nodesUtils.encodeNodeId(id);
        // For every node in every bucket, add it to our message
        if (ctx.signal.aborted) {
          throw ctx.signal.reason;
        }
        yield {
          bucketIndex: index,
          nodeIdEncoded: encodedId,
          nodeContact,
        };
      }
    }
  }
}

export default NodesGetAll;
