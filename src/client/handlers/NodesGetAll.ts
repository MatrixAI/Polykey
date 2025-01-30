import type { ContextTimed } from '@matrixai/contexts';
import type { JSONValue } from '@matrixai/rpc';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  NodesGetMessage,
} from '../types';
import type NodeGraph from '../../nodes/NodeGraph';
import { ServerHandler } from '@matrixai/rpc';
import * as nodesUtils from '../../nodes/utils';

class NodesGetAll extends ServerHandler<
  {
    nodeGraph: NodeGraph;
  },
  ClientRPCRequestParams,
  ClientRPCResponseResult<NodesGetMessage>
> {
  public handle = async function* (
    _input: ClientRPCRequestParams,
    _cancel: (reason?: any) => void,
    _meta: Record<string, JSONValue>,
    ctx: ContextTimed,
  ): AsyncGenerator<ClientRPCResponseResult<NodesGetMessage>> {
    const { nodeGraph } = this.container;
    for await (const [index, bucket] of nodeGraph.getBuckets()) {
      for (const [id, nodeContact] of bucket) {
        const encodedId = nodesUtils.encodeNodeId(id);
        // For every node in every bucket, add it to our message
        ctx.signal.throwIfAborted();
        yield {
          bucketIndex: index,
          nodeIdEncoded: encodedId,
          nodeContact: nodeContact,
        };
      }
    }
  };
}

export default NodesGetAll;
