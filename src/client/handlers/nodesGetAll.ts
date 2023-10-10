import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type KeyRing from '../../keys/KeyRing';
import type { NodeId } from '../../ids';
import type NodeGraph from '../../nodes/NodeGraph';
import type { NodesGetMessage } from '../handlers/types';
import { IdInternal } from '@matrixai/id';
import { ServerHandler } from '@matrixai/rpc';
import * as nodesUtils from '../../nodes/utils';

class NodesGetAllHandler extends ServerHandler<
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
    const { nodeGraph, keyRing } = this.container;
    for await (const bucket of nodeGraph.getBuckets()) {
      let index;
      for (const id of Object.keys(bucket)) {
        const encodedId = nodesUtils.encodeNodeId(
          IdInternal.fromString<NodeId>(id),
        );
        // For every node in every bucket, add it to our message
        if (!index) {
          index = nodesUtils.bucketIndex(
            keyRing.getNodeId(),
            IdInternal.fromString<NodeId>(id),
          );
        }
        if (ctx.signal.aborted) throw ctx.signal.reason;
        yield {
          bucketIndex: index,
          nodeIdEncoded: encodedId,
          host: bucket[id].address.host,
          port: bucket[id].address.port,
        };
      }
    }
  }
}

export { NodesGetAllHandler };
